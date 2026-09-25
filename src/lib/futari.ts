/** 「ふたり」タブ：今日の一問・レッスン・困ったとき・ふたり会議のデータと、日付／年ごとのモード計算。 */
import cardData from '../data/futari-cards.json';
import lessonData from '../data/futari-lessons.json';
import guideData from '../data/futari-guide.json';
import sourceData from '../data/gottman-sources.json';
import {difference,plusDays} from './dates';
import {emptyFutari,type Futari,type FutariAnswer,type FutariDay,type FutariMode} from './model';

export type GSource={id:string,kind:'book'|'web',title:string,short:string,url:string,note?:string};
export type DayKey='mon'|'tue'|'wed'|'thu'|'fri'|'sat'|'sun';
export type FutariCard={id:string,question:string,hint:string,concept:string,point:string,sourceIds:string[],days:DayKey[]};
export type WeekTheme={day:DayKey,label:string,theme:string,sub:string,sourceIds:string[]};
export type LessonLine={say:string,caption:string};
export type Lesson={id:string,title:string,duration:string,topic:string,summary:string,lines:LessonLine[],sourceIds:string[],video?:string,poster?:string};
export type LessonTopic={id:string,title:string,point:string,sourceIds:string[],lessonId?:string};

export const gSources=(sourceData as {sources:GSource[]}).sources;
export const gSourceById:Record<string,GSource>=Object.fromEntries(gSources.map(s=>[s.id,s]));
/** AIが出典として返してよいID（固定。これ以外は表示しない）。 */
export const AI_ALLOWED_SOURCE_IDS:readonly string[]=Object.freeze([...(sourceData as {ai_allowed:string[]}).ai_allowed]);

export const futariCards=(cardData as unknown as {cards:FutariCard[]}).cards;
export const futariHow=(cardData as {how:string[]}).how;
export const weekThemes=(cardData as unknown as {week:WeekTheme[]}).week;
export const yearModes=(cardData as {years:{mode:string,label:string,title:string,text:string}[]}).years;
export const yearsSourceIds=(cardData as {yearsSourceIds:string[]}).yearsSourceIds;
export const cardById:Record<string,FutariCard>=Object.fromEntries(futariCards.map(c=>[c.id,c]));

export const lessons=(lessonData as {lessons:Lesson[]}).lessons;
export const lessonTopics=(lessonData as {topics:LessonTopic[]}).topics;
export const lessonPace=(lessonData as {pace:{label:string,title:string,text:string}[]}).pace;

export type TroubleStep={title:string,text:string,examples?:string[],choices?:{label:string,minutes:number}[],sourceIds:string[]};
export const guide=guideData as unknown as {
  trouble:{title:string,lead:string,defaultSignal:string,signalNote:string,steps:TroubleStep[],heartNote:string,heartSourceIds:string[]},
  rephrase:{horseman:string,bad:string,good:string,antidote:string,sourceIds:string[]}[],
  practicePrompt:string,
  meeting:{title:string,day:DayKey,steps:{text:string,note?:string}[],timeNote:string,sourceIds:string[]},
  feedbackRules:{id:string,pattern:string,concept:string,direction:string,example:string,sourceIds:string[]}[],
};

const DAY_KEYS:DayKey[]=['sun','mon','tue','wed','thu','fri','sat'];
export function dayKeyOf(date:string):DayKey{return DAY_KEYS[new Date(date+'T00:00:00Z').getUTCDay()];}
/** その日を含む週の月曜〜日曜。 */
export function weekOf(date:string):string[]{
  const wd=new Date(date+'T00:00:00Z').getUTCDay();
  const monday=plusDays(date,-((wd+6)%7));
  return Array.from({length:7},(_,i)=>plusDays(monday,i));
}
/** 週の番号（1970-01-05 の月曜から）。曜日ごとのカードを週替わりで回す。 */
function weekIndex(date:string){return Math.floor(difference(date,'1970-01-05')/7);}

/** その日のカード。日曜はふたり会議の日なのでカードなし。すでに答えた日は、その日のカードを使う。 */
export function cardFor(date:string,futari:Futari):FutariCard|null{
  const saved=futari.days[date];
  if(saved&&cardById[saved.cardId])return cardById[saved.cardId];
  const key=dayKeyOf(date);
  if(key==='sun')return null;
  const pool=futariCards.filter(c=>c.days.includes(key));
  const list=pool.length?pool:futariCards;
  const n=((weekIndex(date)%list.length)+list.length)%list.length;
  return list[n];
}

