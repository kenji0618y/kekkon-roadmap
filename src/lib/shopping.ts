import data from '../data/newlife-checklist.json';
import {emptyShopEntry,emptyShopping,SHOP_OWNERS,SHOP_STATUSES,type ShopCustom,type ShopEntry,type Shopping} from './model';
import {pruneDeleted} from './board';

export type ShopItem={id:string,name:string,custom:boolean};
export type ShopRoom={id:string,label:string,items:ShopItem[]};
export type ShopCategory={id:string,label:string,rooms:ShopRoom[]};
export const shopSource=data.source;
const base=data.categories as {id:string,label:string,rooms:{id:string,label:string,items:{id:string,name:string}[]}[]}[];

/** 記事の品目＋自分で足した品目を、分類・部屋ごとに。 */
export function shopCategories(shopping:Shopping|undefined):ShopCategory[]{
  const custom=shopping?.custom||[];
  return base.map(c=>({id:c.id,label:c.label,rooms:c.rooms.map(r=>({id:r.id,label:r.label,items:[
    ...r.items.map(i=>({id:i.id,name:i.name,custom:false})),
    ...custom.filter(x=>x.cat===c.id&&x.room===r.id).sort((a,b)=>a.updatedAt.localeCompare(b.updatedAt)||a.id.localeCompare(b.id)).map(x=>({id:x.id,name:x.name,custom:true})),
  ]}))}));
}
export function shopEntry(shopping:Shopping|undefined,id:string):ShopEntry{return shopping?.entries[id]||emptyShopEntry;}
/** そろった＝買った・持っている。いらない は数に入れない。 */
export function roomProgress(shopping:Shopping|undefined,room:ShopRoom){
  let total=0,ready=0;
  for(const it of room.items){const s=shopEntry(shopping,it.id).status;if(s==='skip')continue;total++;if(s==='got'||s==='have')ready++;}
  return {total,ready};
}
export const nextOwner=(o:ShopEntry['owner'])=>SHOP_OWNERS[(SHOP_OWNERS.indexOf(o)+1)%SHOP_OWNERS.length];
export const nextStatus=(s:ShopEntry['status'])=>SHOP_STATUSES[(SHOP_STATUSES.indexOf(s)+1)%SHOP_STATUSES.length];
export const statusLabel:Record<ShopEntry['status'],string>={todo:'まだ',got:'買った',have:'持っている',skip:'いらない'};
export function newShopId(){return `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;}

/** 1品目の担当・状態・メモを置きかえる（値はまるごと）。 */
export function setShopEntry(shopping:Shopping|undefined,id:string,entry:Omit<ShopEntry,'updatedAt'>,now=new Date().toISOString()):Shopping{
  const cur=shopping||emptyShopping;
  return {...cur,entries:{...cur.entries,[id]:{...entry,note:entry.note.slice(0,100),updatedAt:now}}};
}
export function addShopCustom(shopping:Shopping|undefined,item:Omit<ShopCustom,'updatedAt'>,now=new Date().toISOString()):Shopping{
  const cur=shopping||emptyShopping;
  if(cur.custom.some(x=>x.id===item.id))return cur;
  return {...cur,custom:[...cur.custom,{...item,name:item.name.slice(0,60),updatedAt:now}].slice(0,200)};
}
/** 足した品目を消す。消した時刻を deleted に残し、もう一方の端末でも消える。 */
export function removeShopCustom(shopping:Shopping|undefined,id:string,now=new Date().toISOString()):Shopping{
  const cur=shopping||emptyShopping;
  const entries={...cur.entries};delete entries[id];
  return {entries,custom:cur.custom.filter(x=>x.id!==id),deleted:pruneDeleted({...cur.deleted,[id]:now})};
}

/** 同期の合わせ方：品目ごとに新しい方。足した品目は両方残し、消した品目は deleted より古ければ戻さない。 */
export function mergeShopping(local:Shopping|undefined,remote:Shopping|undefined):Shopping{
  const l=local||emptyShopping,r=remote||emptyShopping;
  const deleted:Record<string,string>={...l.deleted};
  for(const [id,at] of Object.entries(r.deleted))if(!deleted[id]||at>deleted[id])deleted[id]=at;
  const byId=new Map<string,ShopCustom>();
  for(const it of [...l.custom,...r.custom]){const p=byId.get(it.id);if(!p||it.updatedAt>p.updatedAt)byId.set(it.id,it);}
  const custom=[...byId.values()].filter(it=>!deleted[it.id]||it.updatedAt>deleted[it.id]).sort((a,b)=>a.updatedAt.localeCompare(b.updatedAt)||a.id.localeCompare(b.id)).slice(0,200);
  const entries:Record<string,ShopEntry>={};
  for(const [id,e] of [...Object.entries(l.entries),...Object.entries(r.entries)]){
    if(deleted[id]&&!custom.some(c=>c.id===id))continue;
    const p=entries[id];if(!p||e.updatedAt>p.updatedAt)entries[id]=e;
  }
  return {entries,custom,deleted:pruneDeleted(deleted)};
}
export function sameShopping(a:Shopping|undefined,b:Shopping|undefined){
  const n=(x:Shopping|undefined)=>{const v=x||emptyShopping;return JSON.stringify({e:Object.entries(v.entries).sort(([x],[y])=>x.localeCompare(y)),c:[...v.custom].sort((x,y)=>x.id.localeCompare(y.id)),d:Object.entries(v.deleted).sort()});};
  return n(a)===n(b);
}
