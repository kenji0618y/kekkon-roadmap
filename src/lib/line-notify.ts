/**
 * ふたりの掲示板 → LINE 通知（Google Apps Script の中継先を通して、相手の LINE に知らせる）。
 *
 * - 送り方は text/plain;charset=utf-8 の POST だけ（application/json や独自ヘッダーは CORS の事前確認が走り、
 *   Apps Script が答えないので失敗する）。本文は JSON の文字列。
 * - 中継先の URL は手帳（book.lineNotify.url・同期でふたりにそろう）に入れる。コードにも VITE_ にも書かない。
 * - 合言葉（BOARD_SECRET）は手帳にも同期先にも置かない。端末どうしの自動同期のキーから、端末の中で毎回作る:
 *     小文字16進( SHA-256( "kekkon-board-line-v1\n" + キー ) )  … 64文字
 *   sync-crypto.ts の同期鍵（HKDF-SHA256・別の info・保存ごとの salt）とは作り方が別なので、合言葉から同期鍵は戻せない。
 * - ここの関数は例外を投げない。通知はおまけで、失敗してもメモの保存は止めない。
 * - 通知を送るのは「書いた本人の端末が、書いた瞬間」だけ（shouldNotifyBoard）。同期で入ってきたメモでは送らない。
 */
import type {Who} from './futari';

export const LINE_SECRET_PREFIX='kekkon-board-line-v1\n';
export const LINE_NAME_MAX=20;
export const LINE_TEXT_MAX=500;
/** 手で入れた合言葉（この端末だけ・同期しない）。ふたりの端末で同期のキーが違うときだけ使う。 */
export const LINE_SECRET_OVERRIDE_KEY='board-line-secret-v1';
export const LINE_SECRET_MIN=20;

/** 中継先として受けるのは Google Apps Script のウェブアプリ（/exec で終わる）だけ。合言葉をほかへ送らないため。 */
const RELAY_RE=/^https:\/\/script\.google\.com\/(?:a\/macros\/[A-Za-z0-9.-]+\/|macros\/)s\/[A-Za-z0-9_-]{10,200}\/exec$/;
export function isRelayUrl(u:string|undefined|null){return RELAY_RE.test((u||'').trim());}
export function cleanRelayUrl(u:string|undefined|null){const t=(u||'').trim();return isRelayUrl(t)?t:'';}

/** 文字数（絵文字なども1文字）で切る。 */
export function clipChars(s:string,max:number){return Array.from(s||'').slice(0,max).join('');}

/** 合言葉を作る（WebCrypto の SHA-256・小文字16進64文字）。キーが無い／作れないときは ''。 */
export async function deriveBoardSecret(syncKey:string):Promise<string>{
  try{
    const k=(syncKey||'').trim();
    if(!k||typeof crypto==='undefined'||!crypto.subtle)return '';
    const h=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(LINE_SECRET_PREFIX+k));
    return Array.from(new Uint8Array(h),b=>b.toString(16).padStart(2,'0')).join('');
  }catch{return '';}
}

export function readSecretOverride(){try{return (localStorage.getItem(LINE_SECRET_OVERRIDE_KEY)||'').trim();}catch{return '';}}
export function writeSecretOverride(v:string){
  try{const t=(v||'').trim();if(t)localStorage.setItem(LINE_SECRET_OVERRIDE_KEY,t);else localStorage.removeItem(LINE_SECRET_OVERRIDE_KEY);}catch{/* この端末に保存できないときは何もしない */}
}

/**
 * この端末で使う合言葉。自動同期がオフの端末では作らない（画面は「準備中」）。
 * 手で入れた合言葉があればそれを、なければ同期のキーから作る。
 */
export async function resolveBoardSecret(sync:{enabled:boolean,token:string}):Promise<string>{
  if(!sync.enabled)return '';
  const o=readSecretOverride();
  if(o.length>=LINE_SECRET_MIN)return o;
  return deriveBoardSecret(sync.token);
}

export const personNo=(who:Who):1|2=>who==='n1'?1:2;

export type BoardPayload={kind:'board',secret:string,from:1|2,name:string,text:string};
export function boardPayload(secret:string,who:Who,name:string,text:string):BoardPayload{
  return {kind:'board',secret,from:personNo(who),name:clipChars(name.trim(),LINE_NAME_MAX),text:clipChars(text.trim(),LINE_TEXT_MAX)};
}
export function statusPayload(secret:string){return {kind:'status' as const,secret};}

export type RelayResult={
  ok:boolean,
  status?:'sent'|'queued'|'capped',
  batched?:number,
  error?:string,
  registered?:{[k:string]:boolean},
  month?:{count:number,cap:number,capped:boolean},
  token?:boolean,
};
export type FetchLike=(url:string,init:RequestInit)=>Promise<Response>;

