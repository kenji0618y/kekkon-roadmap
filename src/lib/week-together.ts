/**
 * デスク「今週ふたりでやること」（2026-10-08〜）。
 * 今週（月〜日・日本時間）の、項目の期限・予定日／カレンダーの予定（book.events）／制度の締切（カレンダーの点）を1つに並べる。
 * 担当は項目の記録（assignee）と予定の「だれ」（who）をそのまま使う。新しいデータは増やさない。
 */
import type {PairEvent,Profile,Task,TaskRecord} from './model';
import {difference,plusDays,taskDeadlines,validDate} from './dates';

export type WeekWho='both'|'one'|'two'|'none';
export type WeekItem={
  key:string,
  kind:'task'|'event'|'rule',
  date:string,
  title:string,
  who:WeekWho,
  label:string,
  taskId?:string,
  eventId?:string,
  done?:boolean,
};
export type WeekShare={who:'both'|'one'|'two',total:number,done:number,events:number};

/** 今週の月曜〜日曜（YYYY-MM-DD）。 */
export function weekRange(today:string){
  const dow=new Date(today+'T00:00:00Z').getUTCDay(); // 0=日
  const start=plusDays(today,dow===0?-6:1-dow);
  return {start,end:plusDays(start,6)};
}
const inRange=(d:string,r:{start:string,end:string})=>validDate(d)&&difference(d,r.start)>=0&&difference(r.end,d)>=0;
export function assigneeWho(a:TaskRecord['assignee']|undefined):'both'|'one'|'two'{return a==='one'?'one':a==='two'?'two':'both';}
export function eventWho(w:PairEvent['who']):'both'|'one'|'two'{return w==='male'?'one':w==='female'?'two':'both';}

export function buildWeek({today,tasks,profile,records,events,rules}:{
  today:string,
  tasks:Task[],
  profile:Profile,
  records:Record<string,TaskRecord>,
  events:PairEvent[],
  rules:{date:string,title:string}[],
}){
  const range=weekRange(today);
  const items:WeekItem[]=[];
  for(const t of tasks){
    const r=records[t.id];
    if(r?.status==='na')continue;
    const ds=taskDeadlines(t,profile,r).filter(d=>inRange(d.date,range)).sort((a,b)=>a.date.localeCompare(b.date));
    if(!ds.length)continue;
    const d=ds[0];
    items.push({key:`task-${t.id}`,kind:'task',date:d.date,title:t.title,who:assigneeWho(r?.assignee),label:d.kind==='personal'?'予定日':'期限',taskId:t.id,done:r?.status==='done'});
  }
  for(const e of events){
    if(!inRange(e.date,range))continue;
    items.push({key:`event-${e.id}`,kind:'event',date:e.date,title:e.title,who:eventWho(e.who),label:'カレンダーの予定',eventId:e.id});
  }
  for(const r of rules){
    if(!inRange(r.date,range))continue;
    items.push({key:`rule-${r.date}-${r.title}`,kind:'rule',date:r.date,title:r.title,who:'none',label:'制度の締切'});
  }
  const order={task:0,event:1,rule:2} as const;
  items.sort((a,b)=>a.date.localeCompare(b.date)||order[a.kind]-order[b.kind]||a.title.localeCompare(b.title));
  const shares:WeekShare[]=(['both','one','two'] as const).map(who=>{
    const mine=items.filter(i=>i.who===who);
    const ts=mine.filter(i=>i.kind==='task');
    return {who,total:ts.length,done:ts.filter(i=>i.done).length,events:mine.filter(i=>i.kind==='event').length};
  });
  return {range,items,shares};
}
