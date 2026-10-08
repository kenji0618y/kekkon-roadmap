/* 掲示板の LINE 通知（src/lib/line-notify.ts）の node テスト。scripts/test-line-notify.mjs が esbuild でまとめて実行。本物の中継先にはつながない。 */
import {createHash} from 'node:crypto';
import * as L from '../../src/lib/line-notify';
import {mergeBooks} from '../../src/lib/book-merge';
import {emptyBook,type Book} from '../../src/lib/model';

let pass=0,fail=0;
const ok=(name:string,cond:unknown)=>{if(cond){pass++;console.log('OK  ',name);}else{fail++;console.error('FAIL',name);}};
const store=new Map<string,string>();
(globalThis as any).localStorage={getItem:(k:string)=>store.has(k)?store.get(k)!:null,setItem:(k:string,v:string)=>{store.set(k,String(v));},removeItem:(k:string)=>{store.delete(k);}};
// 本物の fetch が呼ばれたら数える（このテストでは0回のはず）
let realFetchCalls=0;
(globalThis as any).fetch=async()=>{realFetchCalls++;throw new Error('real fetch must not be called in tests');};

// テスト専用の偽キー・偽 URL（本物ではない）
const KEY='ghp_TESTONLY_'+'a'.repeat(30);
const URL_OK='https://script.google.com/macros/s/AKfycbTESTONLY_abcdefghijklmnopqrstuvwxyz0123/exec';
type Call={url:string,init:RequestInit};
const mock=(reply:unknown,calls:Call[]=[])=>{
  const f=async(url:string,init:RequestInit)=>{calls.push({url,init});if(reply instanceof Error)throw reply;return new Response(typeof reply==='string'?reply:JSON.stringify(reply),{status:200});};
  return {f,calls};
};

