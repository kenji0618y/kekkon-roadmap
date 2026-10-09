import {CalendarDays,ChevronRight,ListChecks} from 'lucide-react';
import {Checkbox} from './ui/checkbox';
import {StatusMark} from './book-controls';
import {pairChecks,pairEventWhoLabels,type Profile,type TaskRecord} from '../lib/model';
import {monthDay} from '../lib/dates';
import type {WeekItem,WeekShare,WeekWho} from '../lib/week-together';

const WD=['日','月','火','水','木','金','土'];
const md=(iso:string)=>`${monthDay(iso)}（${WD[new Date(iso+'T00:00:00Z').getUTCDay()]}）`;

/** デスク「今週ふたりでやること」。項目の期限・予定日と、カレンダーの予定・制度の締切を今週ぶん並べる。 */
export function WeekTogether({profile,range,items,shares,records,busy,onOpenTask,onOpenCalendar,onToggleCheck}:{
  profile:Profile,
  range:{start:string,end:string},
  items:WeekItem[],
  shares:WeekShare[],
  records:Record<string,TaskRecord>,
  busy?:boolean,
  onOpenTask:(id:string)=>void,
  onOpenCalendar:(date:string)=>void,
  onToggleCheck:(id:string,who:'male'|'female')=>void,
}){
  const w=pairEventWhoLabels(profile);
  const name:Record<WeekWho,string>={both:w.both,one:w.male,two:w.female,none:'ふたり'};
  return <section id="desk-week" className="seed-block week-together" aria-label="今週ふたりでやること">
    <div className="week-head">
      <h3><ListChecks size={20} aria-hidden/>今週ふたりでやること</h3>
      <p className="hint">{md(range.start)}〜{md(range.end)} · 項目の期限とアプリの予定から</p>
    </div>
    <div className="week-shares">
      {shares.map(s=><div key={s.who} className={`week-share who-${s.who}`}>
        <b>{name[s.who]}</b>
        <small>{s.total?`${s.total}件中 ${s.done}件 済`:'項目なし'}</small>{s.events>0&&<small>予定 {s.events}件</small>}
        <span className="week-bar" aria-hidden><i style={{width:s.total?`${Math.round(s.done/s.total*100)}%`:'0%'}}/></span>
      </div>)}
    </div>
    {items.length===0?<div className="week-empty">
      <p className="hint">今週の期限や予定はまだありません。</p>
      <button type="button" className="desk-board-link" onClick={()=>onOpenCalendar(range.start)}>アプリの予定を開く</button>
    </div>:<ul className="week-list">
      {items.map(it=>{
        const open=()=>it.kind==='task'&&it.taskId?onOpenTask(it.taskId):onOpenCalendar(it.date);
        const pc=it.taskId?pairChecks(records[it.taskId]):null;
        return <li key={it.key} className={`week-item kind-${it.kind}${it.done?' is-done':''}`}>
          <button type="button" className="week-item-main" onClick={open} aria-label={`${it.title}（${it.kind==='task'?'項目を開く':'アプリの予定で開く'}）`}>
            <span className="week-item-title">{it.title}</span>
            <span className="week-item-meta">
              {it.who!=='none'&&<span className={`week-chip who-${it.who}`}>{name[it.who]}</span>}
              {it.kind==='task'?<StatusMark status={records[it.taskId!]?.status||'todo'}/>:<span className="week-kind"><CalendarDays size={12} aria-hidden/>{it.label}</span>}
              <span className="week-due">{md(it.date)}{it.kind==='task'?`・${it.label}`:''}</span>
            </span>
          </button>
          {it.kind==='task'&&it.taskId&&pc?<div className="week-checks">
            <label><Checkbox checked={pc.male} disabled={busy} onCheckedChange={()=>onToggleCheck(it.taskId!,'male')}/>{w.male}</label>
            <label><Checkbox checked={pc.female} disabled={busy} onCheckedChange={()=>onToggleCheck(it.taskId!,'female')}/>{w.female}</label>
          </div>:<ChevronRight className="week-go" size={16} aria-hidden/>}
        </li>;
      })}
    </ul>}
  </section>;
}
