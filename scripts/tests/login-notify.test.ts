/* 解錠後「開いた」→ LINE（src/lib/login-notify.ts）。本物の中継先にはつながない。 */
import {createLoginNotifier,loginOpenedText,LOGIN_COOLDOWN_MS,LOGIN_SENT_KEY} from '../../src/lib/login-notify';

let pass=0,fail=0;
const ok=(name:string,cond:unknown)=>{if(cond){pass++;console.log('OK  ',name);}else{fail++;console.error('FAIL',name);}};

let clock=2_000_000;
const mem=new Map<string,string>();
const storage={getItem:(k:string)=>mem.get(k)??null,setItem:(k:string,v:string)=>{mem.set(k,v);}};

ok('loginOpenedText is just the sentence',loginOpenedText()==='手帳を開きました');
ok('loginOpenedText has no name (the relay adds 名前：)',!loginOpenedText().includes('さん'));
ok('cooldown is once a day',LOGIN_COOLDOWN_MS===22*60*60*1000);

{
  mem.clear();clock=2_000_000;
  const sent:string[]=[];
  const n=createLoginNotifier({send:()=>{sent.push('x');},canSend:()=>true,now:()=>clock,storage});
  n.opened();n.opened();
  ok('first open sends once; immediate re-open blocked by cooldown',sent.join()==='x'&&mem.get(LOGIN_SENT_KEY)===String(clock));
}

{
  mem.clear();clock=3_000_000;
  const sent:string[]=[];
  let can=false;
  const n=createLoginNotifier({send:()=>{sent.push('a');},canSend:()=>can,now:()=>clock,storage});
  n.opened();
  ok('canSend false → no send',sent.length===0&&!mem.get(LOGIN_SENT_KEY));
  can=true;n.opened();
  ok('retry when canSend becomes true',sent.join()==='a');
}

{
  mem.clear();clock=4_000_000;
  const sent:string[]=[];
  const n1=createLoginNotifier({send:()=>{sent.push('1');},canSend:()=>true,now:()=>clock,storage});
  n1.opened();
  clock+=LOGIN_COOLDOWN_MS-1;
  const n2=createLoginNotifier({send:()=>{sent.push('2');},canSend:()=>true,now:()=>clock,storage});
  n2.opened();
  ok('still in cooldown after remount',sent.join()==='1');
  clock+=1;
  const n3=createLoginNotifier({send:()=>{sent.push('3');},canSend:()=>true,now:()=>clock,storage});
  n3.opened();
  ok('after cooldown sends again',sent.join()==='1,3');
}

{
  mem.clear();clock=5_000_000;
  let threw=false;
  const n=createLoginNotifier({send:()=>{throw new Error('boom');},canSend:()=>true,now:()=>clock,storage});
  try{n.opened();}catch{threw=true;}
  const n2=createLoginNotifier({send:()=>Promise.reject(new Error('net')),canSend:()=>true,now:()=>clock,storage:null});
  try{n2.opened();}catch{threw=true;}
  ok('send throw/reject never escapes',!threw);
}

console.log(`\nlogin-notify tests: ${pass} passed, ${fail} failed`);
if(fail)process.exitCode=1;
