import type {Book,Profile,Task,TaskRecord} from './model';
export const dayMs=86400000;
export function validDate(v:string){if(!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;const d=new Date(v+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===v;}
export function todayJapan(){return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
export function plusDays(date:string,days:number){if(!validDate(date))return '';return new Date(new Date(date+'T00:00:00Z').getTime()+days*dayMs).toISOString().slice(0,10);}
export function difference(a:string,b:string){return Math.round((new Date(a+'T00:00:00Z').getTime()-new Date(b+'T00:00:00Z').getTime())/dayMs);}
export function plusYears(date:string,years:number){if(!validDate(date))return '';const [y,m,d]=date.split('-').map(Number);const last=new Date(Date.UTC(y+years,m,0)).getUTCDate();return `${y+years}-${String(m).padStart(2,'0')}-${String(Math.min(d,last)).padStart(2,'0')}`;}
const holidays=new Set(['2026-01-01','2026-01-12','2026-02-11','2026-02-23','2026-03-20','2026-04-29','2026-05-03','2026-05-04','2026-05-05','2026-05-06','2026-07-20','2026-08-11','2026-09-21','2026-09-22','2026-09-23','2026-10-12','2026-11-03','2026-11-23','2027-01-01','2027-01-11','2027-02-11','2027-02-23','2027-03-21','2027-03-22','2027-04-29','2027-05-03','2027-05-04','2027-05-05','2027-07-19','2027-08-11','2027-09-20','2027-09-23','2027-10-11','2027-11-03','2027-11-23']);
export function nextOfficeDay(v:string){if(!validDate(v))return {date:'',known:false};let date=v;for(let i=0;i<20;i++){if(!['2026','2027'].includes(date.slice(0,4)))return {date:v,known:false};const weekday=new Date(date+'T00:00:00Z').getUTCDay();const md=date.slice(5);if(weekday!==0&&weekday!==6&&!holidays.has(date)&&!(md>='12-29'||md<='01-03'))return {date,known:true};date=plusDays(date,1);}return {date:v,known:false};}
export type Deadline={date:string,label:string,basis:string,kind:'rule'|'personal',uncertain:boolean,missing?:string};
export function statutoryDeadline(t:Task,p:Profile):Deadline|null{
 const rule=t.rule;if(!rule)return null;
 let anchor='',days=0,label='',missing='',holiday=false;
 if(rule==='move14'){anchor=p.movedate;days=14;label='転入・転居の届出';missing='実際に住み始めた日';}
 if(rule==='card90'){anchor=p.reported;days=90;label='カード継続利用';missing='転入届を出した日';}
 if(rule==='birth14'){anchor=p.birthdate;days=13;label='出生届';missing='実際の出生日';holiday=true;}
 if(rule==='allowance15'){anchor=p.birthdate;days=15;label='児童手当の申請';missing='実際の出生日';}
 if(rule==='car15'){anchor=[p.carNameDate,p.carAddressDate].filter(Boolean).sort()[0]||'';days=15;label='普通車の変更登録';missing='氏名・住所が変わった日';}
 if(rule==='property2'){anchor=p.propertydate;label='不動産の変更登記';missing='最も早い未登記の変更日';}
 if(!validDate(anchor))return {date:'',label,basis:`${missing}を設定すると計算できます。`,kind:'rule',uncertain:true,missing};
 let date=rule==='property2'?(anchor<'2026-04-01'?'2028-03-31':plusYears(anchor,2)):plusDays(anchor,days);
 let basis=rule==='birth14'?'出生日を含めて14日以内。':rule==='property2'?(anchor<'2026-04-01'?'2026年4月より前の変更の経過措置。':'変更日から暦で2年以内。'):rule==='card90'?'転入届を出した日から90日。カードの有効状態等も確認。':rule==='car15'?'入力された未手続きの変更日のうち、早い日から15日。':`${missing}の翌日から${days}日以内。`;
 let uncertain=true;
 if(holiday){const adjusted=nextOfficeDay(date);uncertain=!adjusted.known;if(adjusted.date!==date)basis+=` 原則日${date}が閉庁日のため、次の開庁日を表示。`;date=adjusted.date;}
 if(uncertain)basis+=' 休日・例外・窓口の取扱いを確認してください。';
 return {date,label,basis,kind:'rule',uncertain};
}
export function taskDeadlines(t:Task,p:Profile,r?:TaskRecord){const rows:Deadline[]=[];const legal=statutoryDeadline(t,p);if(legal)rows.push(legal);if(r?.due)rows.push({date:r.due,label:'二人で決めた予定',basis:'自分で設定した予定です。法定期限は別に確認してください。',kind:'personal',uncertain:false});return rows;}
export function nearestDeadline(t:Task,p:Profile,r?:TaskRecord){return taskDeadlines(t,p,r).filter(d=>d.date).sort((a,b)=>a.date.localeCompare(b.date))[0];}
export function shortDate(v:string){if(!validDate(v))return '未設定';const [y,m,d]=v.split('-');return `${y}年${Number(m)}月${Number(d)}日`;}
export function monthDay(v:string){if(!validDate(v))return '日付未設定';const [,m,d]=v.split('-');return `${Number(m)}/${Number(d)}`;}
export function deadlineText(v:string,today=todayJapan()){const days=difference(v,today);return days<0?`${-days}日経過・状況を確認`:days===0?'今日':`あと${days}日`;}
export function moneyTotals(book:Book){const totals={received:0,estimate:0,monthlySaving:0,taxEstimate:0};for(const r of Object.values(book.records)){if(r.status==='na'||r.amount===null||r.moneyKind==='none')continue;totals[r.moneyKind]+=r.amount;}return totals;}
export function formatMoney(v:number){return new Intl.NumberFormat('ja-JP').format(v);}
function icsEscape(s:string){return s.replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');}
function foldIcs(line:string){let out='',part='',bytes=0;for(const c of line){const n=new TextEncoder().encode(c).length;if(bytes+n>73){out+=part+'\r\n ';part='';bytes=1;}part+=c;bytes+=n;}return out+part;}
export function calendarFile(entries:{task:Task,deadline:Deadline}[],generated=todayJapan()){
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Futari Miraicho//Hiroshima//JA','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:ふたりの未来帖'];
 for(const {task,deadline:d} of entries){if(!validDate(d.date))continue;lines.push('BEGIN:VEVENT',`UID:${encodeURIComponent(task.id)}-${d.kind}-${d.date}@futari-miraicho`,`DTSTAMP:${generated.replace(/-/g,'')}T000000Z`,`DTSTART;VALUE=DATE:${d.date.replace(/-/g,'')}`,`DTEND;VALUE=DATE:${plusDays(d.date,1).replace(/-/g,'')}`,`SUMMARY:${icsEscape(`【${d.kind==='personal'?'予定':'期限の確認'}】${task.title}`)}`,`DESCRIPTION:${icsEscape(d.basis+'\n公式案内で最新条件を確認してください。')}`,'BEGIN:VALARM','TRIGGER:-P3D','ACTION:DISPLAY','DESCRIPTION:ふたりの未来帖の予定','END:VALARM','END:VEVENT');}
 lines.push('END:VCALENDAR');return lines.map(foldIcs).join('\r\n')+'\r\n';
}
