import {emptyBoard,type Board,type BoardNote} from './model';

/**
 * デスクの「ふたりの掲示板」。
 * 手帳（book.board）に入るので、保存・同期は他の項目と同じ仕組み（端末に保存 → 自動同期がオンなら相手の端末へ）。
 * 2台で同時に書いても消えないよう、同期のときはメモごとに合わせる（新しい方を残す・消したメモは生き返らせない）。
 */
const TOMBSTONE_MAX=300;

function stamp(n:BoardNote){return n.updatedAt||n.at||'';}

export function mergeBoard(local:Board|undefined,remote:Board|undefined):Board{
  const l=local||emptyBoard,r=remote||emptyBoard;
  const deleted:Record<string,string>={...l.deleted};
  for(const [id,at] of Object.entries(r.deleted))if(!deleted[id]||at>deleted[id])deleted[id]=at;
  const byId=new Map<string,BoardNote>();
  for(const n of [...l.notes,...r.notes]){
    const prev=byId.get(n.id);
    if(!prev||stamp(n)>stamp(prev))byId.set(n.id,n);
  }
  const notes=[...byId.values()].filter(n=>!deleted[n.id]||stamp(n)>deleted[n.id]);
  return {notes:sortBoard(notes).slice(0,300),deleted:pruneDeleted(deleted)};
}

export function pruneDeleted(d:Record<string,string>){
  const entries=Object.entries(d).sort((a,b)=>b[1].localeCompare(a[1])).slice(0,TOMBSTONE_MAX);
  return Object.fromEntries(entries);
}

/** ピンどめが先、あとは書いた順（新しいものが上）。 */
export function sortBoard(notes:BoardNote[]){
  return [...notes].sort((a,b)=>(a.pinned===b.pinned?0:a.pinned?-1:1)||b.at.localeCompare(a.at)||a.id.localeCompare(b.id));
}

function stable(v:unknown):string{
  if(v===null||typeof v!=='object')return JSON.stringify(v);
  if(Array.isArray(v))return `[${v.map(stable).join(',')}]`;
  return `{${Object.keys(v as object).sort().map(k=>`${JSON.stringify(k)}:${stable((v as Record<string,unknown>)[k])}`).join(',')}}`;
}
export function sameBoard(a:Board|undefined,b:Board|undefined){
  const norm=(x:Board|undefined)=>{const v=x||emptyBoard;return {notes:sortBoard(v.notes),deleted:v.deleted};};
  return stable(norm(a))===stable(norm(b));
}

export function newNoteId(){
  const rand=Math.random().toString(36).slice(2,8);
  return `m${Date.now().toString(36)}${rand}`;
}

const dayFmt=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'});
const timeFmt=new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',hour:'2-digit',minute:'2-digit',hour12:false});
/** 日本時間で「今日 21:47」「昨日 8:05」「9/28 21:47」「2025/12/31 9:00」。 */
export function boardTime(iso:string,now=new Date()):string{
  const d=new Date(iso);
  if(!iso||Number.isNaN(d.getTime()))return '';
  const day=dayFmt.format(d),today=dayFmt.format(now),yest=dayFmt.format(new Date(now.getTime()-86400000));
  const t=timeFmt.format(d).replace(/^0/,'');
  if(day===today)return `今日 ${t}`;
  if(day===yest)return `昨日 ${t}`;
  const [y,m,dd]=day.split('-');
  return `${day.slice(0,4)===today.slice(0,4)?'':`${y}/`}${Number(m)}/${Number(dd)} ${t}`;
}
