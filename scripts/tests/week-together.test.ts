/* デスク「今週ふたりでやること」（src/lib/week-together.ts）。見本のデータだけを使う。 */
import {buildWeek,weekRange} from '../../src/lib/week-together';
import {defaultProfile,emptyRecord,type PairEvent,type Task,type TaskRecord} from '../../src/lib/model';

let pass=0,fail=0;
const ok=(name:string,cond:unknown)=>{if(cond){pass++;console.log('OK  ',name);}else{fail++;console.error('FAIL',name);}};

ok('week of a Wednesday = Mon..Sun',JSON.stringify(weekRange('2030-01-09'))===JSON.stringify({start:'2030-01-07',end:'2030-01-13'}));
ok('week of a Sunday ends that Sunday',weekRange('2030-01-13').start==='2030-01-07'&&weekRange('2030-01-13').end==='2030-01-13');
ok('week of a Monday starts that Monday',weekRange('2030-01-07').start==='2030-01-07');

const task=(id:string)=>({id,title:`見本の項目${id}`} as unknown as Task);
const rec=(o:Partial<TaskRecord>):TaskRecord=>({...emptyRecord,...o});
const ev=(id:string,date:string,who:PairEvent['who']):PairEvent=>({id,title:`見本の予定${id}`,date,note:'',who,updatedAt:''});
const w=buildWeek({
  today:'2030-01-09',
  tasks:[task('t1'),task('t2'),task('t3'),task('t4'),task('t5')],
  profile:defaultProfile,
  records:{t1:rec({due:'2030-01-10',assignee:'one'}),t2:rec({due:'2030-01-08',assignee:'together',status:'done'}),t3:rec({due:'2030-01-20'}),t4:rec({due:'2030-01-11',status:'na'}),t5:rec({due:'2030-01-13',assignee:'two'})},
  events:[ev('e1','2030-01-12','female'),ev('e2','2030-01-14','both'),ev('e3','2030-01-07','male')],
  rules:[{date:'2030-01-10',title:'見本の締切'},{date:'2030-02-01',title:'来月の締切'}],
});
const keys=w.items.map(i=>i.key);
ok('only this week; na excluded',JSON.stringify(keys)===JSON.stringify(['event-e3','task-t2','task-t1','rule-2030-01-10-見本の締切','event-e1','task-t5']));
ok('task who from assignee',w.items.find(i=>i.key==='task-t1')?.who==='one'&&w.items.find(i=>i.key==='task-t5')?.who==='two'&&w.items.find(i=>i.key==='task-t2')?.who==='both');
ok('event who from calendar',w.items.find(i=>i.key==='event-e1')?.who==='two'&&w.items.find(i=>i.key==='event-e3')?.who==='one');
ok('rule has no who',w.items.find(i=>i.kind==='rule')?.who==='none');
ok('done flag',w.items.find(i=>i.key==='task-t2')?.done===true);
const sh=Object.fromEntries(w.shares.map(s=>[s.who,s]));
ok('shares count tasks and events per person',sh.both.total===1&&sh.both.done===1&&sh.one.total===1&&sh.one.done===0&&sh.one.events===1&&sh.two.total===1&&sh.two.events===1);
const empty=buildWeek({today:'2030-01-09',tasks:[],profile:defaultProfile,records:{},events:[],rules:[]});
ok('empty week',empty.items.length===0&&empty.shares.every(s=>s.total===0));

console.log(`week-together: ${pass} passed, ${fail} failed`);
if(fail)process.exit(1);
