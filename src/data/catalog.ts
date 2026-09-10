import taskData from './tasks.json';
import groupData from './groups.json';
import sourceData from './sources.json';
import phaseImageData from './phase-images.json';
import deadlinesData from './deadlines.json';
import excludeData from './exclude.json';
import homeData from './home.json';
import phasesData from './phases.json';
import practiceData from './practices.json';
import talkData from './talks.json';
import agreementData from './agreements.json';
import refData from './refs.json';
import type {Task,Group,Source} from '../lib/model';

export const tasks:Task[]=taskData as Task[];
export const groups:Group[]=groupData as Group[];
export const sources:Record<string,Source>=sourceData as Record<string,Source>;
export const taskById=Object.fromEntries(tasks.map(t=>[t.id,t])) as Record<string,Task>;
export const reviewedOn='2026-09-10';

/** 「ふたり」タブ：考え方と行動・会話例・話し合いの話題・その根拠。 */
export type Practice={id:string,theme:string,idea:string,action:string,when:string,caution:string,refs:string[]};
export type Talk={id:string,scene:string,say:string,listen:string,next:string,caution:string,refs:string[]};
export type Agreement={id:string,topic:string,question:string,refs:string[]};
export type Ref={id:string,kind:string,by:string,title:string,summary:string,limits:string,url:string,checked:string,note?:string};
export const practices:Practice[]=practiceData as Practice[];
export const talks:Talk[]=talkData as Talk[];
export const agreements:Agreement[]=agreementData as Agreement[];
export const refs:Ref[]=refData as Ref[];
export const refById=Object.fromEntries(refs.map(r=>[r.id,r])) as Record<string,Ref>;
export const practiceThemes=[...new Set(practices.map(p=>p.theme))];

export const phaseImages: Record<string, string> = phaseImageData as Record<string, string>;
export function phaseImage(groupId: string){return phaseImages[groupId] || 'phases/lux-filing.png';}

export type AbsoluteDeadline = {
  date: string;
  title: string;
  note?: string | null;
  branch?: string | null;
  money?: {amount_yen: number | null; unit?: string | null} | null;
  urls?: string[];
};
export type RelativeDeadline = {
  offset: string;
  title: string;
  branch?: string | null;
  miss?: string;
  money_in?: {amount_yen: number; unit?: string | null} | null;
  money_out?: {amount_yen: number; unit?: string | null; note?: string} | null;
};

export const absoluteDeadlines = (deadlinesData as {next_absolute: AbsoluteDeadline[]}).next_absolute;
export const relativeDeadlines = (deadlinesData as {relative_always: RelativeDeadline[]}).relative_always;
export const deadlinesMeta = deadlinesData as {as_of: string; timezone: string};

export const excludeItems = (excludeData as {items: {id:string;title:string;why:string;source?:string;hidden_if?:string[]}[]}).items;
export const excludeMeta = excludeData as {description: string};

export type TomorrowAction = {
  id: string;
  title: string;
  detail?: string;
  stamp_id?: string;
  stamp_ids?: string[];
};

export const homeContent = homeData as {
  hero_numbers: {id:string;label:string;value:string;note?:string}[];
  lies_not_to_buy: {id:string;title:string;truth:string}[];
  talk_lines: {id:string;line:string;from?:string}[];
  tomorrow_3_actions: TomorrowAction[];
  anti_lie_banner?: string;
  headline?: string;
};

export const phasesContent = phasesData as {
  as_of: string;
  m0_definition: string;
  phases: {id:string;title:string;range:string;events:{title:string;when:string;money?:string;offset?:string}[]}[];
};
