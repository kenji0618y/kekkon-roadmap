import {useEffect,useState} from 'react';
import {ExternalLink,Wallet} from 'lucide-react';
import {Label} from './ui/label';
import {Input} from './ui/input';
import {Textarea} from './ui/textarea';
import {SaveAction} from './book-controls';
import {shortDate,validDate} from '../lib/dates';
import type {HouseholdSplit} from '../lib/model';
import data from '../data/household-patterns.json';

type PatternId=HouseholdSplit['pattern'];
export const householdPatterns=data.patterns as {id:Exclude<PatternId,''>,name:string,suits:string}[];
export const householdSource=data.source;

/** お金タブ「家計の分け方」（2026-10-09 に博士タブから移動）。ゼクシィの記事の5つの型から1つ選び、ふたりの合意として残す（同期でそろう）。 */
export function HouseholdSplitCard({value,busy,onSave}:{value:HouseholdSplit,busy?:boolean,onSave:(patch:Partial<HouseholdSplit>)=>Promise<boolean>}){
  const [pattern,setPattern]=useState<PatternId>(value.pattern);
  const [note,setNote]=useState(value.note);
  const [review,setReview]=useState(value.review);
  useEffect(()=>{setPattern(value.pattern);setNote(value.note);setReview(value.review);},[value.updatedAt]);
  const dirty=pattern!==value.pattern||note!==value.note||review!==value.review;
  const chosen=householdPatterns.find(p=>p.id===value.pattern);
  return <section id="pair-household" className="paper-card household-card" aria-label="家計の分け方">
    <p className="eyebrow">ふたりの合意</p>
    <h2><Wallet size={19} aria-hidden/>家計の分け方</h2>
    <p className="household-lead">5つの型から1つ選びます。</p>
    {chosen&&<p className="household-now" role="status">いまの合意：{chosen.name}{value.review&&validDate(value.review)?` · 見直す日 ${shortDate(value.review)}`:''}</p>}
    <div className="household-list" role="radiogroup" aria-label="家計の分け方の型">
      {householdPatterns.map((p,i)=><button key={p.id} type="button" role="radio" aria-checked={pattern===p.id} className={`household-option${pattern===p.id?' is-on':''}`} disabled={busy} onClick={()=>setPattern(pattern===p.id?'':p.id)}>
        <span className="household-dot" aria-hidden/>
        <span><b>【{i+1}】{p.name}</b><small>{p.suits}</small></span>
      </button>)}
    </div>
    <div className="field household-field"><Label htmlFor="household-note">ふたりの決めごと（自由に）</Label>
      <Textarea id="household-note" rows={3} maxLength={2000} value={note} onChange={e=>setNote(e.target.value)} placeholder="例：使う口座、見直すきっかけ など（金額は入れたいときだけ）" disabled={busy}/></div>
    <div className="field household-field"><Label htmlFor="household-review">見直す日</Label>
      <Input id="household-review" type="date" value={review} onChange={e=>setReview(e.target.value)} disabled={busy}/></div>
    <SaveAction busy={!!busy} disabled={!dirty} onClick={()=>void onSave({pattern,note:note.slice(0,2000),review:validDate(review)?review:''})}>ふたりの合意として残す</SaveAction>
    <p className="household-src">出典：{householdSource.publisher}「{householdSource.title}」（監修：{householdSource.supervisor}・{householdSource.note}）<br/><a href={householdSource.url} target="_blank" rel="noreferrer noopener">{householdSource.url}<ExternalLink size={11} aria-hidden/></a></p>
  </section>;
}
