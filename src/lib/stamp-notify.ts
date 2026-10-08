/**
 * ロードマップのスタンプを「済」にしたとき、相手の LINE に知らせる（掲示板と同じ中継先・kind:"board" で送る）。
 *
 * 決まり（docs/LINE_NOTIFY.md・DECISIONS.md）:
 * - 送るのは、この端末で人が押して「済」になった瞬間だけ（済でない → 済）。
 *   取り消し・同期で入ってきたスタンプ・バックアップの読み込み・最初の読み込みでは送らない（ここを呼ばない）。
 * - すぐには送らず HOLD_MS（5秒）待つ。そのあいだに取り消したら送らない。押し直したら待ち直す。
 *   送る直前に、まだ「済」のままかを確かめる。
 * - 同じ項目は COOLDOWN_MS（30分）に1回まで（済→取り消し→済を繰り返しても1通）。端末ごと（localStorage）。
 * - スタンプの保存や絵の動きは待たせない（タイマーで後から送るだけ・例外を投げない）。
 */
import {LINE_TEXT_MAX} from './line-notify';

export const STAMP_HOLD_MS=5000;
export const STAMP_COOLDOWN_MS=30*60*1000;
export const STAMP_SENT_KEY='stamp-line-sent-v1';

/** 済でなかったものが済になったときだけ true。 */
export function becameDone(prev:string|undefined,next:string|undefined){return prev!=='done'&&next==='done';}

/**
 * LINE に送る本文（500文字まで）。名前は中継先が「名前：」として前に付けるので、ここには入れない
 * （入れると名前が二重に出る）。項目名に使える字数もその分増える。
 */
export function stampDoneText(title:string){
  const head='『',tail='』を済にしました';
  const room=LINE_TEXT_MAX-Array.from(head+tail).length;
  const t=Array.from((title||'').trim());
  const shown=t.length>room?t.slice(0,room-1).join('')+'…':t.join('');
  return head+shown+tail;
}

type Store={getItem:(k:string)=>string|null,setItem:(k:string,v:string)=>void};
export type StampNotifierDeps={
  /** 送る（失敗しても例外を投げない前提。投げても握りつぶす）。 */
  send:(taskId:string)=>Promise<void>|void,
  /** 送る直前に、まだ済かどうか。 */
  isStillDone:(taskId:string)=>boolean,
  now?:()=>number,
  setTimer?:(fn:()=>void,ms:number)=>unknown,
  clearTimer?:(h:unknown)=>void,
  storage?:Store|null,
  holdMs?:number,
  cooldownMs?:number,
};

export function createStampNotifier(d:StampNotifierDeps){
  const now=d.now||(()=>Date.now());
  const setT=d.setTimer||((fn,ms)=>setTimeout(fn,ms));
  const clearT=d.clearTimer||((h)=>clearTimeout(h as ReturnType<typeof setTimeout>));
  const hold=d.holdMs??STAMP_HOLD_MS,cool=d.cooldownMs??STAMP_COOLDOWN_MS;
  const store=d.storage===undefined?(typeof localStorage!=='undefined'?localStorage:null):d.storage;
  const timers=new Map<string,unknown>();
  const readSent=():Record<string,number>=>{try{const v=JSON.parse(store?.getItem(STAMP_SENT_KEY)||'{}');return v&&typeof v==='object'?v:{};}catch{return {};}};
  const markSent=(id:string)=>{try{const t=now();const m=readSent();m[id]=t;for(const k of Object.keys(m))if(t-m[k]>cool)delete m[k];store?.setItem(STAMP_SENT_KEY,JSON.stringify(m));}catch{/* 保存できなくても続ける */}};
  const recentlySent=(id:string)=>{const t=readSent()[id];return typeof t==='number'&&now()-t<cool;};
  const cancel=(id:string)=>{const h=timers.get(id);if(h!==undefined){clearT(h);timers.delete(id);}};
  return {
    /** この端末で押して「済」にした直後に呼ぶ。 */
    stamped(id:string){
      try{
        cancel(id);
        if(recentlySent(id))return;
        timers.set(id,setT(()=>{
          timers.delete(id);
          try{
            if(!d.isStillDone(id)||recentlySent(id))return;
            markSent(id);
            void Promise.resolve(d.send(id)).catch(()=>{});
          }catch{/* 通知はおまけ */}
        },hold));
      }catch{/* 通知はおまけ */}
    },
    /** この端末で「済」を取り消したときに呼ぶ（待っている通知をやめる）。 */
    unstamped(id:string){try{cancel(id);}catch{/* ignore */}},
    pending(){return [...timers.keys()];},
    dispose(){for(const id of [...timers.keys()])cancel(id);},
  };
}
export type StampNotifier=ReturnType<typeof createStampNotifier>;
