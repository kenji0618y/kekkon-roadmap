'use client';
import {useId,type ReactNode} from 'react';
import {Button} from './ui/button';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from './ui/select';
import {Input} from './ui/input';
import {Label} from './ui/label';
import {ExternalLink,ArrowRight,LoaderCircle,Check} from 'lucide-react';
import type {Source,Status} from '../lib/model';
import {statusNames} from '../lib/model';
import {difference,todayJapan} from '../lib/dates';
export function Choice({label,value,onChange,options,disabled=false}:{label:string,value:string,onChange:(v:string)=>void,options:Record<string,string>,disabled?:boolean}){const id=useId();return <div className="field"><Label htmlFor={id}>{label}</Label><Select value={value} onValueChange={onChange} disabled={disabled}><SelectTrigger id={id} className="field-control"><SelectValue/></SelectTrigger><SelectContent position="popper">{Object.entries(options).map(([v,t])=><SelectItem key={v} value={v}>{t}</SelectItem>)}</SelectContent></Select></div>;}
export function TextField({label,value,onChange,type='text',placeholder='',maxLength=100,required=false}:{label:string,value:string,onChange:(v:string)=>void,type?:string,placeholder?:string,maxLength?:number,required?:boolean}){const id=useId();return <div className="field"><Label htmlFor={id}>{label}</Label><Input id={id} type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} maxLength={maxLength} required={required} min={type==='date'?'1900-01-01':undefined} max={type==='date'?'2100-12-31':undefined}/></div>;}
export function Action({children,onClick,disabled=false,secondary=false,className='',type='button'}:{children:ReactNode,onClick?:()=>void,disabled?:boolean,secondary?:boolean,className?:string,type?:'button'|'submit'}){return <Button type={type} onClick={onClick} disabled={disabled} variant={secondary?'outline':'default'} className={`action ${secondary?'secondary':''} ${className}`}>{children}</Button>;}
export function SaveAction({busy,children='保存する',onClick,disabled=false}:{busy:boolean,children?:ReactNode,onClick?:()=>void,disabled?:boolean}){return <Action onClick={onClick} disabled={busy||disabled}>{busy?<LoaderCircle className="spin"/>:<Check/>}{busy?'保存しています…':children}</Action>;}
export function StatusMark({status='todo'}:{status?:Status}){return <span className={`status status-${status}`}>{status==='done'&&<Check size={12}/>} {statusNames[status]}</span>;}
export function SourceLink({source:s,compact=false}:{source:Source,compact?:boolean}){const stale=s.checked&&difference(todayJapan(),s.checked)>30;return <div className={`source-link ${compact?'compact':''}`}>
 {s.url?<a href={s.url} target="_blank" rel="noreferrer noopener">{s.title}<ExternalLink size={14}/></a>:<strong>{s.title}</strong>}
 <span>{s.kind==='document'?'勤務先・契約先で確認':s.kind==='planning'?'話し合いの提案':s.checked?`内容確認 ${s.checked}${stale?' · 更新の有無を再確認':''}`:'内容の最新確認は未実施'}</span>{!compact&&s.note&&<p>{s.note}</p>}
 </div>;}
export function SectionTitle({eyebrow,title,sub,children}:{eyebrow:string,title:string,sub?:string,children?:ReactNode}){return <div className="section-title"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{sub&&<p className="muted">{sub}</p>}</div>{children}</div>;}
export function EmptyState({symbol,title,children,action}:{symbol:ReactNode,title:string,children:ReactNode,action?:ReactNode}){return <div className="empty-state"><span className="empty-icon">{symbol}</span><h3>{title}</h3><p>{children}</p>{action}</div>;}
export function NextArrow(){return <ArrowRight size={18}/>;}
export function downloadText(name:string,text:string,type='application/json'){const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);}
