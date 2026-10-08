import {emptyLater,type Later,type LaterItem} from './model';
import {pruneDeleted} from './board';

/**
 * 「あとで見る」の印（book.later）。掲示板と同じ合わせ方：
 * 同じ id は新しい方、外した印は deleted（id→外した時刻）より古ければ生き返らせない。
 */
export function mergeLater(local:Later|undefined,remote:Later|undefined):Later{
  const l=local||emptyLater,r=remote||emptyLater;
  const deleted:Record<string,string>={...l.deleted};
  for(const [id,at] of Object.entries(r.deleted))if(!deleted[id]||at>deleted[id])deleted[id]=at;
  const byId=new Map<string,LaterItem>();
  for(const it of [...l.items,...r.items]){
    const prev=byId.get(it.id);
    if(!prev||it.at>prev.at)byId.set(it.id,it);
  }
  const items=[...byId.values()].filter(it=>!deleted[it.id]||it.at>deleted[it.id]);
  return {items:sortLater(items).slice(0,300),deleted:pruneDeleted(deleted)};
}
export function sortLater(items:LaterItem[]){return [...items].sort((a,b)=>b.at.localeCompare(a.at)||a.id.localeCompare(b.id));}
export function sameLater(a:Later|undefined,b:Later|undefined){
  const n=(x:Later|undefined)=>{const v=x||emptyLater;return JSON.stringify({i:sortLater(v.items),d:Object.entries(v.deleted).sort()});};
  return n(a)===n(b);
}
export function hasLater(later:Later|undefined,id:string){return !!later?.items.some(it=>it.id===id);}
/** 印を付ける／外す。外すときは時刻を deleted に残す（もう一方の端末でも外れる）。 */
export function toggleLater(later:Later|undefined,item:Omit<LaterItem,'at'>,now=new Date().toISOString()):Later{
  const cur=later||emptyLater;
  if(hasLater(cur,item.id)){
    return {items:cur.items.filter(it=>it.id!==item.id),deleted:pruneDeleted({...cur.deleted,[item.id]:now})};
  }
  const at=cur.deleted[item.id]&&cur.deleted[item.id]>=now?new Date(new Date(cur.deleted[item.id]).getTime()+1).toISOString():now;
  return {items:sortLater([{...item,at},...cur.items]).slice(0,300),deleted:cur.deleted};
}
export const laterTaskId=(taskId:string)=>`task:${taskId}`;
export const laterFaqId=(taskId:string,q:string)=>`faq:${taskId}:${Array.from(q).slice(0,120).join('')}`;
export const laterLessonId=(lessonId:string)=>`lesson:${lessonId}`;
