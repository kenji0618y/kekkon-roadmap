/**
 * 合言葉解錠後に手帳が開いたとき、相手の LINE に知らせる（掲示板と同じ中継・kind:"board"）。
 *
 * - 「開いた」= 解錠後のアプリが ready になったとき（合言葉入力・保存済み鍵の再訪問の両方）。
 * - 送るのはこの端末の「この端末はどちら？」（readMe）があるときだけ。相手の LINE へは既存の from=1|2 で届く。
 * - 端末ごと COOLDOWN（既定22時間＝1日1回）に1回。リロード連打で溢れない。例外を投げない。
 *   この通知だけは中継先の60秒のまとめに入らない（間隔が長いので必ず1通使う）。中継先の月180通を
 *   掲示板とスタンプに残すため、ここは1日1回までにしている（2台で月60通まで）。
 */
export const LOGIN_COOLDOWN_MS=22*60*60*1000;
export const LOGIN_SENT_KEY='login-line-sent-v1';

/**
 * LINE に送る本文。名前は中継先が「名前：」として前に付けるので、ここには入れない
 * （入れると名前が二重に出る）。
 */
export function loginOpenedText(){return '手帳を開きました';}

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
