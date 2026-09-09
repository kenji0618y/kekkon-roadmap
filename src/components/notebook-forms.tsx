import {useEffect,useState} from 'react';
import {toast} from 'sonner';
import {AlertTriangle,ArrowUpRight,BookOpen,CalendarDays,Check,ClipboardCopy,Clock3,Heart,HelpCircle,Info,ShieldCheck,Sparkles,Wallet} from 'lucide-react';
import {Accordion,AccordionContent,AccordionItem,AccordionTrigger} from './ui/accordion';
import {Textarea} from './ui/textarea';
import {Checkbox} from './ui/checkbox';
import {Label} from './ui/label';
import {Input} from './ui/input';
import {Action,Choice,SaveAction,SourceLink,StatusMark,TextField} from './book-controls';
import {eligibilityLabels,eligibilityNote,emptyRecord,memorySchema,profileSchema,recordSchema,statusNames,type Memory,type Profile,type Task,type TaskRecord} from '../lib/model';
import {sources} from '../data/catalog';
import {formatMoney,shortDate,statutoryDeadline,todayJapan} from '../lib/dates';
export function ProfileForm({profile,onSave,busy,onDirty,hasBook}:{profile:Profile,onSave:(p:Profile)=>Promise<void>,busy:boolean,onDirty:(v:boolean)=>void,hasBook:boolean}){
 const [p,setP]=useState({...profile}),[validation,setValidation]=useState('');
 const change=(k:keyof Profile,v:string)=>{setP(s=>({...s,[k]:v}));onDirty(true);};
 const submit=async()=>{const parsed=profileSchema.safeParse(p);if(!parsed.success){setValidation('日付や入力内容を確認してください。');return;}setValidation('');await onSave(parsed.data);};
 return <form className="form-stack" onSubmit={e=>{e.preventDefault();void submit();}}><fieldset disabled={busy}>
 <p className="form-intro">分かるところだけで大丈夫です。未設定の制度は候補として表示し、子育ての項目は必要になったら開けます。</p>
 <h3 className="form-heading"><Heart size={18}/>ふたりのこと</h3>
 <div className="field-grid"><TextField label="一人目の呼び名" value={p.name1} onChange={v=>change('name1',v)} placeholder="呼び名・ニックネーム"/><TextField label="二人目の呼び名" value={p.name2} onChange={v=>change('name2',v)} placeholder="呼び名・ニックネーム"/>
 <Choice label="お住まいの区（広島市）" value={p.ward} onChange={v=>change('ward',v)} options={Object.fromEntries(['未設定','中区','東区','南区','西区','安佐南区','安佐北区','安芸区','佐伯区'].map(v=>[v,v]))}/><TextField label="婚姻日・婚姻の予定日" type="date" value={p.wdate} onChange={v=>change('wdate',v)}/></div>
 <Accordion type="multiple" defaultValue={['life']} className="form-accordion">
 <AccordionItem value="life"><AccordionTrigger>働き方・新生活の予定</AccordionTrigger><AccordionContent><div className="field-grid">
 <Choice label={`${p.name1||'一人目'}の働き方`} value={p.employment1} onChange={v=>change('employment1',v)} options={{unknown:'未設定',company:'会社員',public:'公務員',self:'自営業・フリーランス',other:'その他'}}/>
 <Choice label={`${p.name2||'二人目'}の働き方`} value={p.employment2} onChange={v=>change('employment2',v)} options={{unknown:'未設定',company:'会社員',public:'公務員',self:'自営業・フリーランス',other:'その他'}}/>
 <Choice label="働き方・扶養の確認" value={p.work} onChange={v=>change('work',v)} options={{unknown:'これから考える',dual:'二人とも働く予定',dependent:'扶養を検討する'}}/>
 <Choice label="式・披露宴" value={p.ceremony} onChange={v=>change('ceremony',v)} options={{unknown:'未定',yes:'予定あり',no:'予定なし'}}/>
 <Choice label="引っ越し" value={p.move} onChange={v=>change('move',v)} options={{unknown:'未定',yes:'予定あり',already:'引っ越し済み',no:'予定なし'}}/>
 <Choice label="住まい" value={p.home} onChange={v=>change('home',v)} options={{unknown:'未定',rent:'賃貸で暮らす',soon:'購入も検討する',buying:'購入の手続き中',owned:'所有している'}}/>
 <Choice label="自動車に関する手続き" value={p.car} onChange={v=>change('car',v)} options={{unknown:'未設定',yes:'確認したい',no:'不要'}}/>
 <Choice label="外国籍に関する手続き" value={p.foreign} onChange={v=>change('foreign',v)} options={{unknown:'未設定',yes:'確認したい',no:'不要'}}/>
 </div></AccordionContent></AccordionItem>
 <AccordionItem value="child"><AccordionTrigger>子育ての項目を表示する</AccordionTrigger><AccordionContent><Choice label="表示する段階" value={p.child} onChange={v=>change('child',v)} options={{unknown:'今は表示しない・未定',none:'子育ての項目は使わない',someday:'妊娠前の準備から確認する',pregnant:'妊娠・出産の準備を確認する',born:'出産後・子育ても確認する'}}/>
 {['pregnant','born'].includes(p.child)&&<div className="field-grid"><TextField label="出産予定日（予定の記録）" type="date" value={p.duedate} onChange={v=>change('duedate',v)}/><TextField label="実際の出生日（届出期限の基準）" type="date" value={p.birthdate} onChange={v=>change('birthdate',v)}/></div>}
 <p className="hint">子どもの予定を決めるための質問ではありません。見たい情報の範囲だけを選べます。出産予定日から法定期限は計算しません。</p></AccordionContent></AccordionItem>
 <AccordionItem value="dates"><AccordionTrigger>手続きの期限に使う日付</AccordionTrigger><AccordionContent><p className="hint">該当する日付だけ入力してください。婚姻日を、引っ越しや転入届の日の代わりには使いません。</p><div className="field-grid">
 <TextField label="実際に住み始めた日" type="date" value={p.movedate} onChange={v=>change('movedate',v)}/><TextField label="転入届を出した日" type="date" value={p.reported} onChange={v=>change('reported',v)}/>
 <TextField label="不動産：最も早い未登記の変更日" type="date" value={p.propertydate} onChange={v=>change('propertydate',v)}/><TextField label="普通車：未手続きの氏名変更日" type="date" value={p.carNameDate} onChange={v=>change('carNameDate',v)}/><TextField label="普通車：未手続きの住所変更日" type="date" value={p.carAddressDate} onChange={v=>change('carAddressDate',v)}/>
 </div></AccordionContent></AccordionItem>
 
 </Accordion>
 <p className="hint"><ShieldCheck size={15}/> 名前・日付・記録は、同じ手帳に参加した二人に共有されます。収入の詳細や本人確認番号は入力不要です。</p>
 {validation&&<p role="alert" className="inline-error">{validation}</p>}
 <div className="form-actions"><SaveAction busy={busy} onClick={()=>void submit()}>{hasBook?'設定を保存する':'この内容で手帳を始める'}</SaveAction></div>
 </fieldset></form>;
}
export function TaskForm({task:t,profile:p,record,onSave,busy,onDirty,hasBook,onProfile}:{task:Task,profile:Profile,record?:TaskRecord,onSave:(r:TaskRecord)=>Promise<void>,busy:boolean,onDirty:(v:boolean)=>void,hasBook:boolean,onProfile:()=>void}){
 const [r,setR]=useState<TaskRecord>(structuredClone(record||emptyRecord)),[validation,setValidation]=useState('');
 const change=(part:Partial<TaskRecord>)=>{setR(old=>({...old,...part}));onDirty(true);};
 const legal=statutoryDeadline(t,p);
 const submit=async(done=false)=>{const parsed=recordSchema.safeParse({...r,status:done?'done':r.status,moneyKind:r.amount===null?'none':r.moneyKind});if(!parsed.success){setValidation('金額は0〜10億円の整数、日付は実在する日付を入力してください。');return;}setValidation('');await onSave(parsed.data);};
 const hasFaq=!!(t.faq&&t.faq.length);
 const copyQuestions=async()=>{const body=hasFaq?t.faq!.map((f,i)=>`${i+1}. ${f.q}\n   → ${f.a}`).join('\n\n'):t.questions.map((q,i)=>`${i+1}. ${q}`).join('\n');try{await navigator.clipboard.writeText(`${t.title}\n\n${body}`);toast.success(hasFaq?'FAQをコピーしました':'質問メモをコピーしました');}catch{toast.error('コピーできませんでした。表示された内容を選択してコピーしてください。');}};
 return <div className="task-form form-stack"><fieldset disabled={busy}>
 <div className="condition-note"><Info size={17}/><p>{eligibilityNote(t,p)}</p></div>
 {(t.track||(t.eligibility&&t.eligibility!=='always')||t.money_in||t.money_out)&&<div className="seed-task-meta">
  <div className="seed-task-badges">
   {t.track&&<span className="seed-track-badge" title="シード track">{t.track}</span>}
   {t.eligibility&&t.eligibility!=='always'&&<span className="seed-elig-badge">{eligibilityLabels[t.eligibility]||t.eligibility}</span>}
  </div>
  {(t.money_in||t.money_out)&&<div className="seed-money-memo">
   <strong><Wallet size={15}/>シード金額メモ</strong>
   <p className="hint">シード記載のみ（円は捏造しません）</p>
   {t.money_in&&<p className="seed-money-line">入：{t.money_in.amount_yen!=null?`${formatMoney(t.money_in.amount_yen)}円`:''}{t.money_in.unit?`（${t.money_in.unit}）`:''}{t.money_in.note?` · ${t.money_in.note}`:''}{(t.money_in.amount_yen==null&&!t.money_in.note&&!t.money_in.unit)?'（記載なし）':''}</p>}
   {t.money_out&&<p className="seed-money-line">出：{t.money_out.amount_yen!=null?`${formatMoney(t.money_out.amount_yen)}円`:''}{t.money_out.unit?`（${t.money_out.unit}）`:''}{t.money_out.note?` · ${t.money_out.note}`:''}{(t.money_out.amount_yen==null&&!t.money_out.note&&!t.money_out.unit)?'（記載なし）':''}</p>}
  </div>}
 </div>}
 {t.notice&&<div className="notice-box"><strong>確認しておきたいこと</strong><p>{t.notice}</p></div>}
 {(t.why||t.miss||t.window)&&<div className="context-stack">
  {t.why&&<div className="context-card why"><strong><BookOpen size={16}/>なぜやるのか</strong><p>{t.why}</p></div>}
  {t.miss&&<div className="context-card miss"><strong><AlertTriangle size={16}/>やらないと失うもの</strong><p>{t.miss}</p></div>}
  {t.window&&<div className="context-card window"><strong><Clock3 size={16}/>いつやるか</strong><p>{t.window}</p></div>}
 </div>}
 <div className="field-grid"><Choice label="いまの状況" value={r.status} onChange={v=>change({status:v as TaskRecord['status']})} options={statusNames}/><Choice label="担当" value={r.assignee} onChange={v=>change({assignee:v as TaskRecord['assignee']})} options={{together:'二人で',one:p.name1||'一人目',two:p.name2||'二人目'}}/></div>
 <h3 className="form-heading"><Check size={18}/>ひとつずつ、進めよう</h3>
 <div className="step-list">{t.steps.map((s,i)=><label className={`check-row ${r.steps.includes(i)?'checked':''}`} key={s}><Checkbox checked={r.steps.includes(i)} onCheckedChange={checked=>change({steps:checked?[...r.steps,i]:r.steps.filter(x=>x!==i)})}/><span><small>0{i+1}</small>{s}</span></label>)}</div>
 <p className="hint">チェックだけでは「完了」になりません。手続きの結果を確かめて、完了にできます。</p>
 {legal&&<div className="deadline-detail"><CalendarDays size={19}/><div><strong>{legal.date?`${shortDate(legal.date)}${legal.uncertain?'（原則日・要確認）':''}`:`${legal.missing}が未設定`}</strong><p>{legal.basis}</p>{!legal.date&&<button className="text-button" onClick={onProfile}>基準の日付を設定する <ArrowUpRight size={14}/></button>}</div></div>}
 <div className="field-grid"><TextField label="二人で決めた予定日（任意）" type="date" value={r.due} onChange={v=>change({due:v})}/><div className="field"><Label>二人が条件を確認した日</Label><div className="confirm-day"><span>{r.confirmedAt?shortDate(r.confirmedAt):'まだ記録していません'}</span><button className="text-button" onClick={()=>change({confirmedAt:todayJapan()})}>今日にする</button></div></div></div>
 <div className="field"><Label htmlFor="task-note">ふたりのメモ</Label><Textarea id="task-note" value={r.note} onChange={e=>change({note:e.target.value})} maxLength={3000} rows={4} placeholder="窓口で聞いた条件、準備する書類、次にすること…"/></div>
 <Accordion type="multiple" defaultValue={hasFaq?['faq']:(t.questions.length?['question']:[])} className="form-accordion">
 {hasFaq?<AccordionItem value="faq"><AccordionTrigger><span className="inline-flex items-center gap-2"><HelpCircle size={17}/>よくある質問（回答つき）</span></AccordionTrigger><AccordionContent><div className="faq-list">{t.faq!.map(f=><div className="faq-item" key={f.q}><strong className="faq-q">Q. {f.q}</strong><p className="faq-a">A. {f.a}</p></div>)}</div><Action secondary onClick={()=>void copyQuestions()}><ClipboardCopy/>FAQをコピーする</Action></AccordionContent></AccordionItem>:<AccordionItem value="question"><AccordionTrigger><span className="inline-flex items-center gap-2"><BookOpen size={17}/>確認するときの質問メモ</span></AccordionTrigger><AccordionContent><ul className="question-list">{t.questions.map(q=><li key={q}>{q}</li>)}</ul><Action secondary onClick={()=>void copyQuestions()}><ClipboardCopy/>質問をコピーする</Action></AccordionContent></AccordionItem>}
 {t.type!=='investment'&&<AccordionItem value="money"><AccordionTrigger>給付・節約の金額を記録する（任意）</AccordionTrigger><AccordionContent><p className="hint">同じ制度の金額は、一つの項目だけに記録してください。見込額と受取額を重ねて計上しないよう、受取後は区分を変更します。</p>{t.amountNote&&<p className="hint">{t.amountNote}</p>}<div className="field-grid"><Choice label="金額の区分" value={r.moneyKind} onChange={v=>change({moneyKind:v as TaskRecord['moneyKind'],amount:v==='none'?null:r.amount})} options={{none:'記録しない',received:'実際に受け取った給付・祝金',estimate:'まだ受け取っていない見込額',monthlySaving:'固定費の削減額（月額）',taxEstimate:'税負担の軽減見込額'}}/><div className="field"><Label htmlFor="task-amount">{r.moneyKind==='monthlySaving'?'削減額（円／月）':'金額（円）'}</Label><Input id="task-amount" type="number" inputMode="numeric" min={0} max={1000000000} step={1} disabled={r.moneyKind==='none'} value={r.amount??''} onChange={e=>change({amount:e.target.value===''?null:Number(e.target.value)})} placeholder="不明なら空欄"/></div></div></AccordionContent></AccordionItem>}
 <AccordionItem value="source"><AccordionTrigger>制度・手続きの参照先</AccordionTrigger><AccordionContent><div className="source-stack">{t.sources.map(id=><SourceLink source={sources[id]} key={id}/>)}</div><p className="hint">内容確認日以後の変更は自動反映されません。申請・契約前にリンク先で最新条件を確認してください。</p></AccordionContent></AccordionItem>
 </Accordion>
 {t.type==='investment'&&<p className="hint investment-note">{t.amountNote}</p>}
 {validation&&<p role="alert" className="inline-error">{validation}</p>}
 <div className="task-save-bar"><SaveAction busy={busy} onClick={()=>void submit()}>{hasBook?'記録を保存する':'保存して手帳を始める'}</SaveAction>{r.status!=='done'&&<Action secondary disabled={busy} onClick={()=>void submit(true)}><Sparkles/>完了にする</Action>}</div>
 </fieldset></div>;
}
export function MemoryForm({initial,onSave,busy,onDirty}:{initial:Memory,onSave:(m:Memory)=>Promise<void>,busy:boolean,onDirty:(v:boolean)=>void}){
 const [m,setM]=useState(initial),[error,setError]=useState('');const change=(part:Partial<Memory>)=>{setM(old=>({...old,...part}));onDirty(true);};
 const submit=async()=>{const result=memorySchema.safeParse(m);if(!result.success){setError('タイトルと日付を確認してください。');return;}await onSave(result.data);};
 return <form className="form-stack" onSubmit={e=>{e.preventDefault();void submit();}}><fieldset disabled={busy}><div className="field-grid"><Choice label="残したいこと" value={m.kind} onChange={v=>change({kind:v as Memory['kind']})} options={{memory:'ふたりの思い出',monthly:'月に一度のふたり会議',dream:'これから叶えたいこと'}}/><TextField label="日付・予定日（任意）" type="date" value={m.date} onChange={v=>change({date:v})}/></div><TextField label="タイトル" value={m.title} onChange={v=>change({title:v})} placeholder={m.kind==='dream'?'いつか一緒に行きたい場所':'今日の小さな記念を'} required/><div className="field"><Label htmlFor="memory-text">ふたりの言葉</Label><Textarea id="memory-text" rows={8} maxLength={3000} value={m.text} onChange={e=>change({text:e.target.value})} placeholder={m.kind==='monthly'?'今月うれしかったこと：\nありがとうを伝えたいこと：\n来月の楽しみ：\n見直したい予定・お金のこと：':'ここに、残しておきたいことを。'}/></div>{m.kind==='dream'&&<label className="check-row"><Checkbox checked={m.complete} onCheckedChange={v=>change({complete:!!v})}/><span>二人で叶えました</span></label>}{error&&<p className="inline-error" role="alert">{error}</p>}<div className="form-actions"><SaveAction busy={busy} onClick={()=>void submit()}>手帳に残す</SaveAction></div></fieldset></form>;
}