/** 中継先へ POST する。どんな失敗でも例外を投げず {ok:false,error} を返す。 */
export async function postRelay(url:string,payload:object,opts:{fetchImpl?:FetchLike,timeoutMs?:number}={}):Promise<RelayResult>{
  if(!isRelayUrl(url))return {ok:false,error:'bad-url'};
  let timer:ReturnType<typeof setTimeout>|undefined;
  try{
    const f:FetchLike=opts.fetchImpl||((u,i)=>fetch(u,i));
    const ctrl=typeof AbortController!=='undefined'?new AbortController():null;
    timer=setTimeout(()=>ctrl?.abort(),opts.timeoutMs??15000);
    const res=await f(url.trim(),{
      method:'POST',
      headers:{'Content-Type':'text/plain;charset=utf-8'},
      body:JSON.stringify(payload),
      redirect:'follow',
      credentials:'omit',
      cache:'no-store',
      signal:ctrl?.signal,
    });
    if(!res.ok)return {ok:false,error:'network'};
    const j=await res.json().catch(()=>null) as RelayResult|null;
    return j&&typeof j==='object'&&typeof j.ok==='boolean'?j:{ok:false,error:'network'};
  }catch{
    return {ok:false,error:'network'};
  }finally{
    if(timer)clearTimeout(timer);
  }
}

/**
 * 通知を送ってよいか。送るのは、この端末で「書く」を押して保存できた新しいメモで、書いた人がこの端末の人のときだけ。
 * 同期で入ってきたメモ・直したメモ・ピン留めでは送らない（送ると相手に2通届く）。
 */
export type BoardNoteOrigin='compose'|'edit'|'pin'|'sync';
export function shouldNotifyBoard(origin:BoardNoteOrigin,note:{who:Who,editedAt?:string},me:Who|''):boolean{
  return origin==='compose'&&!!me&&note.who===me&&!note.editedAt;
}

/** 掲示板に書いたあとの一行（「LINE通知：オン — 」のあとに続ける文）。 */
export function boardResultText(r:RelayResult,partnerName:string):{text:string,warn:boolean}{
  if(r.ok&&r.status==='sent')return {text:`${partnerName}さんのLINEにお知らせしました`,warn:false};
  if(r.ok&&r.status==='queued')return {text:'1分後にまとめてお知らせします',warn:false};
  if(r.ok&&r.status==='capped')return {text:'今月の上限（180通）に達したので止めています。来月1日に再開します',warn:true};
  if(r.error==='partner-not-registered')return {text:'相手のLINEがまだ登録されていません',warn:true};
  if(r.error==='bad-secret'||r.error==='no-secret')return {text:'合言葉が合っていません',warn:true};
  return {text:'お知らせを送れませんでした',warn:true};
}

/** 「つながるか試す」の結果の文。 */
export function statusResultText(r:RelayResult,names:{n1:string,n2:string}):{text:string,warn:boolean}{
  if(r.ok&&r.registered){
    const reg=(n:1|2)=>!!r.registered![String(n)];
    const row=(n:1|2)=>`${n}（${n===1?names.n1:names.n2}）：${reg(n)?'登録ずみ':'まだです'}`;
    const parts=[`つながりました。LINEの登録 ${row(1)} / ${row(2)}`];
    if(r.month)parts.push(`今月のお知らせ：${r.month.count} / ${r.month.cap}通${r.month.capped?'（上限に達したので止めています。来月1日に再開します）':''}`);
    if(r.token===false)parts.push('スクリプトにLINEのチャネルアクセストークンがまだ入っていません');
    return {text:parts.join('。')+'。',warn:!(reg(1)&&reg(2))||r.token===false||!!r.month?.capped};
  }
  if(r.error==='bad-secret'||r.error==='no-secret')return {text:'つながりましたが、合言葉が合っていません。「合言葉をコピー」を押して、スクリプトの BOARD_SECRET に貼り直してください。',warn:true};
  if(r.error==='bad-url')return {text:'中継先のURLを先に入れてください（/exec で終わるURLです）。',warn:true};
  if(r.error==='network')return {text:'中継先につながりませんでした。URLが /exec で終わっているか、電波があるかを確かめてください。',warn:true};
  return {text:'つながりましたが、うまく答えが返りませんでした。少し待ってからもう一度試してください。',warn:true};
}

/** 同期で合わせるとき、LINE 通知の設定は新しく変えた方を残す。 */
export function newerLineNotify<T extends {updatedAt:string}>(a:T|undefined,b:T|undefined,empty:T):T{
  const l=a||empty,r=b||empty;
  return (l.updatedAt||'')>(r.updatedAt||'')?l:r;
}
export function sameLineNotify(a:{url:string,on:boolean,updatedAt:string}|undefined,b:{url:string,on:boolean,updatedAt:string}|undefined){
  return (a?.url||'')===(b?.url||'')&&!!a?.on===!!b?.on&&(a?.updatedAt||'')===(b?.updatedAt||'');
}