async function main(){
  // --- 合言葉 ---
  const s=await L.deriveBoardSecret(KEY);
  const expect=createHash('sha256').update('kekkon-board-line-v1\n'+KEY,'utf8').digest('hex');
  ok('secret = lowercase hex SHA-256("kekkon-board-line-v1\\n" + key)',s===expect);
  ok('secret is 64 lowercase hex chars',/^[0-9a-f]{64}$/.test(s));
  ok('same key on two devices → same secret',(await L.deriveBoardSecret(KEY))===s);
  ok('different key → different secret',(await L.deriveBoardSecret(KEY+'b'))!==s);
  ok('secret does not contain the key',!s.includes('TESTONLY'));
  ok('no key → no secret',(await L.deriveBoardSecret(''))==='');
  ok('auto-sync off → no secret (準備中)',(await L.resolveBoardSecret({enabled:false,token:KEY}))==='');
  ok('auto-sync on → derived secret',(await L.resolveBoardSecret({enabled:true,token:KEY}))===s);
  L.writeSecretOverride('M'.repeat(25));
  ok('manual secret (this device only) wins when sync on',(await L.resolveBoardSecret({enabled:true,token:KEY}))==='M'.repeat(25));
  L.writeSecretOverride('');
  ok('manual secret cleared',!store.has(L.LINE_SECRET_OVERRIDE_KEY));

  // --- URL ---
  ok('accepts Apps Script /exec URL',L.isRelayUrl(URL_OK)&&L.isRelayUrl(' '+URL_OK+' '));
  for(const bad of ['',URL_OK.replace('/exec','/dev'),URL_OK.replace('https:','http:'),URL_OK+'?x=1','https://evil.example/macros/s/AKfycbTESTONLY_abcdefghij/exec','https://script.google.com.evil.example/macros/s/AKfycbTESTONLY_abcdefghij/exec'])
    ok(`rejects ${bad||'(empty)'}`,!L.isRelayUrl(bad));

  // --- 送り方 ---
  const m=mock({ok:true,status:'sent',batched:1});
  const r=await L.postRelay(URL_OK,L.boardPayload(s,'n2','二人目','土曜の午前10時'),{fetchImpl:m.f});
  ok('board: result passed through',r.ok&&r.status==='sent');
  const {init}=m.calls[0];
  ok('board: POST text/plain;charset=utf-8 and no other header',init.method==='POST'&&JSON.stringify(init.headers)===JSON.stringify({'Content-Type':'text/plain;charset=utf-8'}));
  ok('board: body is JSON string with kind/secret/from/name/text',JSON.stringify(JSON.parse(String(init.body)))===JSON.stringify({kind:'board',secret:s,from:2,name:'二人目',text:'土曜の午前10時'}));
  const big=L.boardPayload(s,'n1','あ'.repeat(30),'い'.repeat(600));
  ok('board: from n1 → 1, name 20 chars, text 500 chars',big.from===1&&Array.from(big.name).length===20&&Array.from(big.text).length===500);
  const m2=mock({ok:true,registered:{1:true,2:false},month:{count:3,cap:180,capped:false},token:true});
  await L.postRelay(URL_OK,L.statusPayload(s),{fetchImpl:m2.f});
  ok('status: body {kind:"status",secret}',JSON.stringify(JSON.parse(String(m2.calls[0].init.body)))===JSON.stringify({kind:'status',secret:s}));

  // --- 失敗しても例外を投げない ---
  ok('fetch throws → {ok:false,error:network}',(await L.postRelay(URL_OK,{},{fetchImpl:mock(new TypeError('Failed to fetch')).f})).error==='network');
  ok('broken reply → {ok:false}',(await L.postRelay(URL_OK,{},{fetchImpl:mock('<html>').f})).ok===false);
  const m3=mock({ok:true});
  ok('non-Apps-Script URL → nothing sent',(await L.postRelay('https://evil.example/exec',{secret:s},{fetchImpl:m3.f})).error==='bad-url'&&m3.calls.length===0);

  // --- 二重に送らない ---
  const note={who:'n1' as const,editedAt:''};
  ok('send: written on this device by me',L.shouldNotifyBoard('compose',note,'n1'));
  ok('no send: memo arrived via sync',!L.shouldNotifyBoard('sync',note,'n1'));
  ok('no send: partner memo arrived via sync',!L.shouldNotifyBoard('sync',{who:'n2',editedAt:''},'n1'));
  ok('no send: edit / pin',!L.shouldNotifyBoard('edit',{who:'n1',editedAt:'2026-10-02T00:00:00Z'},'n1')&&!L.shouldNotifyBoard('pin',note,'n1'));
  ok('no send: device has no "who"',!L.shouldNotifyBoard('compose',note,''));
  const local:Book=structuredClone(emptyBook),remote:Book=structuredClone(emptyBook);
  remote.board.notes=[{id:'b9',who:'n2',text:'相手のメモ',pinned:false,at:'2026-10-02T00:00:00.000Z',updatedAt:'2026-10-02T00:00:00.000Z',editedAt:''}];
  remote.lineNotify={url:URL_OK,on:true,updatedAt:'2026-10-02T00:00:00.000Z'};
  const merged=mergeBooks(local,remote);
  ok('sync merge brings memo + LINE settings, sends nothing',merged.board.notes.some(n=>n.id==='b9')&&merged.lineNotify.on&&merged.lineNotify.url===URL_OK&&realFetchCalls===0);
  ok('synced book has no secret',!JSON.stringify(merged).includes(s));

  // --- 画面の文 ---
  const t=(x:L.RelayResult)=>L.boardResultText(x,'二人目').text;
  ok('sent',t({ok:true,status:'sent',batched:1})==='二人目さんのLINEにお知らせしました');
  ok('queued',t({ok:true,status:'queued'})==='1分後にまとめてお知らせします');
  ok('capped',t({ok:true,status:'capped'})==='今月の上限に達したので止めています。来月1日に再開します');
  ok('partner-not-registered',t({ok:false,error:'partner-not-registered'})==='相手のLINEがまだ登録されていません');
  ok('bad-secret / no-secret',t({ok:false,error:'bad-secret'})==='合言葉が合っていません'&&t({ok:false,error:'no-secret'})==='合言葉が合っていません');
  ok('empty / bad-from / busy / server / network',['empty','bad-from','busy','server','network'].every(e=>t({ok:false,error:e})==='お知らせを送れませんでした'));
  const st=L.statusResultText({ok:true,registered:{1:true,2:true},month:{count:3,cap:180,capped:false},token:true},{n1:'一人目',n2:'二人目'});
  ok('status sentence',st.text.startsWith('つながりました。LINEの登録 1（一人目）：登録ずみ / 2（二人目）：登録ずみ')&&!st.warn);

  // --- 準備中の理由 ---
  ok('missing: auto-sync off → sync-off',L.lineMissing({syncEnabled:false,hasSecret:false,url:URL_OK})==='sync-off');
  ok('missing: auto-sync on but no key → no-key (not "sync off")',L.lineMissing({syncEnabled:true,hasSecret:false,url:URL_OK})==='no-key');
  ok('missing: ready but no URL → url',L.lineMissing({syncEnabled:true,hasSecret:true,url:''})==='url');
  ok('missing: ready → ""',L.lineMissing({syncEnabled:true,hasSecret:true,url:URL_OK})==='');
  ok('auto-sync on + empty key → no secret',(await L.resolveBoardSecret({enabled:true,token:''}))==='');
  ok('prep text: no-key says the key is missing, not that sync is off',L.linePrepText('no-key').state.includes('キー（GitHub）がまだ入っていません')&&!L.linePrepText('no-key').state.includes('オフ')&&L.linePrepText('sync-off').state.includes('自動同期がオフ'));
  ok('prep text: board lines',L.linePrepText('no-key').board==='自動同期のキー（GitHub）がまだ入っていないので、LINEには送っていません'&&L.linePrepText('sync-off').board==='この端末は自動同期がオフなので、LINEには送っていません');
  ok('real fetch never called',realFetchCalls===0);
  console.log(`\nline-notify: ${pass} passed, ${fail} failed`);
  process.exitCode=fail?1:0;
}
main().catch(e=>{console.error(e);process.exitCode=1;});
