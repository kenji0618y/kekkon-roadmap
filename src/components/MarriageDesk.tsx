import {useEffect,useMemo,useState} from 'react';
import {ArrowRight,Gauge} from 'lucide-react';
import {chapters,statusNames,type Book,type Profile,type Status,type Task} from '../lib/model';
import {difference,formatMoney,moneyTotals,validDate} from '../lib/dates';
import {groups} from '../data/catalog';
import {GROK_CREDITS_CONSOLE_URL} from '../lib/amity-grok';
import {readGrokLocalOnlyFlag} from '../lib/grok-mode';

/** Public Pages URL for friend handoff (copy button). */

const typeLabels={procedure:'手続き',benefit:'給付',tax:'税',investment:'資産',contract:'契約',conversation:'対話'} as const;
const typeColors:Record<string,string>={procedure:'#3b82f6',benefit:'#10b981',tax:'#f59e0b',investment:'#8b5cf6',contract:'#ef4444',conversation:'#ec4899'};
const chapterColors=['#10b981','#3b82f6','#f59e0b','#ec4899','#8b5cf6','#14b8a6'];
const statusTag:Partial<Record<Status,{tag:string,tone:string}>>={
  done:{tag:'済',tone:'green'},
  applied:{tag:'申請',tone:'blue'},
  waiting:{tag:'待ち',tone:'yellow'},
  preparing:{tag:'準備',tone:'yellow'},
  learned:{tag:'確認',tone:'blue'},
  todo:{tag:'これから',tone:'gray'},
  na:{tag:'対象外',tone:'gray'},
};

type Activity={id:string,title:string,status:Status,at:string,sort:string};

function japanToday(d=new Date()){
  return new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',month:'long',day:'numeric',weekday:'short'}).format(d);
}

function activityStamp(iso:string,today:string){
  if(!iso)return '—';
  try{
    const d=new Date(iso);
    if(!Number.isFinite(d.getTime()))return '—';
    const day=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
    const hm=new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',hour:'2-digit',minute:'2-digit',hour12:false}).format(d);
    if(day===today)return hm;
    return `${day.slice(5,7)}/${day.slice(8,10)}`;
  }catch{return '—';}
}

function ridgePath(values:number[],w:number,h:number,baseline:number){
  const n=Math.max(values.length,1);
  const step=w/(n-1||1);
  const pts=values.map((v,i)=>{
    const x=i*step;
    const y=baseline-Math.max(0,Math.min(1,v))*(h*0.72);
    return [x,y] as const;
  });
  let d=`M0 ${baseline}`;
  for(let i=0;i<pts.length;i++){
    const [x,y]=pts[i];
    if(i===0)d+=` L${x} ${y}`;
    else{
      const [px]=pts[i-1];
      const cx=(px+x)/2;
      d+=` C${cx} ${pts[i-1][1]}, ${cx} ${y}, ${x} ${y}`;
    }
  }
  d+=` L${w} ${baseline} Z`;
  return d;
}

function StageRidge({stages}:{stages:{id:string,label:string,kanji:string,ratio:number,done:number,total:number}[]}){
  const w=420,h=148;
  return (
    <svg className="desk-ridge-svg" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="章ごとの進捗リッジ">
      {stages.map((s,i)=>{
        const baseline=h-8-i*18;
        const wave=Array.from({length:9},(_,x)=>{
          const t=x/8;
          const bump=Math.sin(t*Math.PI)*s.ratio;
          const side=Math.sin((t+i*0.17)*Math.PI*2)*0.08*s.ratio;
          return Math.max(0.04,bump*0.85+side+s.ratio*0.12);
        });
        return <path key={s.id} d={ridgePath(wave,w,42,baseline)} fill={chapterColors[i%chapterColors.length]} opacity={0.22+s.ratio*0.35} className="desk-ridge-layer"/>;
      })}
    </svg>
  );
}

