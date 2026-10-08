import {createContext,useContext,useMemo,useState,type ReactNode} from 'react';
import {Bookmark,BookmarkCheck,ChevronDown,ChevronUp} from 'lucide-react';
import type {Later,LaterItem,Profile} from '../lib/model';
import {pairEventWhoLabels} from '../lib/model';
import {hasLater,sortLater} from '../lib/later';
import {monthDay} from '../lib/dates';

type LaterCtx={later:Later,busy:boolean,toggle:(item:Omit<LaterItem,'at'|'by'>)=>void};
const Ctx=createContext<LaterCtx|null>(null);

export function LaterProvider({value,children}:{value:LaterCtx,children:ReactNode}){
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** 「あとで見る」の印ボタン。押すと付く／もう一度押すと外れる（ふたりで共有）。Provider の外では何も出さない。 */
export function LaterButton({item,className=''}:{item:Omit<LaterItem,'at'|'by'>,className?:string}){
  const c=useContext(Ctx);
  if(!c)return null;
  const on=hasLater(c.later,item.id);
  return <button type="button" className={`later-mark${on?' on':''} ${className}`} aria-pressed={on} disabled={c.busy}
    onClick={e=>{e.stopPropagation();e.preventDefault();c.toggle(item);}}
    aria-label={on?`「${item.title}」のあとで見るを外す`:`「${item.title}」をあとで見るに入れる`}>
    {on?<BookmarkCheck size={13} aria-hidden/>:<Bookmark size={13} aria-hidden/>}あとで見る
  </button>;
}

const jstDate=(iso:string)=>{const t=Date.parse(iso);return Number.isFinite(t)?new Date(t+9*3600e3).toISOString().slice(0,10):'';};
const KIND_LABEL:Record<LaterItem['kind'],string>={task:'ロードマップの項目',faq:'よくある質問',lesson:'博士のレッスン'};
const TABS:{id:'all'|LaterItem['kind'],label:string}[]=[{id:'all',label:'ぜんぶ'},{id:'task',label:'項目'},{id:'faq',label:'質問'},{id:'lesson',label:'レッスン'}];

/** デスク「あとで見る（ふたりで共有）」。 */
export function LaterList({later,profile,busy,canShare,onOpen,onShare,renderInline}:{
  later:Later,
  profile:Profile,
  busy?:boolean,
  canShare:boolean,
  onOpen:(item:LaterItem)=>void,
  onShare:(item:LaterItem,text:string)=>void,
  renderInline:(item:LaterItem)=>ReactNode|null,
}){
  const [tab,setTab]=useState<'all'|LaterItem['kind']>('all');
  const [openId,setOpenId]=useState('');
  const w=pairEventWhoLabels(profile);
  const byName=(by:LaterItem['by'])=>by==='n1'?w.male:by==='n2'?w.female:'';
  const items=useMemo(()=>sortLater(later.items),[later.items]);
  const shown=tab==='all'?items:items.filter(it=>it.kind===tab);
  return <section id="desk-later" className="seed-block later-list" aria-label="あとで見る（ふたりで共有）">
    <div className="later-head">
      <h3><Bookmark size={19} aria-hidden/>あとで見る（ふたりで共有）</h3>
    </div>
    {items.length===0?<p className="hint later-empty">まだありません。ロードマップの項目・よくある質問・博士のレッスンにある「あとで見る」を押すと、ここに集まります。</p>:<>
      <div className="later-tabs" role="tablist" aria-label="あとで見るの種類">
        {TABS.map(t=><button key={t.id} type="button" role="tab" aria-selected={tab===t.id} className={tab===t.id?'on':''} onClick={()=>setTab(t.id)}>{t.label}</button>)}
      </div>
      {shown.length===0?<p className="hint later-empty">この種類の印はありません。</p>:<ul className="later-items">
        {shown.map(it=>{
          const inline=openId===it.id?renderInline(it):null;
          const by=byName(it.by);
          return <li key={it.id} className={`later-item kind-${it.kind}`}>
            <div className="later-item-head">
              <div className="later-item-text"><div className="k">{KIND_LABEL[it.kind]}</div><div className="t">{it.title}</div></div>
              <LaterButton item={{id:it.id,kind:it.kind,ref:it.ref,title:it.title}}/>
            </div>
            <div className="later-item-foot">
              <span className="later-meta">{by?`${by}が追加`:'追加'}{it.at?` · ${monthDay(jstDate(it.at))}`:''}</span>
              <span className="later-actions">
                {it.kind==='lesson'?<button type="button" className="desk-board-link" aria-expanded={openId===it.id} onClick={()=>setOpenId(openId===it.id?'':it.id)}>{openId===it.id?<>閉じる<ChevronUp size={13} aria-hidden/></>:<>開く<ChevronDown size={13} aria-hidden/></>}</button>
                  :<button type="button" className="desk-board-link" onClick={()=>onOpen(it)}>開く</button>}
                {canShare&&<button type="button" className="desk-board-link" disabled={busy} onClick={()=>onShare(it,`あとで一緒に見たい：${KIND_LABEL[it.kind]}「${it.title}」`)}>掲示板で知らせる</button>}
              </span>
            </div>
            {inline&&<div className="later-inline">{inline}</div>}
          </li>;
        })}
      </ul>}
    </>}
    <p className="hint later-note">印は同期でふたりの端末にそろいます。外した印は、もう一方の端末でも外れます。</p>
  </section>;
}
