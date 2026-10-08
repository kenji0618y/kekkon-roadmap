/* ロードマップの「済」→ LINE 通知（src/lib/stamp-notify.ts）の node テスト。時計とタイマーはまね。本物の中継先にはつながない。 */
import {becameDone,createStampNotifier,stampDoneText,STAMP_HOLD_MS,STAMP_COOLDOWN_MS,STAMP_SENT_KEY} from '../../src/lib/stamp-notify';
import {boardPayload} from '../../src/lib/line-notify';

let pass=0,fail=0;
const ok=(name:string,cond:unknown)=>{if(cond){pass++;console.log('OK  ',name);}else{fail++;console.error('FAIL',name);}};

// まねの時計とタイマー
let clock=1_000_000;
type T={at:number,fn:()=>void,id:number};
let timers:T[]=[],seq=0;
const setTimer=(fn:()=>void,ms:number)=>{const t={at:clock+ms,fn,id:++seq};timers.push(t);return t.id;};
const clearTimer=(h:unknown)=>{timers=timers.filter(t=>t.id!==h);};
const advance=(ms:number)=>{const end=clock+ms;for(;;){timers.sort((a,b)=>a.at-b.at);const t=timers[0];if(!t||t.at>end)break;timers.shift();clock=t.at;t.fn();}clock=end;};
const mem=new Map<string,string>();
const storage={getItem:(k:string)=>mem.get(k)??null,setItem:(k:string,v:string)=>{mem.set(k,v);}};

function setup(){
  timers=[];mem.clear();
  const done=new Set<string>();const sent:string[]=[];
  const n=createStampNotifier({send:id=>{sent.push(id);},isStillDone:id=>done.has(id),now:()=>clock,setTimer,clearTimer,storage});
  // 画面の操作をまねる：押して済にした／取り消した
  const stamp=(id:string)=>{done.add(id);n.stamped(id);};
  const undo=(id:string)=>{done.delete(id);n.unstamped(id);};
  return {n,done,sent,stamp,undo};
}

ok('becameDone: only not-done → done',becameDone(undefined,'done')&&becameDone('learned','done')&&!becameDone('done','done')&&!becameDone('done','learned')&&!becameDone('learned','preparing'));

{const s=setup();s.stamp('A1');ok('stamp: nothing sent immediately (stamp never waits on network)',s.sent.length===0&&s.n.pending().includes('A1'));
 advance(STAMP_HOLD_MS-1);ok('stamp: still waiting just before hold',s.sent.length===0);
 advance(1);ok('stamp: sent once after hold',s.sent.join()==='A1');
 advance(60_000);ok('stamp: no repeat',s.sent.length===1);}

{const s=setup();s.stamp('A1');advance(2000);s.undo('A1');advance(STAMP_HOLD_MS*3);ok('stamp then undo within hold → no send',s.sent.length===0&&s.n.pending().length===0);}

{const s=setup();for(let i=0;i<5;i++){s.stamp('A1');advance(1000);s.undo('A1');advance(500);}s.stamp('A1');advance(STAMP_HOLD_MS);ok('rapid stamp/undo x5 then stamp → exactly 1 send',s.sent.length===1);}

{const s=setup();s.stamp('A1');advance(STAMP_HOLD_MS);s.undo('A1');advance(1000);s.stamp('A1');advance(STAMP_HOLD_MS);ok('stamp→sent→undo→stamp within cooldown → still 1 send',s.sent.length===1);
 advance(STAMP_COOLDOWN_MS);s.undo('A1');s.stamp('A1');advance(STAMP_HOLD_MS);ok('after cooldown, stamping again sends again',s.sent.length===2);}

{const s=setup();s.stamp('A1');advance(1000);s.stamp('A1');advance(STAMP_HOLD_MS-1);ok('re-stamp restarts hold',s.sent.length===0);advance(1);ok('re-stamp → one send',s.sent.length===1);}

{const s=setup();s.stamp('A1');s.stamp('B2');advance(STAMP_HOLD_MS);ok('different tasks each send once',s.sent.slice().sort().join()==='A1,B2');}

{const s=setup();s.stamp('A1');advance(1000);s.done.delete('A1');/* 同期で相手が取り消した */advance(STAMP_HOLD_MS);ok('undone by sync during hold → no send (checked before sending)',s.sent.length===0);}

{const s=setup();s.done.add('S1');/* 同期・読み込みで済になった：stamped() は呼ばれない */advance(STAMP_HOLD_MS*2);ok('stamps arriving via sync / load never send',s.sent.length===0);}

{const s=setup();s.stamp('A1');advance(STAMP_HOLD_MS);ok('cooldown remembered in storage',JSON.parse(mem.get(STAMP_SENT_KEY)||'{}').A1===clock);
 // 再読み込み後（新しい notifier）でも30分以内は送らない
 const sent2:string[]=[];const n2=createStampNotifier({send:id=>{sent2.push(id);},isStillDone:()=>true,now:()=>clock,setTimer,clearTimer,storage});
 n2.stamped('A1');advance(STAMP_HOLD_MS);ok('cooldown survives reload',sent2.length===0);}

{const s=setup();const n=createStampNotifier({send:()=>{throw new Error('boom');},isStillDone:()=>true,now:()=>clock,setTimer,clearTimer,storage});
 let threw=false;try{n.stamped('X');advance(STAMP_HOLD_MS);}catch{threw=true;}
 const n3=createStampNotifier({send:()=>Promise.reject(new Error('net')),isStillDone:()=>true,now:()=>clock,setTimer,clearTimer,storage:null});
 try{n3.stamped('Y');advance(STAMP_HOLD_MS);}catch{threw=true;}
 ok('send throwing / rejecting never throws to the stamp',!threw&&s.sent.length===0);}

// 本文
const txt=stampDoneText('婚姻届を出す');
ok('text: 「『婚姻届を出す』を済にしました」',txt==='『婚姻届を出す』を済にしました');
ok('text has no name (the relay adds 名前：)',!txt.includes('さん'));
const long=stampDoneText('い'.repeat(800));
ok('text: ≤500 chars, title ellipsized',Array.from(long).length===500&&long.startsWith('『')&&long.endsWith('…』を済にしました'));
const p=boardPayload('s'.repeat(64),'n2','二人目',stampDoneText('転入届'));
ok('payload: kind board, from 2, name/text',p.kind==='board'&&p.from===2&&p.name==='二人目'&&p.text==='『転入届』を済にしました');
// 中継先は「名前：本文」を40文字で切る。いちばん長い項目名でも切れないこと。
ok('longest real title still fits the relay preview',Array.from('一人目：'+stampDoneText('あ'.repeat(23))).length<=44);
ok('no "Lean" / 男 / 女 in text',!/Lean|男|女/.test(txt));

await Promise.resolve();
console.log(`\nstamp-notify: ${pass} passed, ${fail} failed`);
process.exitCode=fail?1:0;