function ChapterChord({stages}:{stages:{id:string,label:string,kanji:string,ratio:number}[]}){
  const size=220,cx=110,cy=110,r=78;
  const n=stages.length||1;
  const nodes=stages.map((s,i)=>{
    const a=(-Math.PI/2)+(i/n)*Math.PI*2;
    return {...s,x:cx+Math.cos(a)*r,y:cy+Math.sin(a)*r,a};
  });
  const arcs=[];
  for(let i=0;i<nodes.length;i++){
    for(let j=i+1;j<nodes.length;j++){
      const strength=(nodes[i].ratio+nodes[j].ratio)/2;
      if(strength<0.02&&nodes[i].ratio+nodes[j].ratio===0)continue;
      const mx=(nodes[i].x+nodes[j].x)/2;
      const my=(nodes[i].y+nodes[j].y)/2;
      const qx=cx+(mx-cx)*0.35;
      const qy=cy+(my-cy)*0.35;
      arcs.push({i,j,d:`M${nodes[i].x} ${nodes[i].y} Q${qx} ${qy} ${nodes[j].x} ${nodes[j].y}`,w:0.6+strength*3.2,op:0.15+strength*0.55});
    }
  }
  return (
    <svg className="desk-chord-svg" viewBox={`0 0 ${size} ${size}`} role="img" aria-label="章のつながりのコード図">
      <circle cx={cx} cy={cy} r={r} className="desk-chord-ring"/>
      {arcs.map((a,idx)=><path key={idx} d={a.d} fill="none" stroke={chapterColors[a.i%chapterColors.length]} strokeWidth={a.w} opacity={a.op} className="desk-chord-arc"/>)}
      {nodes.map((n,i)=>(
        <g key={n.id}>
          <circle cx={n.x} cy={n.y} r={7+n.ratio*6} fill={chapterColors[i%chapterColors.length]} opacity={0.85}/>
          <text x={n.x} y={n.y+3.5} textAnchor="middle" className="desk-chord-label">{n.kanji}</text>
        </g>
      ))}
    </svg>
  );
}

function TypeNetwork({mix}:{mix:{type:string,label:string,count:number,done:number}[]}){
  const size=220,cx=110,cy=110;
  const active=mix.filter(m=>m.count>0);
  const nodes=active.map((m,i)=>{
    const a=(-Math.PI/2)+(i/Math.max(active.length,1))*Math.PI*2;
    const r=58+((m.done/Math.max(m.count,1))*18);
    return {...m,x:cx+Math.cos(a)*r*0.92,y:cy+Math.sin(a)*r*0.92,ratio:m.done/Math.max(m.count,1)};
  });
  return (
    <svg className="desk-net-svg" viewBox={`0 0 ${size} ${size}`} role="img" aria-label="項目タイプのネットワーク">
      <circle cx={cx} cy={cy} r={28} className="desk-net-hub"/>
      <text x={cx} y={cy+4} textAnchor="middle" className="desk-net-hub-label">種類</text>
      {nodes.map((n,i)=>(
        <g key={n.type}>
          <line x1={cx} y1={cy} x2={n.x} y2={n.y} stroke={typeColors[n.type]||'#94a3b8'} strokeWidth={1+n.ratio*2} opacity={0.35+n.ratio*0.4} className="desk-net-link"/>
          <circle cx={n.x} cy={n.y} r={10+n.count*0.15} fill={typeColors[n.type]||'#94a3b8'} opacity={0.9}/>
          <text x={n.x} y={n.y+22} textAnchor="middle" className="desk-net-label">{n.label}</text>
          <text x={n.x} y={n.y+3} textAnchor="middle" className="desk-net-count">{n.done}/{n.count}</text>
        </g>
      ))}
      {!nodes.length&&<text x={cx} y={cy+48} textAnchor="middle" className="desk-empty-svg">まだ対象項目がありません</text>}
    </svg>
  );
}

function LatticeWire(){
  return (
    <div className="desk-lattice" aria-hidden="true">
      <div className="desk-lattice-cube">
        <span/><span/><span/><span/><span/><span/>
      </div>
    </div>
  );
}


