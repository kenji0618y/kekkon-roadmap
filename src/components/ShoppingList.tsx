import {useState} from 'react';
import {ChevronDown,ChevronUp,ExternalLink,Plus,ShoppingBag,Trash2} from 'lucide-react';
import {Checkbox} from './ui/checkbox';
import {pairEventWhoLabels,type Profile,type ShopCustom,type ShopEntry,type Shopping} from '../lib/model';
import {newShopId,nextOwner,nextStatus,roomProgress,shopCategories,shopEntry,shopSource,statusLabel,type ShopRoom} from '../lib/shopping';

export type ShopSave={
  set:(id:string,entry:Omit<ShopEntry,'updatedAt'>)=>void,
  add:(item:Omit<ShopCustom,'updatedAt'>)=>Promise<boolean>,
  remove:(id:string)=>void,
};

/** ロードマップ「新生活」の章：新生活の買い物リスト（ゼクシィのチェックリストの品目・ふたりで共有）。 */
export function ShoppingList({shopping,profile,busy,save}:{shopping:Shopping,profile:Profile,busy?:boolean,save:ShopSave}){
  const cats=shopCategories(shopping);
  const [cat,setCat]=useState(cats[0].id);
  const [open,setOpen]=useState<Record<string,boolean>>({});
  const [adding,setAdding]=useState('');
  const [name,setName]=useState('');
  const [noteFor,setNoteFor]=useState('');
  const [noteText,setNoteText]=useState('');
  const w=pairEventWhoLabels(profile);
  const ownerName:Record<ShopEntry['owner'],string>={none:'未定',both:w.both,one:w.male,two:w.female};
  const current=cats.find(c=>c.id===cat)||cats[0];
  const isOpen=(r:ShopRoom,i:number)=>open[`${current.id}.${r.id}`]??i===0;
  const put=(id:string,patch:Partial<Omit<ShopEntry,'updatedAt'>>)=>{const e=shopEntry(shopping,id);save.set(id,{owner:e.owner,status:e.status,note:e.note,...patch});};
  const addItem=async(room:string)=>{
    const n=name.trim();if(!n)return;
    if(await save.add({id:newShopId(),cat:current.id,room,name:n.slice(0,60)})){setName('');setAdding('');}
  };
  return <section id="journey-shopping" className="seed-block shopping-list" aria-label="新生活の買い物リスト">
    <p className="eyebrow">ロードマップ · 新生活</p>
    <h3 className="shopping-title"><ShoppingBag size={19} aria-hidden/>新生活の買い物リスト</h3>
    <div className="shopping-tabs" role="tablist" aria-label="分類">
      {cats.map(c=><button key={c.id} type="button" role="tab" aria-selected={c.id===current.id} className={c.id===current.id?'on':''} onClick={()=>{setCat(c.id);setAdding('');}}>{c.label}</button>)}
    </div>
    {current.rooms.map((r,i)=>{
      const pr=roomProgress(shopping,r),o=isOpen(r,i),key=`${current.id}.${r.id}`;
      return <div key={key} className={`shopping-room${o?' open':''}`}>
        <button type="button" className="shopping-room-head" aria-expanded={o} onClick={()=>setOpen({...open,[key]:!o})}>
          <span>{r.label}</span>
          <span className="shopping-count">{pr.ready} / {pr.total} そろった{o?<ChevronUp size={16} aria-hidden/>:<ChevronDown size={16} aria-hidden/>}</span>
        </button>
        {o&&<>
          <ul className="shopping-items">
            {r.items.map(it=>{
              const e=shopEntry(shopping,it.id),ready=e.status==='got'||e.status==='have';
              return <li key={it.id} className={`shopping-item shop-st-${e.status}`}>
                <div className="shopping-row">
                  <Checkbox checked={ready} disabled={busy} aria-label={`${it.name}（買った）`} onCheckedChange={()=>put(it.id,{status:ready?'todo':'got'})}/>
                  <button type="button" className="shopping-name" onClick={()=>{if(noteFor===it.id){setNoteFor('');}else{setNoteFor(it.id);setNoteText(e.note);}}} aria-expanded={noteFor===it.id}>
                    {it.name}{e.note&&<small className="shopping-note">{e.note}</small>}
                  </button>
                  <button type="button" className={`shopping-owner who-${e.owner}`} disabled={busy} onClick={()=>put(it.id,{owner:nextOwner(e.owner)})} aria-label={`${it.name}の担当：${ownerName[e.owner]}（押して切りかえ）`}>{ownerName[e.owner]}</button>
                  <button type="button" className={`shopping-status s-${e.status}`} disabled={busy} onClick={()=>put(it.id,{status:nextStatus(e.status)})} aria-label={`${it.name}の状態：${statusLabel[e.status]}（押して切りかえ）`}>{statusLabel[e.status]}</button>
                </div>
                {noteFor===it.id&&<div className="shopping-note-edit">
                  <input value={noteText} maxLength={100} onChange={ev=>setNoteText(ev.target.value)} placeholder="メモ（色・サイズ・どこで など）" aria-label={`${it.name}のメモ`}/>
                  <button type="button" className="desk-board-link" disabled={busy} onClick={()=>{put(it.id,{note:noteText.trim()});setNoteFor('');}}>保存</button>
                  {it.custom&&<button type="button" className="shopping-remove" disabled={busy} onClick={()=>{save.remove(it.id);setNoteFor('');}} aria-label={`${it.name}を消す`}><Trash2 size={14} aria-hidden/>消す</button>}
                </div>}
              </li>;
            })}
          </ul>
          <div className="shopping-add">
            {adding===key?<div className="shopping-add-form">
              <input value={name} maxLength={60} autoFocus onChange={ev=>setName(ev.target.value)} onKeyDown={ev=>{if(ev.key==='Enter')void addItem(r.id);}} placeholder="品目の名前" aria-label={`${r.label}に足す品目の名前`}/>
              <button type="button" className="shopping-add-btn" disabled={busy||!name.trim()} onClick={()=>void addItem(r.id)}>足す</button>
              <button type="button" className="desk-board-link" onClick={()=>{setAdding('');setName('');}}>やめる</button>
            </div>:<button type="button" className="shopping-add-btn sec" onClick={()=>{setAdding(key);setName('');}}><Plus size={14} aria-hidden/>品目を足す</button>}
            <span className="hint">担当・状態は押して切りかえ</span>
          </div>
        </>}
      </div>;
    })}
    <p className="hint shopping-hint">状態：まだ／買った／持っている／いらない。値段は出しません（メモに入れたいときだけ自分で入れます）。品目の名前を押すとメモ。リストはふたりの端末で同期します。</p>
    <p className="shopping-src">品目の出典：{shopSource.publisher}「{shopSource.title}」<br/><a href={shopSource.url} target="_blank" rel="noopener noreferrer">{shopSource.url}<ExternalLink size={11} aria-hidden/></a></p>
  </section>;
}