/** 何年目か（0始まり）。始めた日から365日ごと。 */
export function yearIndex(date:string,futari:Futari){
  if(!futari.startedAt)return 0;
  return Math.max(0,Math.floor(difference(date,futari.startedAt)/365));
}
export function modeFor(date:string,futari:Futari):FutariMode{
  const saved=futari.days[date];
  if(saved)return saved.mode;
  if(futari.modeOverride!=='auto')return futari.modeOverride;
  return (['answer','compare','guess'] as const)[yearIndex(date,futari)%3];
}
export const modeLabel:Record<FutariMode,string>={answer:'ふつうに答える',compare:'去年と比べる',guess:'予想してから答える'};

/** 同じカードに、およそ1年前（300日以上前でいちばん365日前に近い日）に答えた記録。 */
export function lastYearEntry(date:string,cardId:string,futari:Futari):{date:string,day:FutariDay}|null{
  let best:{date:string,day:FutariDay}|null=null;let bestGap=Infinity;
  for(const [d,day] of Object.entries(futari.days)){
    if(day.cardId!==cardId)continue;
    const ago=difference(date,d);
    if(ago<300)continue;
    const gap=Math.abs(ago-365);
    if(gap<bestGap){best={date:d,day};bestGap=gap;}
  }
  return best;
}

export type Who='n1'|'n2';
export const other=(w:Who):Who=>(w==='n1'?'n2':'n1');
export function answered(a:FutariAnswer|null|undefined){return !!a&&!!a.text.trim();}

const ME_KEY='futari-me-v1';
export function readMe():Who|''{try{const v=localStorage.getItem(ME_KEY);return v==='n1'||v==='n2'?v:'';}catch{return '';}}
export function writeMe(w:Who){try{localStorage.setItem(ME_KEY,w);}catch{/* ignore */}}

/** 2台の端末で同時に答えても消えないよう、ふたりの一問だけは項目ごとに合わせる（新しい方を残す）。 */
function newer<T extends {at:string}>(a:T|null|undefined,b:T|null|undefined):T|null{
  if(!a)return b||null;
  if(!b)return a;
  return (b.at||'')>(a.at||'')?b:a;
}
export function mergeFutari(local:Futari|undefined,remote:Futari|undefined):Futari{
  const l=local||emptyFutari,r=remote||emptyFutari;
  const days:Futari['days']={};
  for(const k of new Set([...Object.keys(l.days),...Object.keys(r.days)])){
    const a=l.days[k],b=r.days[k];
    if(!a){days[k]=b;continue;}
    if(!b){days[k]=a;continue;}
    const n1=newer(a.n1,b.n1),n2=newer(a.n2,b.n2);
    const base=firstAt(a)<=firstAt(b)?a:b;
    days[k]={cardId:base.cardId,mode:base.mode,n1,n2};
  }
  const meetings:Futari['meetings']={};
  for(const k of new Set([...Object.keys(l.meetings),...Object.keys(r.meetings)])){
    meetings[k]=newer(l.meetings[k],r.meetings[k])!;
  }
  const starts=[l.startedAt,r.startedAt].filter(Boolean).sort();
  const settings=(r.settingsAt||'')>(l.settingsAt||'')?r:l;
  return {startedAt:starts[0]||'',modeOverride:settings.modeOverride,signal:settings.signal,settingsAt:settings.settingsAt,days,meetings};
}
function firstAt(d:FutariDay){return [d.n1?.at,d.n2?.at].filter(Boolean).sort()[0]||'9999';}
function stable(v:unknown):string{
  if(v===null||typeof v!=='object')return JSON.stringify(v);
  if(Array.isArray(v))return `[${v.map(stable).join(',')}]`;
  return `{${Object.keys(v as object).sort().map(k=>`${JSON.stringify(k)}:${stable((v as Record<string,unknown>)[k])}`).join(',')}}`;
}
export function sameFutari(a:Futari|undefined,b:Futari|undefined){return stable(a||emptyFutari)===stable(b||emptyFutari);}
