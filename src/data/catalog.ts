import taskData from './tasks.json';
import groupData from './groups.json';
import sourceData from './sources.json';
import phaseImageData from './phase-images.json';
import deadlinesData from './deadlines.json';
import excludeData from './exclude.json';
import homeData from './home.json';
import phasesData from './phases.json';
import type {Task,Group,Source} from '../lib/model';

export const tasks:Task[]=taskData as Task[];
export const groups:Group[]=groupData as Group[];
export const sources:Record<string,Source>=sourceData as Record<string,Source>;
export const taskById=Object.fromEntries(tasks.map(t=>[t.id,t])) as Record<string,Task>;
export const reviewedOn='2026-09-09';

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

export const homeContent = homeData as {
  hero_numbers: {id:string;label:string;value:string;note?:string}[];
  lies_not_to_buy: {id:string;title:string;truth:string}[];
  talk_lines: {id:string;line:string;from?:string}[];
  anti_lie_banner?: string;
  headline?: string;
};

export const phasesContent = phasesData as {
  as_of: string;
  m0_definition: string;
  phases: {id:string;title:string;range:string;events:{title:string;when:string;money?:string;offset?:string}[]}[];
};
