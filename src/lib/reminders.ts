/**
 * カレンダーにのるもの（制度の締切・項目の予定日・ふたりの予定・記念日・月に一度のふたり会議）を1つの形にそろえ、
 * そこから LINE のお知らせ（中継先へ送る短い一覧）・カレンダーの鈴の印・.ics のアラームを作る。
 * 日付は手帳に入っている日付と、ふたりが入れた日付だけ（作った日付・数字は出さない）。
 */
import {plusDays,plusYears,validDate,difference} from './dates';
import {MEETING_WEEKS,type PairEvent,type Profile,type Reminders,type Task,type TaskRecord} from './model';
import {assigneeWho,eventWho} from './week-together';

export type CalKind='rule'|'task'|'event'|'anniv'|'meeting';
export type CalWho='both'|'one'|'two'|'none';
export type CalItem={key:string,date:string,title:string,kind:CalKind,who:CalWho,taskId?:string,eventId?:string};
export type RuleLike={date:string,title:string};

export const MEETING_TITLE='月に一度のふたり会議';
export const REMIND_WINDOW_DAYS=35;
export const REMIND_MAX_ITEMS=40;
export const REMIND_TITLE_MAX=30;
export const SLOT_HOUR:Record<Reminders['slot'],number>={morning:8,noon:12,night:20};
export const SLOT_LABEL:Record<Reminders['slot'],string>={morning:'朝',noon:'昼',night:'夜'};
const WD=['日','月','火','水','木','金','土'];
export const WEEK_LABEL:Record<(typeof MEETING_WEEKS)[number],string>={'1':'第1','2':'第2','3':'第3','4':'第4',last:'最終'};

export function meetingReady(m:Reminders['meeting']|undefined){return !!m&&m.week!==''&&m.weekday>=0&&m.weekday<=6;}
export function meetingRuleText(m:Reminders['meeting']){return meetingReady(m)?`毎月${WEEK_LABEL[m.week as (typeof MEETING_WEEKS)[number]]}${WD[m.weekday]}曜日`:'まだ決めていません';}

