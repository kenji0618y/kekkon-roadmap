import type {ReminderSync} from './line-notify';

/** この端末から中継先へ最後に渡したお知らせの一覧（同じ内容は1日1回まで・オフにしたら1回だけ「消して」を送る）。合言葉は入れない。 */
const KEY='amity-remind-sync-v1';
export type RemindSyncMemo={key:string,on:boolean,result:ReminderSync};
export function readRemindSync():RemindSyncMemo{
  try{
    const v=JSON.parse(localStorage.getItem(KEY)||'null');
    if(v&&typeof v.key==='string'&&typeof v.on==='boolean'&&v.result&&typeof v.result.text==='string')return v as RemindSyncMemo;
  }catch{/* 壊れていたら空から */}
  return {key:'',on:false,result:{state:'idle',text:''}};
}
export function writeRemindSync(m:RemindSyncMemo){try{localStorage.setItem(KEY,JSON.stringify(m));}catch{/* 保存できなくても送るのは止めない */}}
/** LINE の本文に付けるアプリの URL（画面の見え方用。中継先は自分の設定の URL を付ける）。 */
export function appUrl(){try{return new URL(import.meta.env.BASE_URL||'/',location.origin).href;}catch{return '';}}
