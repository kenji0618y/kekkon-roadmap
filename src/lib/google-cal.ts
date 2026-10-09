/**
 * カレンダータブの「Google（ファミリー）」表示（2026-10-09〜・Kenji「カレンダーはGoogleのファミリーカレンダーを埋め込んでほしい」）。
 * - カレンダーの ID は book.googleCal.id（ふたりで共通・同期では新しく変えた方）。初期値はファミリー カレンダー。秘密ではない（見られるのは共有された Google アカウントだけ）。
 * - 「Google（ファミリー）」/「アプリの予定」の切り替えは端末ごと（localStorage）。相手の画面は変えない。
 * - 埋め込みの URL は Google の「カレンダーの統合 → 埋め込みコード → カスタマイズ」が作るものと同じパラメータだけを使う。
 *   カレンダーのタイムゾーンは UTC なので ctz=Asia/Tokyo を必ず付ける。
 * - アプリのカレンダー（お知らせ・鈴の印・ふたり会議・.ics のもと）は消さない。こちらは表示を足すだけ。
 */
export const FAMILY_CAL_ID='family06139282484236685542@group.calendar.google.com';
export const CAL_ID_MAX=200;
export const GOOGLE_CAL_ORIGIN='https://calendar.google.com';
/** 「Googleカレンダーで開く」。ファミリーの人のカレンダー一覧にはもう入っているので、ふつうの画面を開くだけ（cid などの非公開のパラメータは使わない）。 */
export const GOOGLE_CAL_OPEN_URL='https://calendar.google.com/calendar/r';

/** Google カレンダーの ID（…@group.calendar.google.com・…@gmail.com・ja.japanese#holiday@group.v.calendar.google.com など）。 */
export function validCalId(id:string){
  const v=id.trim();
  return v.length<=CAL_ID_MAX&&/^[A-Za-z0-9._%+#-]{1,150}@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/.test(v);
}

export function googleEmbedUrl(id:string){
  const q=new URLSearchParams({src:id.trim(),ctz:'Asia/Tokyo',mode:'MONTH',showTitle:'0',showPrint:'0',showTabs:'1',showCalendars:'0',hl:'ja'});
  return `${GOOGLE_CAL_ORIGIN}/calendar/embed?${q.toString()}`;
}

export type CalView='google'|'app';
export const CAL_VIEW_KEY='amity-cal-view-v1';
export function readCalView():CalView{
  try{return localStorage.getItem(CAL_VIEW_KEY)==='app'?'app':'google';}catch{return 'google';}
}
export function writeCalView(v:CalView){
  try{localStorage.setItem(CAL_VIEW_KEY,v);}catch{/* 保存できなくても表示は切りかわる */}
}