/** その月の会議の日（YYYY-MM-DD）。 */
export function meetingDateIn(y:number,m:number,meeting:Reminders['meeting']):string{
  if(!meetingReady(meeting))return '';
  const first=new Date(Date.UTC(y,m-1,1)).getUTCDay();
  const dim=new Date(Date.UTC(y,m,0)).getUTCDate();
  let day:number;
  if(meeting.week==='last'){
    const lastWd=new Date(Date.UTC(y,m-1,dim)).getUTCDay();
    day=dim-((lastWd-meeting.weekday+7)%7);
  }else{
    day=1+((meeting.weekday-first+7)%7)+(Number(meeting.week)-1)*7;
  }
  return `${y}-${String(m).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}
/** from〜to（両端を含む）の会議の日。 */
export function meetingDates(meeting:Reminders['meeting'],from:string,to:string):string[]{
  if(!meetingReady(meeting)||!validDate(from)||!validDate(to)||to<from)return [];
  const out:string[]=[];
  let [y,m]=from.split('-').map(Number);
  for(let i=0;i<40;i++){
    const d=meetingDateIn(y,m,meeting);
    if(d>to)break;
    if(d>=from)out.push(d);
    m++;if(m>12){m=1;y++;}
  }
  return out;
}

/** カレンダーにのるものを from〜to でそろえる（カレンダーの画面・LINE・.ics で共通）。 */
export function calendarItems(o:{from:string,to:string,profile:Profile,tasks:Task[],records:Record<string,TaskRecord>,events:PairEvent[],rules:RuleLike[],reminders:Reminders}):CalItem[]{
  const {from,to}=o;
  const inRange=(d:string)=>validDate(d)&&d>=from&&d<=to;
  const out:CalItem[]=[];
  for(const r of o.rules)if(inRange(r.date))out.push({key:`rule:${r.date}:${r.title}`,date:r.date,title:r.title,kind:'rule',who:'none'});
  for(const t of o.tasks){
    const rec=o.records[t.id];
    if(!rec||!rec.due||['done','na'].includes(rec.status))continue;
    if(inRange(rec.due))out.push({key:`task:${t.id}`,date:rec.due,title:t.title,kind:'task',who:assigneeWho(rec.assignee),taskId:t.id});
  }
  for(const e of o.events)if(inRange(e.date))out.push({key:`event:${e.id}`,date:e.date,title:e.title,kind:'event',who:eventWho(e.who),eventId:e.id});
  out.push(...anniversaries(o.profile,from,to));
  for(const d of meetingDates(o.reminders.meeting,from,to))out.push({key:`meeting:${d}`,date:d,title:MEETING_TITLE,kind:'meeting',who:'both'});
  return out.sort((a,b)=>a.date.localeCompare(b.date)||a.key.localeCompare(b.key));
}

/** 記念日：プロフィールの婚姻日（その日と、毎年の結婚記念日）・出産予定日。 */
export function anniversaries(p:Profile,from:string,to:string):CalItem[]{
  const out:CalItem[]=[];
  if(validDate(p.wdate)){
    if(p.wdate>=from&&p.wdate<=to)out.push({key:`anniv:wdate:${p.wdate}`,date:p.wdate,title:'婚姻日',kind:'anniv',who:'both'});
    const fy=Number(from.slice(0,4)),ty=Number(to.slice(0,4)),wy=Number(p.wdate.slice(0,4));
    for(let y=Math.max(fy,wy+1);y<=ty;y++){
      const d=plusYears(p.wdate,y-wy);
      if(d>=from&&d<=to)out.push({key:`anniv:wedding:${d}`,date:d,title:'結婚記念日',kind:'anniv',who:'both'});
    }
  }
  if(validDate(p.duedate)&&p.duedate>=from&&p.duedate<=to)out.push({key:`anniv:due:${p.duedate}`,date:p.duedate,title:'出産予定日',kind:'anniv',who:'both'});
  return out;
}

/** その予定を何日前に知らせるか（3＝3日前、0＝当日）。お知らせしないときは []。 */
export function remindOffsets(kind:CalKind,r:Reminders):number[]{
  if(kind==='meeting'){
    if(!r.meeting.on||!meetingReady(r.meeting))return [];
    return [...(r.meeting.before3?[3]:[]),...(r.meeting.sameDay?[0]:[])];
  }
  if(!r.on||!r.kinds[kind])return [];
  return [...(r.before3?[3]:[]),...(r.sameDay?[0]:[])];
}
export function offsetsText(o:number[]){return o.map(n=>n===0?'当日':`${n}日前`).join('・');}

export type RelayReminderItem={t:string,d:string,k:CalKind,w:CalWho,o:number[]};
export type RemindersPayload={kind:'reminders',secret:string,on:boolean,slot:Reminders['slot'],names:{'1':string,'2':string},from:string,to:string,items:RelayReminderItem[]};

/** 中継先へ送る一覧（この先35日・お知らせするものだけ・題は短く）。お知らせを使わないときは on:false と空の一覧（中継先の一覧を消す）。 */
export function remindersPayload(o:{secret:string,today:string,reminders:Reminders,items:CalItem[],names:{n1:string,n2:string}}):RemindersPayload{
  const r=o.reminders;
  const on=r.on||(r.meeting.on&&meetingReady(r.meeting));
  const to=plusDays(o.today,REMIND_WINDOW_DAYS);
  const items=on?o.items
    .filter(it=>it.date>=o.today&&it.date<=to)
    .map(it=>({t:Array.from(it.title).slice(0,REMIND_TITLE_MAX).join(''),d:it.date,k:it.kind,w:it.who,o:remindOffsets(it.kind,r)}))
    .filter(it=>it.o.length>0)
    .slice(0,REMIND_MAX_ITEMS):[];
  const nm=(s:string)=>Array.from(s.trim()).slice(0,20).join('');
  return {kind:'reminders',secret:o.secret,on,slot:r.slot,names:{'1':nm(o.names.n1),'2':nm(o.names.n2)},from:o.today,to,items};
}
/** 同じ内容をくり返し送らないための目印（合言葉は含めない）。 */
export function payloadKey(p:RemindersPayload){const {secret:_s,...rest}=p;return JSON.stringify(rest);}

const md=(iso:string)=>{const [,m,d]=iso.split('-');return `${Number(m)}月${Number(d)}日（${WD[new Date(iso+'T00:00:00Z').getUTCDay()]}）`;};
/**
 * その日に送る1通（中継先の code.gs と同じ組み立て。画面の「LINEでの見え方」にも使う）。送るものがなければ ''。
 */
export function reminderText(items:RelayReminderItem[],today:string,names:{'1':string,'2':string},appUrl:string):string{
  const whoName=(w:CalWho)=>w==='one'?(names['1']||'一人目'):w==='two'?(names['2']||'二人目'):w==='both'?'ふたり':'';
  const label=(it:RelayReminderItem)=>it.k==='rule'?`${it.t}（制度の締切）`:it.k==='task'?`${it.t}（項目の予定日）`:it.k==='event'?`${it.t}（${whoName(it.w)}）`:it.t;
  const due=items.map(it=>({it,n:difference(it.d,today)})).filter(x=>x.it.o.includes(x.n)).sort((a,b)=>a.n-b.n||a.it.d.localeCompare(b.it.d));
  if(!due.length)return '';
  const lines=['【Amityちゃん】今日のお知らせ'];
  const shown=due.slice(0,8);
  for(const {it,n} of shown)lines.push(n===0?`・今日：${label(it)}`:`・${n}日後（${md(it.d)}）：${label(it)}`);
  if(due.length>shown.length)lines.push(`ほか${due.length-shown.length}件`);
  if(due.some(x=>x.it.k==='meeting'&&x.n===0))lines.push('ふたり会議は、博士タブの「ふたり会議」から始められます。');
  else if(due.some(x=>x.it.k==='meeting'))lines.push('話したいことがあれば、掲示板にメモしておいてね。');
  lines.push('くわしくはアプリのカレンダーで。');
  if(appUrl)lines.push(appUrl);
  return lines.join('\n');
}
/** 次にお知らせが届く日とその本文（画面の見え方用）。 */
export function nextReminder(p:RemindersPayload,today:string,appUrl:string):{date:string,text:string}|null{
  for(let i=0;i<=REMIND_WINDOW_DAYS;i++){
    const d=plusDays(today,i);
    const text=reminderText(p.items,d,p.names,appUrl);
    if(text)return {date:d,text};
  }
  return null;
}

/** .ics のアラーム（終日の予定の 0:00 からの時間）。3日前の朝8時なら -PT64H、当日の朝8時なら PT8H。 */
export function icsTriggers(offsets:number[],slot:Reminders['slot']):string[]{
  const h=SLOT_HOUR[slot];
  return offsets.map(o=>{const hours=h-o*24;return hours>=0?`PT${hours}H`:`-PT${-hours}H`;});
}
/** .ics のくり返し（会議）：毎月第N◯曜日／最終◯曜日。 */
export function meetingRrule(m:Reminders['meeting']){
  if(!meetingReady(m))return '';
  const day=['SU','MO','TU','WE','TH','FR','SA'][m.weekday];
  return `FREQ=MONTHLY;BYDAY=${m.week==='last'?'-1':m.week}${day}`;
}
