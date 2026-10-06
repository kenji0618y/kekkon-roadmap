/**
 * 合言葉解錠後に手帳が開いたとき、相手の LINE に知らせる（掲示板と同じ中継・kind:"board"）。
 *
 * - 「開いた」= 解錠後のアプリが ready になったとき（合言葉入力・保存済み鍵の再訪問の両方）。
 * - 送るのはこの端末の「この端末はどちら？」（readMe）があるときだけ。相手の LINE へは既存の from=1|2 で届く。
 * - 端末ごと COOLDOWN（既定6時間）に1回。リロード連打で溢れない。例外を投げない。
 */
import {clipChars,LINE_NAME_MAX,LINE_TEXT_MAX} from './line-notify';

export const LOGIN_COOLDOWN_MS=6*60*60*1000;
export const LOGIN_SENT_KEY='login-line-sent-v1';

/** LINE に送る本文（500文字まで）。 */
export function loginOpenedText(name:string){
  const n=clipChars((name||'').trim()||'だれか',LINE_NAME_MAX);
  const text=`${n}さんが手帳を開きました`;
  return clipChars(text,LINE_TEXT_MAX);
}

type Store={getItem:(k:string)=>string|null,setItem:(k:string,v:string)=>void};
export type LoginNotifierDeps={
  send:()=>Promise<void>|void,
  /** 送ってよいか（LINE オン・me ありなど）。送る直前にもう一度見る。 */
  canSend:()=>boolean,
  now?:()=>number,
  storage?:Store|null,
  cooldownMs?:number,
};

export function createLoginNotifier(d:LoginNotifierDeps){
  const now=d.now||(()=>Date.now());
  const cool=d.cooldownMs??LOGIN_COOLDOWN_MS;
  const store=d.storage===undefined?(typeof localStorage!=='undefined'?localStorage:null):d.storage;
  const readAt=()=>{try{const n=Number(store?.getItem(LOGIN_SENT_KEY)||'');return Number.isFinite(n)?n:0;}catch{return 0;}};
  const mark=()=>{try{store?.setItem(LOGIN_SENT_KEY,String(now()));}catch{/* ignore */}};
  const recently=()=>{const t=readAt();return t>0&&now()-t<cool;};
  return {
    /** アプリが ready のときに呼ぶ。cooldown 中・送れないときは何もしない（送れないときは後から再試行可）。 */
    opened(){
      try{
        if(recently())return;
        if(!d.canSend())return;
        mark();
        void Promise.resolve(d.send()).catch(()=>{});
      }catch{/* 通知はおまけ */}
    },
    recentlySent:recently,
  };
}
export type LoginNotifier=ReturnType<typeof createLoginNotifier>;