export type MarriageDeskProps={
  book:Book;
  profile:Profile;
  scoped:Task[];
  actionable:Task[];
  done:Task[];
  soonCount:number;
  today:string;
  hasBook:boolean;
  syncStatus?:'off'|'ok'|'error'|'syncing';
  /** Grok deep research unavailable → show 端末内のみモード chip. */
  localOnlyMode?:boolean;
  onOpenTask:(id:string)=>void;
  onOpenProfile:()=>void;
  onGoJourney:()=>void;
  onOpenSettings?:()=>void;
  onGoFind?:(keyword?:string)=>void;
  /** Jump to 期限 tab (InstitutionalDeadlines). */
  onGoDeadlines?:()=>void;
  /** Opens Amity FAB chat (Amity is chat-only; not embedded here). */
};

export function MarriageDesk({book,profile:p,scoped,actionable,done,soonCount,today,hasBook,syncStatus='off',localOnlyMode=false,onOpenTask,onOpenProfile,onGoJourney,onOpenSettings,onGoDeadlines}:MarriageDeskProps){
  const [showDecor,setShowDecor]=useState(false);

  const progressPct=actionable.length?Math.round(done.length/actionable.length*100):0;

  const weddingMetric=useMemo(()=>{
    if(!validDate(p.wdate))return {label:'婚姻日',value:'—',sub:'婚姻日を設定',tone:'' as string};
    const days=difference(p.wdate,today);
    if(days>0)return {label:'届出まで',value:`${days}`,sub:'日',tone:'warn'};
    if(days===0)return {label:'婚姻日',value:'今日',sub:'',tone:'live'};
    return {label:'婚姻から',value:`${-days+1}`,sub:'日目',tone:'ok'};
  },[p.wdate,today]);

  const stages=useMemo(()=>chapters.map(c=>{
    const list=scoped.filter(t=>t.chapter===c.id&&book.records[t.id]?.status!=='na');
    const d=list.filter(t=>book.records[t.id]?.status==='done').length;
    return {id:c.id,label:c.label,kanji:c.kanji,done:d,total:list.length,ratio:list.length?d/list.length:0};
  }),[scoped,book.records]);

  const typeMix=useMemo(()=>{
    const map=new Map<string,{type:string,label:string,count:number,done:number}>();
    for(const t of actionable){
      const row=map.get(t.type)||{type:t.type,label:typeLabels[t.type],count:0,done:0};
      row.count+=1;
      if(book.records[t.id]?.status==='done')row.done+=1;
      map.set(t.type,row);
    }
    return [...map.values()].sort((a,b)=>b.count-a.count);
  },[actionable,book.records]);

  const activity=useMemo(()=>{
    const rows:Activity[]=[];
    for(const t of scoped){
      const r=book.records[t.id];
      if(!r||r.status==='todo'||r.status==='na')continue;
      const sort=r.updatedAt||r.confirmedAt||'';
      rows.push({id:t.id,title:t.title,status:r.status,at:sort,sort:sort||`0-${t.id}`});
    }
    rows.sort((a,b)=>b.sort.localeCompare(a.sort));
    return rows.slice(0,12);
  },[scoped,book.records]);

  const groupPulse=useMemo(()=>groups.slice(0,8).map(g=>{
    const ts=scoped.filter(t=>g.ids.includes(t.id)&&book.records[t.id]?.status!=='na');
    const d=ts.filter(t=>book.records[t.id]?.status==='done').length;
    return {id:g.id,short:g.short,kanji:g.kanji,done:d,total:ts.length,ratio:ts.length?d/ts.length:0};
  }),[scoped,book.records]);

  const names=p.name1&&p.name2?`${p.name1} × ${p.name2}`:p.name1||p.name2||'これからの二人';
  const totals=moneyTotals(book);

  return (
    <div className="desk-root desk-washi">
      <header className="desk-titlebar">
        <div className="desk-title-left">
          <Gauge size={18} aria-hidden/>
          <h1>ふたりの手帳</h1>
          <span className="desk-subtitle">{names}</span>
        </div>
        <div className="desk-title-right">
          {localOnlyMode&&(
            <span className="desk-local-only-chip" title="Grok深掘りなし・端末内案内のみ">
              端末内のみモード
              {readGrokLocalOnlyFlag()==='credits-limit'&&(
                <a className="desk-credits-link" href={GROK_CREDITS_CONSOLE_URL} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()}>クレジットを増やす（xAI）</a>
              )}
            </span>
          )}
          {syncStatus!=='off'&&(
            <span className={`desk-sync-pill sync-${syncStatus}`} title="Gist同期" aria-label={`同期 ${syncStatus}`}>
              {syncStatus==='syncing'?'同期中…':syncStatus==='ok'?'同期済み':syncStatus==='error'?'同期できず':'同期'}
            </span>
          )}
          <time className="desk-clock" dateTime={today}>{japanToday()}</time>
        </div>
      </header>

      <section className="desk-metrics" aria-label="主要指標">
        <article className="desk-metric">
          <span className="desk-metric-label">これまで</span>
          <strong className="desk-metric-value">{actionable.length?`${progressPct}%`:'—'}</strong>
          <span className="desk-metric-sub">{done.length}/{actionable.length} 完了 · 対象内</span>
          <div className="desk-metric-bar" aria-hidden><i style={{width:`${progressPct}%`}}/></div>
        </article>
        <article className={`desk-metric ${weddingMetric.tone?`tone-${weddingMetric.tone}`:''}`}>
          <span className="desk-metric-label">{weddingMetric.label}</span>
          <strong className="desk-metric-value">{weddingMetric.value}{weddingMetric.sub&&weddingMetric.value!=='—'&&weddingMetric.value!=='今日'&&<small>{weddingMetric.sub}</small>}</strong>
          <span className="desk-metric-sub">{validDate(p.wdate)?`基準 ${p.wdate}`:'プロフィールで設定'}</span>
        </article>
        <article className={`desk-metric ${soonCount>0?'tone-warn':''}`}>
          <span className="desk-metric-label">次の期限</span>
          <strong className="desk-metric-value">{soonCount}<small>件</small></strong>
          <span className="desk-metric-sub">手帳の予定・14日以内</span>
        </article>
      </section>

      {!hasBook&&(
        <div className="desk-start">
          <div>
            <strong>この画面を使いはじめるには、まず手帳を整えよう</strong>
            <p>呼び名や婚姻日を入れると、進捗・期限・活動がここに集まります。</p>
          </div>
          <button type="button" className="desk-cta" onClick={onOpenProfile}>手帳を整える <ArrowRight size={15}/></button>
        </div>
      )}


      <section className="desk-money" aria-label="金額の集計">
        <div className="money-grid">
          {([
            {key:'received',label:'受け取った給付・祝金',unit:'円',sub:'受取を記録した金額'},
            {key:'estimate',label:'これからの受取見込み',unit:'円',sub:'未受取・給付の確約ではありません'},
            {key:'monthlySaving',label:'固定費の削減',unit:'円／月',sub:'二人が確認した月額の差'},
            {key:'taxEstimate',label:'税負担の軽減見込み',unit:'円',sub:'控除対象額とは異なります'},
          ] as const).map(m=>(
            <div className={`money-card ${m.key==='received'?'primary':''}`} key={m.key}>
              <span>{m.label}</span>
              <strong>
                {Object.values(book.records).some(r=>r.moneyKind===m.key&&r.amount!==null&&r.status!=='na')?formatMoney(totals[m.key]):'—'}
                <small>{m.unit}</small>
              </strong>
              <p>{m.sub}</p>
            </div>
          ))}
        </div>
        <p className="hint">投資枠・運用益は集計しません。異なる期間や区分の金額を足した「総お得額」は表示していません。同じ給付を重複して入力していないか、記録を確認してください。</p>
      </section>

      <div className="desk-decor-fold">
        {!showDecor?(
          <button type="button" className="desk-more-viz" onClick={()=>setShowDecor(true)}>
            くわしく見る · 章ごとの進み／最近の動き／つながり／重さ／種類のバランス
          </button>
        ):(
          <>
            <div className="desk-decor-toolbar">
              <span className="hint">章ごとの進み・最近の動き・つながりの図</span>
              <button type="button" className="desk-linkish" onClick={()=>setShowDecor(false)}>閉じる</button>
            </div>
            <div className="desk-main-grid">
              <section className="desk-card desk-ridge-card">
                <div className="desk-card-head"><span className="desk-dot"/>章ごとの進みぐあい</div>
                <div className="desk-ridge-body">
                  <ul className="desk-ridge-stats">
                    {stages.map(s=>(
                      <li key={s.id}>
                        <span>{s.kanji} {s.label}</span>
                        <strong>{s.total?`${Math.round(s.ratio*100)}%`:'—'}</strong>
                        <small>{s.done}/{s.total||'—'}</small>
                      </li>
                    ))}
                  </ul>
                  <div className="desk-ridge-plot">
                    <StageRidge stages={stages}/>
                    <div className="desk-ridge-callout" aria-hidden>
                      <span>完了</span>
                      <strong>{progressPct}%</strong>
                    </div>
                  </div>
                </div>
              </section>

              <section className="desk-card desk-log-card">
                <div className="desk-card-head"><span className="desk-dot"/>最近うごいたこと</div>
                <div className="desk-log" role="list">
                  {activity.length?activity.map(a=>{
                    const meta=statusTag[a.status]||{tag:'記録',tone:'gray'};
                    return (
                      <button type="button" className="desk-log-row" key={a.id} role="listitem" onClick={()=>onOpenTask(a.id)}>
                        <span className="desk-log-time">{activityStamp(a.at,today)}</span>
                        <span className={`desk-tag tone-${meta.tone}`}>{meta.tag}</span>
                        <span className="desk-log-text">{a.title}<small>{statusNames[a.status]}</small></span>
                      </button>
                    );
                  }):(
                    <div className="desk-empty">まだ記録の変化がありません。ロードマップで一歩進めるとここに流れます。</div>
                  )}
                </div>
              </section>
            </div>
            <div className="desk-lower-grid">
              <section className="desk-card">
                <div className="desk-card-head"><span className="desk-dot"/>章どうしのつながり</div>
                <div className="desk-viz">
                  <ChapterChord stages={stages}/>
                  <ul className="desk-viz-legend">
                    {stages.map((s,i)=><li key={s.id}><i style={{background:chapterColors[i%chapterColors.length]}}/>{s.label}</li>)}
                  </ul>
                </div>
              </section>

              <section className="desk-card desk-lattice-card">
                <div className="desk-card-head"><span className="desk-dot"/>章ごとの重さと進み</div>
                <div className="desk-lattice-wrap">
                  <div className="desk-lattice-stats">
                    <div><span>対象の項目</span><strong>{actionable.length}</strong></div>
                    <div><span>まとまり</span><strong>{groups.filter(g=>scoped.some(t=>g.ids.includes(t.id))).length}</strong></div>
                    <div><span>済んだ数</span><strong className="ok">{done.length}</strong></div>
                  </div>
                  <LatticeWire/>
                </div>
                <div className="desk-group-pulse">
                  {groupPulse.map(g=>(
                    <div key={g.id} className="desk-pulse-chip" title={`${g.short} ${g.done}/${g.total}`}>
                      <span>{g.kanji}</span>
                      <i style={{width:`${Math.max(8,g.ratio*100)}%`}}/>
                    </div>
                  ))}
                </div>
              </section>

              <section className="desk-card">
                <div className="desk-card-head"><span className="desk-dot"/>項目の種類のバランス</div>
                <div className="desk-viz">
                  <TypeNetwork mix={typeMix}/>
                  <div className="desk-type-bars">
                    {typeMix.slice(0,4).map(m=>(
                      <div key={m.type} className="desk-type-bar">
                        <span>{m.label}</span>
                        <div><i style={{width:`${m.count?Math.round(m.done/m.count*100):0}%`,background:typeColors[m.type]}}/></div>
                        <strong>{m.done}/{m.count}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          </>
        )}
      </div>

    </div>
  );
}

export default MarriageDesk;
