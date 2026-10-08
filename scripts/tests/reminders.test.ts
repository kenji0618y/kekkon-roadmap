/* 期限と記念日の LINE お知らせ・月に一度のふたり会議（book.reminders）。カレンダーにのるものから作ること。見本のデータだけを使う。 */
import {bookSchema,emptyBook,emptyReminders,defaultProfile,emptyRecord,type Reminders,type Task,type PairEvent} from '../../src/lib/model';
import {mergeBooks} from '../../src/lib/book-merge';
import {calendarItems,icsTriggers,meetingDateIn,meetingDates,meetingRrule,payloadKey,remindOffsets,remindersPayload,reminderText,nextReminder,REMIND_MAX_ITEMS} from '../../src/lib/reminders';
import {calendarFile} from '../../src/lib/dates';
import {remindersResultText} from '../../src/lib/line-notify';

let pass=0,fail=0;
const ok=(name:string,cond:unknown)=>{if(cond){pass++;console.log('OK  ',name);}else{fail++;console.error('FAIL',name);}};
const R=(p:Partial<Reminders>={}):Reminders=>({...emptyReminders,...p,kinds:{...emptyReminders.kinds,...(p.kinds||{})},meeting:{...emptyReminders.meeting,...(p.meeting||{})}});

// 手帳
const old=JSON.parse(JSON.stringify(emptyBook));delete old.reminders;
ok('old book without reminders parses (off by default)',bookSchema.parse(old).reminders.on===false&&bookSchema.parse(old).reminders.meeting.week==='');
ok('bad values fall back',(r=>r.slot==='morning'&&r.meeting.weekday===-1)(bookSchema.parse({...old,reminders:{on:true,slot:'zz',meeting:{weekday:9}}}).reminders));
const pb=bookSchema.parse(old);
const A={...pb,reminders:R({on:true,updatedAt:'2030-01-01T00:00:00.000Z'})},B={...pb,reminders:R({on:false,slot:'night',updatedAt:'2030-01-02T00:00:00.000Z'})};
ok('sync: newer settings win (either order)',mergeBooks(A,B).reminders.slot==='night'&&mergeBooks(B,A).reminders.slot==='night');

// 会議の日（2030年1月1日は火曜）
const m=(week:Reminders['meeting']['week'],weekday:number)=>({...emptyReminders.meeting,week,weekday});
ok('first Sunday of 2030-01 is 01-06',meetingDateIn(2030,1,m('1',0))==='2030-01-06');
ok('third Wednesday of 2030-01 is 01-16',meetingDateIn(2030,1,m('3',3))==='2030-01-16');
ok('last Friday of 2030-01 is 01-25',meetingDateIn(2030,1,m('last',5))==='2030-01-25');
ok('meeting dates across months',meetingDates(m('1',0),'2030-01-07','2030-03-10').join()==='2030-02-03,2030-03-03');
ok('no meeting until week+weekday are set',meetingDates(m('',0),'2030-01-01','2030-12-31').length===0&&meetingDates(m('1',-1),'2030-01-01','2030-12-31').length===0);

// カレンダーにのるもの
const tasks=[{id:'T1',title:'見本の項目'},{id:'T2',title:'済んだ項目'}] as unknown as Task[];
const records={T1:{...emptyRecord,due:'2030-01-05',assignee:'one' as const},T2:{...emptyRecord,due:'2030-01-05',status:'done' as const}};
const events:PairEvent[]=[{id:'e1',title:'見本の予定',date:'2030-01-03',note:'',who:'female',updatedAt:''}];
const profile={...defaultProfile,wdate:'2028-01-10'};
const reminders=R({on:true,meeting:{on:true,week:'1',weekday:0,before3:true,sameDay:true}});
const items=calendarItems({from:'2030-01-01',to:'2030-02-05',profile,tasks,records,events,rules:[{date:'2030-01-04',title:'見本の締切'}],reminders});
const kinds=items.map(i=>i.kind);
ok('rule, task, event, anniversary and meeting are all on the calendar',['rule','task','event','anniv','meeting'].every(k=>kinds.includes(k as never)));
ok('done items are not reminded',!items.some(i=>i.taskId==='T2'));
ok('event added in the calendar is included automatically (with who)',items.some(i=>i.kind==='event'&&i.title==='見本の予定'&&i.who==='two'));
ok('wedding anniversary from the profile date',items.some(i=>i.kind==='anniv'&&i.date==='2030-01-10'&&i.title==='結婚記念日'));
ok('meeting appears as a recurring entry (2 in range)',items.filter(i=>i.kind==='meeting').map(i=>i.date).join()==='2030-01-06,2030-02-03');

