import taskData from './tasks.json';
import groupData from './groups.json';
import sourceData from './sources.json';
import type {Task,Group,Source} from '../lib/model';
export const tasks:Task[]=taskData as Task[];
export const groups:Group[]=groupData;
export const sources:Record<string,Source>=sourceData as Record<string,Source>;
export const taskById=Object.fromEntries(tasks.map(t=>[t.id,t])) as Record<string,Task>;
export const reviewedOn='2026-09-07';