// 何日前に知らせるか
ok('offsets: 3日前・当日',remindOffsets('rule',reminders).join()==='3,0');
ok('offsets: kind off → none',remindOffsets('task',R({on:true,kinds:{task:false} as Reminders['kinds']})).length===0);
ok('offsets: reminders off → none (but meeting has its own switch)',remindOffsets('event',R({on:false})).length===0&&remindOffsets('meeting',R({on:false,meeting:{on:true,week:'2',weekday:1,before3:false,sameDay:true}})).join()==='0');

// 中継先へ渡す一覧
const names={n1:'一人目',n2:'二人目'};
const off=remindersPayload({secret:'x',today:'2030-01-01',reminders:R({on:false}),items,names});
ok('off → on:false with an empty list (clears the relay)',off.on===false&&off.items.length===0);
const on=remindersPayload({secret:'x',today:'2030-01-01',reminders,items,names});
ok('on → minimal list: title/date/kind/who/offsets only',on.items.every(i=>Object.keys(i).sort().join()==='d,k,o,t,w'));
ok('window is the next 35 days',on.items.every(i=>i.d>='2030-01-01'&&i.d<='2030-02-05'));
const big=remindersPayload({secret:'x',today:'2030-01-01',reminders,items:Array.from({length:80},(_,i)=>({key:`k${i}`,date:'2030-01-09',title:'あ'.repeat(50),kind:'event' as const,who:'both' as const})),names});
ok('at most 40 items, titles clipped to 30',big.items.length===REMIND_MAX_ITEMS&&big.items.every(i=>Array.from(i.t).length<=30));
ok('payload key does not contain the secret',!payloadKey({...on,secret:'secret-should-not-appear'}).includes('secret-should-not-appear'));

// 1日1通にまとめる
const t1=reminderText(on.items,'2030-01-03',on.names,'');
ok('one message per day combining everything',t1.split('\n')[0]==='【Amityちゃん】今日のお知らせ'&&t1.includes('・今日：見本の予定（二人目）')&&t1.includes('・3日後（1月6日（日））：月に一度のふたり会議'));
ok('nothing due → no message',reminderText(on.items,'2030-01-08',on.names,'')==='');
ok('next reminder found',nextReminder(on,'2030-01-08','')?.date==='2030-01-10');

// .ics
ok('ics triggers: morning 3日前=-PT64H, 当日=PT8H; night 3日前=-PT52H',icsTriggers([3,0],'morning').join()==='-PT64H,PT8H'&&icsTriggers([3],'night').join()==='-PT52H');
ok('meeting rrule',meetingRrule(m('1',0))==='FREQ=MONTHLY;BYDAY=1SU'&&meetingRrule(m('last',5))==='FREQ=MONTHLY;BYDAY=-1FR'&&meetingRrule(m('',5))==='');
const ics=calendarFile([
  {id:'futari-meeting',title:'月に一度のふたり会議',summary:'【ふたり会議】月に一度のふたり会議',rrule:'FREQ=MONTHLY;BYDAY=1SU',triggers:icsTriggers([3,0],'morning'),deadline:{date:'2030-01-06',label:'',basis:'見本',kind:'personal',uncertain:false}},
  {id:'x',title:'見本の予定',deadline:{date:'2030-01-03',label:'',basis:'見本',kind:'personal',uncertain:false}},
  {id:'y',title:'見本のなし',triggers:[],deadline:{date:'2030-01-04',label:'',basis:'見本',kind:'personal',uncertain:false}},
],'20300101T000000Z');
ok('ics: meeting is a monthly recurring event with the reminder alarms',ics.includes('RRULE:FREQ=MONTHLY;BYDAY=1SU')&&ics.includes('TRIGGER:-PT64H')&&ics.includes('TRIGGER:PT8H')&&ics.includes('SUMMARY:【ふたり会議】月に一度のふたり会議'));
ok('ics: default alarm stays 3 days before; [] = none',(ics.match(/TRIGGER:-P3D/g)||[]).length===1&&(ics.match(/BEGIN:VALARM/g)||[]).length===3);

// 古い中継先
ok('old relay (unknown kind) → gentle message, settings kept',remindersResultText({ok:false,error:'unknown'}).state==='old-relay');
ok('relay ok',remindersResultText({ok:true}).state==='ok');

console.log(`reminders: ${pass} passed, ${fail} failed`);
if(fail)process.exit(1);
