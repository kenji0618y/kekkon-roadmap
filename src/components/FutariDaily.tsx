import {useEffect,useMemo,useRef,useState,type ReactNode} from 'react';
import {ArrowLeft,ArrowUpRight,ChevronRight,Copy,LoaderCircle,Play} from 'lucide-react';
import {toast} from 'sonner';
import type {Book,FutariAnswer,FutariMode,Profile} from '../lib/model';
import {pairEventWhoLabels} from '../lib/model';
import {todayJapan} from '../lib/dates';
import {refById} from '../data/catalog';
import {
  answered,cardFor,dayKeyOf,futariHow,gSourceById,guide,lastYearEntry,lessonPace,lessonTopics,lessons,modeFor,modeLabel,
  other,readMe,weekOf,weekThemes,writeMe,yearIndex,yearModes,yearsSourceIds,type Lesson,type Who,
} from '../lib/futari';
import {askFutariFeedback,type Feedback} from '../lib/futari-ai';
import {Sheet,SheetContent,SheetDescription,SheetHeader,SheetTitle} from './ui/sheet';

/** 博士風イラスト（イメージ）。ふたりタブの中だけで使う。 */
const DOCTOR_ICON='futari/doctor-icon.png';
const AI_NOTE='AIが、公開されているゴットマン博士の研究をもとに書いた一般的なアドバイスです。ゴットマン博士本人や The Gottman Institute によるものではありません。イラストはイメージです。';

type View='home'|'practice'|'meeting'|'videos'|'long';

export type FutariSave={
  answer:(p:{date:string,who:Who,cardId:string,mode:FutariMode,answer:Partial<FutariAnswer>})=>Promise<boolean>,
  meeting:(date:string,note:string)=>Promise<boolean>,
  settings:(patch:{modeOverride?:'auto'|FutariMode,signal?:string})=>Promise<boolean>,
};

function Sources({ids,prefix='出典'}:{ids:string[],prefix?:string}){
  const list=ids.map(id=>gSourceById[id]).filter(Boolean);
  if(!list.length)return null;
  return <div className="fu-src"><span className="fu-src-h">{prefix}</span>{list.map(s=><span key={s.id} className="fu-src-item">{s.url?<a href={s.url} target="_blank" rel="noopener noreferrer">{s.title}<ArrowUpRight size={10} aria-hidden/></a>:s.title}</span>)}</div>;
}
function Teach({ids,children}:{ids:string[],children?:ReactNode}){
  return <div className="fu-teach"><span className="fu-teach-label">ゴットマン博士の教え</span>{children}<Sources ids={ids}/></div>;
}

export function FutariDaily({book,busy,save,active=true}:{book:Book,busy:boolean,save:FutariSave,active?:boolean}){
  const today=todayJapan();
  const p:Profile=book.profile;
  const w=pairEventWhoLabels(p);
  const names:Record<Who,string>={n1:w.male,n2:w.female};
  const [me,setMe]=useState<Who|''>(()=>readMe());
  const [view,setView]=useState<View>('home');
  const [troubleOpen,setTroubleOpen]=useState(false);
  const [fabOverVideo,setFabOverVideo]=useState(false);
  // 博士の丸ボタンが動画の操作バーに重なるあいだは、ボタンを隠す（動画の再生・音量を押せるように）。
  useEffect(()=>{
    if(!active)return;
    let raf=0;
    const check=()=>{raf=0;const h=window.innerHeight,w=window.innerWidth;const over=[...document.querySelectorAll<HTMLVideoElement>('.fu video')].some(v=>{const r=v.getBoundingClientRect();/* 操作バー（動画の下端から約60px）が丸ボタンの高さ（画面下端から約14〜80px）にかかるときだけ */return r.height>0&&r.right>w-90&&r.bottom>h-90&&r.bottom-64<h-10;});setFabOverVideo(over);};
    const onScroll=()=>{if(!raf)raf=requestAnimationFrame(check);};
    window.addEventListener('scroll',onScroll,{passive:true});window.addEventListener('resize',onScroll);
    const t=window.setInterval(onScroll,800);
    onScroll();
    return ()=>{window.removeEventListener('scroll',onScroll);window.removeEventListener('resize',onScroll);window.clearInterval(t);if(raf)cancelAnimationFrame(raf);};
  },[active]);
  const topRef=useRef<HTMLDivElement>(null);
  const go=(v:View)=>{setView(v);requestAnimationFrame(()=>topRef.current?.scrollIntoView({block:'start'}));};
  const chooseMe=(v:Who)=>{writeMe(v);setMe(v);};

  return <div className="fu" ref={topRef}>
    {view==='home'&&<>
      <div className="fu-hello">
        <img className="fu-hello-doctor" src={DOCTOR_ICON} alt="イラスト（イメージ）" width={56} height={56}/>
        <div className="fu-hello-text">
          <p className="eyebrow">ふたりの時間 ・ 1日1分</p>
          <h1>{p.name1&&p.name2?`${p.name1}さんと${p.name2}さんの、今日の一問。`:'ふたりの、今日の一問。'}</h1>
          <p>ゴットマン博士の研究をもとにした、ふたりのための小さな習慣です。</p>
        </div>
      </div>
      <WeekStrip today={today} book={book}/>
      <DailyCard today={today} book={book} me={me} names={names} busy={busy} save={save} onChooseMe={chooseMe} onMeeting={()=>go('meeting')}/>
      <LessonCard lesson={lessons[0]} onList={()=>go('videos')}/>
      <div className="fu-row2">
        <button type="button" className="fu-mini prac" onClick={()=>go('practice')}><span className="eyebrow">言いかえ練習</span><strong>強く言いそうなことを書いてみる</strong><small>AIが、やわらかい言い方を提案します。</small></button>
        <button type="button" className="fu-mini meet" onClick={()=>go('meeting')}><span className="eyebrow">週1回 ・ ふたり会議</span><strong>{nextMeetingLabel(today)}</strong><small>ありがとうを伝え合う → 気になることを1つ → 「来週なにをしてほしい？」</small></button>
      </div>
      <div className="fu-links">
        <button type="button" onClick={()=>go('long')}>長く使う仕組み<ChevronRight size={15}/></button>
      </div>
      <p className="fu-foot">内容の出典：The Seven Principles for Making Marriage Work／gottman.com</p>
    </>}
    {view!=='home'&&<button type="button" className="fu-back" onClick={()=>go('home')}><ArrowLeft size={15}/>今日の一問へもどる</button>}
    {view==='practice'&&<PracticeView/>}
    {view==='meeting'&&<MeetingView today={today} book={book} busy={busy} save={save}/>}
    {view==='videos'&&<VideosView/>}
    {view==='long'&&<LongView today={today} book={book} busy={busy} save={save}/>}

    <TroubleSheet open={troubleOpen} onOpenChange={setTroubleOpen} book={book} busy={busy} save={save}/>
    {active&&<button type="button" className="amity-fab doctor-fab" onClick={()=>setTroubleOpen(true)} aria-label="困ったとき（ゴットマン博士の教え）" hidden={troubleOpen||fabOverVideo} aria-hidden={troubleOpen||fabOverVideo}><img src={DOCTOR_ICON} alt="" width={60} height={60}/></button>}
  </div>;
}

function nextMeetingLabel(today:string){
  const key=dayKeyOf(today);
  if(key==='sun')return '今日はふたり会議の日';
  const idx=['mon','tue','wed','thu','fri','sat'].indexOf(key);
  return `日曜 ・ 次回まで${6-idx}日`;
}

function WeekStrip({today,book}:{today:string,book:Book}){
  const days=weekOf(today);
  const labels=['月','火','水','木','金','土','日'];
  return <div className="fu-week" aria-label="今週">
    {days.map((d,i)=>{
      const day=book.futari.days[d];
      const done=i===6?!!book.futari.meetings[d]?.note.trim():!!day&&answered(day.n1)&&answered(day.n2);
      const cls=[d===today?'today':'',done?'done':'',d>today?'future':''].filter(Boolean).join(' ');
      return <span key={d} className={cls} aria-label={`${labels[i]}曜 ${Number(d.slice(8))}日${done?' ふたりとも答えました':''}`}>{labels[i]}<b>{Number(d.slice(8))}</b></span>;
    })}
  </div>;
}

function Avatar({who,names}:{who:Who,names:Record<Who,string>}){
  return <span className={`fu-av ${who}`} aria-hidden>{[...names[who]][0]||'・'}</span>;
}

function DailyCard({today,book,me,names,busy,save,onChooseMe,onMeeting}:{today:string,book:Book,me:Who|'',names:Record<Who,string>,busy:boolean,save:FutariSave,onChooseMe:(w:Who)=>void,onMeeting:()=>void}){
  const f=book.futari;
  const card=cardFor(today,f);
  const theme=weekThemes.find(t=>t.day===dayKeyOf(today));
  const mode=modeFor(today,f);
  const day=f.days[today];
  const [text,setText]=useState('');
  const [guess,setGuess]=useState('');
  const [editing,setEditing]=useState(false);
  const [changed,setChanged]=useState('');
  const [showHow,setShowHow]=useState(false);

  if(!card){
    return <article className="fu-card" id="futari-daily">
      <div className="fu-card-h"><span><i className="fu-dot"/>今日はふたり会議の日</span><small>{theme?.theme}</small></div>
      <div className="fu-q"><span className="fu-tag">ふたり会議</span><h2>今週の「ありがとう」を5つ、用意しておこう。</h2><p className="fu-hint">{theme?.sub}</p></div>
      <div className="fu-card-f"><button type="button" className="fu-btn" onClick={onMeeting}>ふたり会議の流れを見る</button><Sources ids={theme?.sourceIds||[]}/></div>
    </article>;
  }

  if(!me){
    return <article className="fu-card" id="futari-daily">
      <div className="fu-card-h"><span><i className="fu-dot"/>今日の一問</span><small>{theme?.theme}</small></div>
      <div className="fu-q"><span className="fu-tag">{card.concept}</span><h2>{card.question}</h2></div>
      <div className="fu-sec">
        <p className="fu-step-h">この端末で答えるのはどちら？</p>
        <div className="fu-choose">{(['n1','n2'] as Who[]).map(v=><button key={v} type="button" className="fu-btn ghost" onClick={()=>onChooseMe(v)}>{names[v]}</button>)}</div>
        <p className="fu-note">あとから切り替えられます。答えは、ふたりの手帳（この端末）に残ります。自動同期を使っていれば、相手の端末にも届きます。</p>
      </div>
    </article>;
  }

  const pt=other(me);
  const mine=day?.[me]||null;
  const theirs=day?.[pt]||null;
  const iAnswered=answered(mine);
  const theyAnswered=answered(theirs);
  const both=iAnswered&&theyAnswered;
  const last=mode==='compare'?lastYearEntry(today,card.id,f):null;

  const submit=async()=>{
    const t=text.trim();
    if(!t)return;
    if(mode==='guess'&&!iAnswered&&!guess.trim()){toast.message(`先に${names[pt]}さんの答えを予想してみてください`);return;}
    const patch:Partial<FutariAnswer>={text:t};
    if(mode==='guess'&&guess.trim())patch.guess=guess.trim();
    const ok=await save.answer({date:today,who:me,cardId:card.id,mode,answer:patch});
    if(ok){setText('');setGuess('');setEditing(false);}
  };
  const startEdit=()=>{setText(mine?.text||'');setGuess(mine?.guess||'');setEditing(true);};

  const input=(!iAnswered||editing);
  return <article className="fu-card" id="futari-daily">
    <div className="fu-card-h"><span><i className="fu-dot"/>今日の一問</span><small>{theme?.label}曜 ・ {theme?.theme}</small></div>
    <div className="fu-q">
      {mode!=='answer'&&<span className="fu-mode">{mode==='compare'?'去年と比べる':'予想してから答える'}</span>}
      <span className="fu-tag">{card.concept}</span>
      <h2>{card.question}</h2>
      <p className="fu-hint">{card.hint}</p>
      <Sources ids={card.sourceIds}/>
    </div>

    {mode==='guess'&&input?<div className="fu-sec">
      {!iAnswered&&<><p className="fu-step-h"><i>1</i>{names[pt]}さんの答えを予想する</p>
      <textarea className="fu-input" rows={2} maxLength={1000} value={guess} onChange={e=>setGuess(e.target.value)} placeholder="ここに、あなたの予想を書く" aria-label={`${names[pt]}さんの答えの予想`}/></>}
      <p className="fu-step-h" style={{marginTop:12}}><i>{iAnswered?'✎':'2'}</i>自分の答えを書く</p>
      <textarea className="fu-input" rows={2} maxLength={1000} value={text} onChange={e=>setText(e.target.value)} placeholder="ここに、あなた自身の答えを書く" aria-label="自分の答え"/>
      <button type="button" className="fu-btn" style={{marginTop:10}} disabled={busy||!text.trim()} onClick={()=>void submit()}>{iAnswered?'書き直しを保存':'予想と答えを送る'}</button>
      {editing&&<button type="button" className="fu-text-btn" onClick={()=>setEditing(false)}>やめる</button>}
      <p className="fu-note">ふたりとも書くと、答え合わせが開きます</p>
    </div>:<div className="fu-ans">
      <div className="fu-who">
        <Avatar who={me} names={names}/>
        <div className="fu-body">
          <div className="fu-nm">{names[me]} <em>あなた{mode==='compare'?' ・ 今年の答え':''}</em><button type="button" className="fu-switch" onClick={()=>onChooseMe(pt)}>切り替え</button></div>
          {input?<>
            <textarea className="fu-input" rows={2} maxLength={1000} value={text} onChange={e=>setText(e.target.value)} placeholder="ここに書く（30秒でOK）" aria-label="あなたの答え"/>
            <div className="fu-inline-actions"><button type="button" className="fu-btn" disabled={busy||!text.trim()} onClick={()=>void submit()}>{editing?'書き直しを保存':'答える'}</button>{editing&&<button type="button" className="fu-text-btn" onClick={()=>setEditing(false)}>やめる</button>}</div>
          </>:<>
            <div className={`fu-bubble ${me}`}>{mine!.text}</div>
            <button type="button" className="fu-text-btn" onClick={startEdit}>書き直す</button>
          </>}
        </div>
        <span className={`fu-stamp${iAnswered?'':' off'}`} aria-label={iAnswered?'答えました':'まだ'}>{iAnswered?<>{[...names[me]][0]}<br/>済</>:'未'}</span>
      </div>
      <div className="fu-who">
        <Avatar who={pt} names={names}/>
        <div className="fu-body">
          <div className="fu-nm">{names[pt]}</div>
          {iAnswered&&theyAnswered?<div className={`fu-bubble ${pt}`}>{theirs!.text}</div>
          :<div className="fu-status">{theyAnswered?'答えました（あなたが答えると見られます）':'まだ答えていません'}</div>}
        </div>
        <span className={`fu-stamp${theyAnswered?'':' off'}`}>{theyAnswered?<>{[...names[pt]][0]}<br/>済</>:'未'}</span>
      </div>
    </div>}

    {mode==='guess'&&iAnswered&&!editing&&<GuessReveal me={me} names={names} mine={mine!} theirs={theirs} busy={busy} onResult={(r)=>void save.answer({date:today,who:me,cardId:card.id,mode,answer:{result:r}})} onEdit={startEdit}/>}

    {mode==='compare'&&iAnswered&&<div className="fu-sec">
      <div className="fu-prev"><span className="fu-pl">去年のあなたの答え{last?`（${last.date.slice(0,4)}年${Number(last.date.slice(5,7))}月${Number(last.date.slice(8))}日）`:''}</span>{last?.day[me]?.text||<span className="fu-ph">この問いの、1年前の答えはまだありません</span>}</div>
      <div className="fu-prev"><span className="fu-pl">去年の{names[pt]}さんの答え</span>{last?.day[pt]?.text||<span className="fu-ph">この問いの、1年前の答えはまだありません</span>}</div>
      <p className="fu-step-h" style={{marginTop:10}}>変わった？（ひとこと）</p>
      {mine?.changed?<div className="fu-bubble">{mine.changed}</div>:<>
        <textarea className="fu-input" rows={1} maxLength={500} value={changed} onChange={e=>setChanged(e.target.value)} placeholder="ここにひとこと" aria-label="変わった？"/>
        <button type="button" className="fu-btn ghost" style={{marginTop:8}} disabled={busy||!changed.trim()} onClick={()=>void save.answer({date:today,who:me,cardId:card.id,mode,answer:{changed:changed.trim()}}).then(ok=>{if(ok)setChanged('');})}>ひとことを残す</button>
      </>}
      <Sources ids={['7P-4','G-LOVEMAP']}/>
    </div>}

    <div className="fu-card-f">
      {both?<div className="fu-done">ふたりとも答えました ・ 今日の一問 完了</div>
      :iAnswered?<p className="fu-note">{names[pt]}さんが答えると、ここに出ます</p>
      :<p className="fu-note">あなたが答えると、{names[pt]}さんの答えが見られます</p>}
      <button type="button" className="fu-text-btn" onClick={()=>setShowHow(v=>!v)}>{showHow?'使い方を閉じる':'使い方'}</button>
      {showHow&&<ol className="fu-how">{futariHow.map(h=><li key={h}>{h}</li>)}</ol>}
    </div>

    {both&&<FeedbackBlock key={`${today}-${me}`} mode="daily" question={card.question} answer={mine!.text} who={names[me]}/>}
  </article>;
}

function GuessReveal({me,names,mine,theirs,busy,onResult,onEdit}:{me:Who,names:Record<Who,string>,mine:FutariAnswer,theirs:FutariAnswer|null,busy:boolean,onResult:(r:'hit'|'new')=>void,onEdit:()=>void}){
  const pt=other(me);
  if(!answered(theirs))return <div className="fu-sec"><p className="fu-note">送りました。{names[pt]}さんが書くと、答え合わせが開きます。</p><button type="button" className="fu-text-btn" onClick={onEdit}>書き直す</button></div>;
  return <div className="fu-sec fu-reveal">
    <p className="fu-step-h">答え合わせ</p>
    <div className="fu-vs">
      <div className="fu-box"><span className="fu-pl">あなたの予想</span>{mine.guess||<span className="fu-ph">（予想なし）</span>}</div>
      <div className={`fu-box ${pt}`}><span className="fu-pl">{names[pt]}さんの答え</span>{theirs!.text}</div>
    </div>
    <div className="fu-choose" style={{marginTop:10}}>
      <button type="button" className={`fu-btn ghost${mine.result==='hit'?' on':''}`} aria-pressed={mine.result==='hit'} disabled={busy} onClick={()=>onResult('hit')}>当たった</button>
      <button type="button" className={`fu-btn ghost${mine.result==='new'?' on':''}`} aria-pressed={mine.result==='new'} disabled={busy} onClick={()=>onResult('new')}>新しく知った</button>
    </div>
    <div className="fu-vs" style={{marginTop:10}}>
      <div className={`fu-box ${pt}`}><span className="fu-pl">{names[pt]}さんの予想</span>{theirs!.guess||<span className="fu-ph">（予想なし）</span>}</div>
      <div className="fu-box"><span className="fu-pl">あなたの答え</span>{mine.text}</div>
    </div>
    {theirs!.result&&<p className="fu-note">{names[pt]}さん：{theirs!.result==='hit'?'当たった':'新しく知った'}</p>}
    <p className="fu-note">点数やランキングはつけません</p>
    <Sources ids={['G-LMPDF','G-LOVEMAP']}/>
  </div>;
}

function FeedbackBlock({mode,question,answer,who}:{mode:'daily'|'rephrase',question?:string,answer:string,who?:string}){
  const [busy,setBusy]=useState(false);
  const [fb,setFb]=useState<Feedback|null>(null);
  const abortRef=useRef<AbortController|null>(null);
  useEffect(()=>()=>abortRef.current?.abort(),[]);
  const run=async()=>{
    abortRef.current?.abort();
    const ac=new AbortController();abortRef.current=ac;
    setBusy(true);setFb(null);
    try{setFb(await askFutariFeedback({mode,question,answer,signal:ac.signal}));}
    finally{setBusy(false);}
  };
  return <div className="fu-fb-wrap">
    {!fb&&<button type="button" className="fu-btn ghost" disabled={busy||!answer.trim()} onClick={()=>void run()}>{busy?<><LoaderCircle className="spin" size={16}/>みてもらっています…</>:'AIにみてもらう'}</button>}
    {fb&&<div className="fu-fb" role="status">
      <div className="fu-fb-h"><img src={DOCTOR_ICON} alt="イラスト（イメージ）" width={36} height={36}/><b>ゴットマン博士の研究にもとづくアドバイス<small>{mode==='daily'?`${who||'あなた'}さんの答えへ`:'言いかえ練習'} ・ AIが書いた一般的なアドバイス</small></b></div>
      {fb.kind==='safety'&&<div className="fu-safety"><p>書かれた内容から、安心して話せない状況かもしれないと感じました。ここではアドバイスを出しません。ひとりで抱えずに、相談窓口を使ってください。</p>
        <p className="fu-src"><a href={refById.R16?.url} target="_blank" rel="noopener noreferrer">内閣府：DV相談<ArrowUpRight size={10} aria-hidden/></a>／<a href={refById.R15?.url} target="_blank" rel="noopener noreferrer">内閣府：性犯罪・性暴力<ArrowUpRight size={10} aria-hidden/></a></p></div>}
      {fb.kind==='error'&&<p className="fu-fb-err">{fb.message}</p>}
      {fb.kind==='ok'&&<>
        {fb.good.length>0&&<><h4>◎ よかったところ</h4>{fb.good.map((g,i)=><div key={i}><p>{g.text}</p><Sources ids={g.sourceIds}/></div>)}</>}
        {fb.rewrite&&<><h4 className="fix">✎ こう直すともっと良くなる</h4>
          <div className="fu-rew">{fb.rewrite.before&&<><s>{fb.rewrite.before}</s><br/><span className="arrow">→</span></>}「{fb.rewrite.after}」</div>
          <p style={{marginTop:5}}>{fb.rewrite.why}</p>
          <Sources ids={fb.rewrite.sourceIds}/>
          <button type="button" className="fu-text-btn" onClick={()=>{void navigator.clipboard?.writeText(fb.rewrite!.after).then(()=>toast.success('言いかえをコピーしました'),()=>toast.error('コピーできませんでした'));}}><Copy size={13}/>言いかえをコピー</button>
        </>}
      </>}
      <div className="fu-fb-actions"><button type="button" className="fu-text-btn" disabled={busy} onClick={()=>void run()}>{busy?'みてもらっています…':'もう一度みてもらう'}</button></div>
      <p className="fu-disc">{AI_NOTE} つらさが続くときは専門家へ。</p>
    </div>}
  </div>;
}

/** 動画に焼き込まれた番号（lessonN.mp4 の N ＝ 動画内の「ふたりのレッスン N」）。一覧・今日のカードで同じ番号を使う。 */
function lessonNo(lesson?:Lesson){return Number(/lesson(\d+)\.mp4/.exec(lesson?.video||'')?.[1]||0);}

function LessonCard({lesson,onList}:{lesson:Lesson,onList:()=>void}){
  return <article className="fu-card" id="futari-lesson">
    <div className="fu-card-h"><span><i className="fu-dot sage"/>今日のレッスン</span><small>{lesson.duration} ・ 字幕つき</small></div>
    <LessonPlayer lesson={lesson}/>
    <div className="fu-lesson">
      <p className="eyebrow">{lessonNo(lesson)?`レッスン ${lessonNo(lesson)}`:'レッスン'} ・ 動画一覧のうちの1本</p>
      <h3>{lesson.title}</h3>
      <p>{lesson.summary}</p>
      <Teach ids={lesson.sourceIds}/>
      <button type="button" className="fu-text-btn" onClick={onList}>動画一覧を見る<ChevronRight size={14}/></button>
    </div>
  </article>;
}

function LessonPlayer({lesson}:{lesson:Lesson}){
  if(!lesson.video)return null;
  return <div className="fu-video">
    <video controls playsInline preload="metadata" poster={lesson.poster} aria-label={`レッスン動画：${lesson.title}`}>
      <source src={lesson.video} type="video/mp4"/>
      この端末では動画を再生できません。
    </video>
    <details className="fu-script"><summary>字幕の文を読む</summary><ol>{lesson.lines.map((l,i)=><li key={i}>{l.say}</li>)}</ol></details>
  </div>;
}

function PracticeView(){
  const [text,setText]=useState('');
  return <section className="fu-page">
    <p className="eyebrow">言いかえ練習</p>
    <h1 className="fu-title">つい強く言いそうなこと、<br/>先に書いてみよう。</h1>
    <p className="fu-lead">書いた内容はこの画面だけで使い、手帳には保存しません（相手にも見えません）。</p>
    <label className="fu-lbl" htmlFor="fu-practice">お題：{guide.practicePrompt}</label>
    <textarea id="fu-practice" className="fu-input lg" rows={3} maxLength={600} value={text} onChange={e=>setText(e.target.value)} placeholder="例：なんでいつも洗い物ためるの？"/>
    <FeedbackBlock mode="rephrase" answer={text}/>
    <article className="fu-card" style={{marginTop:16}}>
      <div className="fu-card-h"><span><i className="fu-dot"/>言いかえ例</span><small>4つの危険な言い方と、かわりに言うこと</small></div>
      <div className="fu-sec">
        {guide.rephrase.map((r,i)=><div key={i} className="fu-pairrow"><span className="fu-horse">{r.horseman}</span>{r.bad&&<><span className="x">✕「{r.bad.replace(/^「|」$/g,'')}」</span><br/></>}<span className="o">○{r.good.startsWith('「')?r.good:`「${r.good}」`}</span><small>{r.antidote}</small></div>)}
        <Teach ids={[...new Set(guide.rephrase.flatMap(r=>r.sourceIds))]}/>
      </div>
    </article>
  </section>;
}

function MeetingView({today,book,busy,save}:{today:string,book:Book,busy:boolean,save:FutariSave}){
  const m=guide.meeting;
  const sunday=weekOf(today)[6];
  const saved=book.futari.meetings[sunday]?.note||'';
  const [note,setNote]=useState(saved);
  useEffect(()=>{setNote(saved);},[saved]);
  const past=Object.entries(book.futari.meetings).filter(([d,v])=>d<sunday&&v.note.trim()).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,3);
  return <section className="fu-page">
    <p className="eyebrow">週1回 ・ 日曜の夜</p>
    <h1 className="fu-title">{m.title}</h1>
    <p className="fu-lead">{nextMeetingLabel(today)}。5つの流れで、短く話します。</p>
    <article className="fu-card"><div className="fu-sec">
      <ol className="fu-steps">{m.steps.map((s,i)=><li key={i}>{s.text}{s.note&&<small>{s.note}</small>}</li>)}</ol>
      <p className="fu-note" style={{textAlign:'left'}}>{m.timeNote}</p>
      <Teach ids={m.sourceIds}/>
    </div></article>
    <article className="fu-card"><div className="fu-sec">
      <label className="fu-lbl" htmlFor="fu-meeting-note">今週の会議のメモ（{Number(sunday.slice(5,7))}月{Number(sunday.slice(8))}日の日曜）</label>
      <textarea id="fu-meeting-note" className="fu-input lg" rows={3} maxLength={2000} value={note} onChange={e=>setNote(e.target.value)} placeholder="決めたこと・来週してほしいこと"/>
      <button type="button" className="fu-btn ghost" style={{marginTop:8}} disabled={busy||note===saved} onClick={()=>void save.meeting(sunday,note)}>メモを残す</button>
      <p className="fu-note">メモはふたりの手帳に残ります。</p>
      {past.length>0&&<div className="fu-past"><p className="fu-step-h">前の会議のメモ</p>{past.map(([d,v])=><div key={d} className="fu-prev"><span className="fu-pl">{Number(d.slice(5,7))}月{Number(d.slice(8))}日</span>{v.note}</div>)}</div>}
    </div></article>
  </section>;
}

function VideosView(){
  const [playing,setPlaying]=useState('');
  return <section className="fu-page">
    <p className="eyebrow">レッスン動画 ・ 約30〜60秒ずつ</p>
    <h1 className="fu-title">動画一覧</h1>
    <p className="fu-lead">ゴットマン博士の本と gottman.com にもとづくテーマです。番号は動画の中の「ふたりのレッスン」の番号と同じです。</p>
    <article className="fu-card">
      <div className="fu-card-h"><span><i className="fu-dot sage"/>テーマ一覧</span><small>「本」＝『The Seven Principles…』改訂版</small></div>
      <ul className="fu-vlist">
        {lessonTopics.map((t,i)=>({t,i,lesson:lessons.find(l=>l.id===t.lessonId)})).sort((a,b)=>(lessonNo(a.lesson)||999+a.i)-(lessonNo(b.lesson)||999+b.i)).map(({t,lesson})=>{
          const ready=!!lesson?.video;
          const no=lessonNo(lesson);
          return <li key={t.id} className={ready?'has':''}>
            <span className="no">{no||'・'}</span>
            <span className="tt">{lesson?.title||t.title}<small>{lesson&&lesson.title!==t.title?`テーマ：${t.title} ・ `:''}{[...new Set(t.sourceIds.map(id=>gSourceById[id]?.short).filter(Boolean))].join('／')}</small>
              {lesson&&!ready&&<details className="fu-script"><summary>台本を読む</summary><ol>{lesson.lines.map((l,j)=><li key={j}>{l.say}</li>)}</ol><Teach ids={lesson.sourceIds}/></details>}
              {ready&&playing===t.id&&<><LessonPlayer lesson={lesson!}/><Teach ids={lesson!.sourceIds}/></>}
            </span>
            {ready?<button type="button" className="bd ok" onClick={()=>setPlaying(v=>v===t.id?'':t.id)}>{playing===t.id?'閉じる':<><Play size={10}/>見る</>}</button>:<span className="bd">これから</span>}
          </li>;
        })}
      </ul>
    </article>
    <article className="fu-card"><div className="fu-card-h"><span><i className="fu-dot sage"/>動画のペース</span></div><div className="fu-sec">
      {lessonPace.map(y=><div key={y.label} className="fu-yr"><span className="n">{y.label}</span><div><b>{y.title}</b><p>{y.text}</p></div></div>)}
    </div></article>
  </section>;
}

function LongView({today,book,busy,save}:{today:string,book:Book,busy:boolean,save:FutariSave}){
  const f=book.futari;
  const yi=yearIndex(today,f);
  const key=dayKeyOf(today);
  const current=modeFor(today,f);
  return <section className="fu-page">
    <p className="eyebrow">長く使う仕組み</p>
    <h1 className="fu-title">毎日1分を、何年も<br/>続けられる形に。</h1>
    <p className="fu-lead">曜日ごとにテーマを決めて、年ごとに答え方を変えます。同じ問いにもう一度答えることにも意味があります（ラブマップは「定期的に更新する」もの）。</p>
    <article className="fu-card"><div className="fu-card-h"><span><i className="fu-dot"/>曜日ごとのテーマ</span><small>毎週おなじ流れ</small></div><div className="fu-sec">
      <ul className="fu-wk">{weekThemes.map(t=><li key={t.day} className={`${t.day==='sun'?'sun':''}${t.day===key?' now':''}`}><span className="d">{t.label}</span><div>{t.theme}<small>{t.sub}</small></div></li>)}</ul>
      <Teach ids={[...new Set(weekThemes.flatMap(t=>t.sourceIds))]}/>
    </div></article>
    <article className="fu-card"><div className="fu-card-h"><span><i className="fu-dot"/>年ごとの答え方</span><small>{f.startedAt?`${Number(f.startedAt.slice(0,4))}年${Number(f.startedAt.slice(5,7))}月${Number(f.startedAt.slice(8))}日に始めました・いまは${yi+1}年目`:'答えた日から数えます'}</small></div><div className="fu-sec">
      {yearModes.map(y=><div key={y.label} className={`fu-yr${y.mode===current&&f.modeOverride==='auto'&&yi<3&&['answer','compare','guess'][yi]===y.mode?' now':''}`}><span className="n">{y.label}</span><div><b>{y.title}</b><p>{y.text}</p></div></div>)}
      <Teach ids={yearsSourceIds}/>
      <label className="fu-lbl" htmlFor="fu-mode">答え方（ふだんは「年に合わせる」のままで大丈夫）</label>
      <select id="fu-mode" className="fu-select" value={f.modeOverride} disabled={busy} onChange={e=>void save.settings({modeOverride:e.target.value as 'auto'|FutariMode})}>
        <option value="auto">年に合わせる（いま：{modeLabel[(['answer','compare','guess'] as const)[yi%3]]}）</option>
        <option value="answer">いつも：{modeLabel.answer}</option>
        <option value="compare">いつも：{modeLabel.compare}</option>
        <option value="guess">いつも：{modeLabel.guess}</option>
      </select>
      <p className="fu-note" style={{textAlign:'left'}}>すでに答えた日は、そのときの答え方のまま残ります。</p>
    </div></article>
  </section>;
}

/** 困ったときの言いかえヒント：言いかえ例（批判・自己弁護）と、ルール表の逃避の例。 */
function troubleHints(){
  const rows=[guide.rephrase[0],guide.rephrase[4]].map(r=>({bad:r.bad,good:r.good}));
  const r4=guide.feedbackRules.find(r=>r.id==='R4')?.example||'';
  const m=r4.match(/^「(.+)」→「(.+)」$/);
  if(m)rows.push({bad:m[1],good:m[2]});
  return rows;
}

function TroubleSheet({open,onOpenChange,book,busy,save}:{open:boolean,onOpenChange:(v:boolean)=>void,book:Book,busy:boolean,save:FutariSave}){
  const t=guide.trouble;
  const signal=book.futari.signal||t.defaultSignal;
  const [editSignal,setEditSignal]=useState(false);
  const [signalDraft,setSignalDraft]=useState(signal);
  const [choice,setChoice]=useState(20);
  const [endAt,setEndAt]=useState<number>(()=>{try{return Number(localStorage.getItem('futari-timer-v1'))||0;}catch{return 0;}});
  const [now,setNow]=useState(()=>Date.now());
  const [phase,setPhase]=useState<'idle'|'ask'|'resume'>('idle');
  useEffect(()=>{if(!endAt)return;const id=window.setInterval(()=>setNow(Date.now()),1000);return()=>window.clearInterval(id);},[endAt]);
  useEffect(()=>{if(endAt&&now>=endAt){setEndAt(0);try{localStorage.removeItem('futari-timer-v1');}catch{/* ignore */}setPhase('ask');}},[now,endAt]);
  const start=(minutes:number)=>{const e=Date.now()+minutes*60000;setEndAt(e);setNow(Date.now());setPhase('idle');try{localStorage.setItem('futari-timer-v1',String(e));}catch{/* ignore */}};
  const stop=()=>{setEndAt(0);try{localStorage.removeItem('futari-timer-v1');}catch{/* ignore */}};
  const left=Math.max(0,endAt-now);
  const mm=String(Math.floor(left/60000)).padStart(2,'0'),ss=String(Math.floor(left%60000/1000)).padStart(2,'0');
  const back=useMemo(()=>{if(!choice)return '明日';const d=new Date(Date.now()+choice*60000);return new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',hour:'numeric',minute:'2-digit'}).format(d);},[choice,open]);
  const steps=t.steps;
  return <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent side="bottom" className="fu-sheet">
      <SheetHeader><SheetTitle>{t.title}</SheetTitle><SheetDescription>{t.lead}</SheetDescription></SheetHeader>
      <div className="fu-sheet-body">
        <div className="fu-signal"><span className="hand">{[...signal].slice(0,5).join('')}</span><div><b>ふたりの合図：「{signal}」</b><p>{t.signalNote}</p>
          {editSignal?<div className="fu-inline-actions"><input className="fu-input sm" value={signalDraft} maxLength={40} onChange={e=>setSignalDraft(e.target.value)} aria-label="ふたりの合図"/><button type="button" className="fu-btn ghost sm" disabled={busy||!signalDraft.trim()} onClick={()=>void save.settings({signal:signalDraft.trim()}).then(ok=>{if(ok)setEditSignal(false);})}>登録</button></div>
          :<button type="button" className="fu-text-btn" onClick={()=>{setSignalDraft(signal);setEditSignal(true);}}>合図を変える</button>}
        </div></div>
        <ol className="fu-steps">
          <li>{steps[0].title}<small>{steps[0].text}</small></li>
          <li>{steps[1].title}{steps[1].examples?.map(x=><small key={x}>「{x}」</small>)}</li>
          <li>{steps[2].title}
            <div className="fu-chips" role="group" aria-label="戻る時間">{steps[2].choices?.map(c=><button type="button" key={c.label} className={choice===c.minutes?'on':''} aria-pressed={choice===c.minutes} onClick={()=>setChoice(c.minutes)}>{c.label}</button>)}</div>
            <small>{steps[2].text} 戻る目安：{back}</small></li>
          <li>{steps[3].title}<small>{steps[3].text}</small></li>
          <li>{steps[4].title}<small>{steps[4].text}</small></li>
          <li>{steps[5].title}<small>{steps[5].text}</small></li>
        </ol>
        <p className="fu-note" style={{textAlign:'left'}}>{t.heartNote}</p>
        {endAt?<div className="fu-timer" role="timer" aria-live="off"><strong>{mm}:{ss}</strong><span>反論を考えるのはおやすみ。</span><button type="button" className="fu-text-btn" onClick={stop}>タイマーを止める</button></div>
        :phase==='ask'?<div className="fu-timer"><strong>時間になりました</strong><span>まだいっぱい？</span><div className="fu-choose"><button type="button" className="fu-btn ghost" onClick={()=>start(20)}>はい、もう一度休憩</button><button type="button" className="fu-btn ghost" onClick={()=>setPhase('resume')}>いいえ、再開する</button></div></div>
        :choice?<button type="button" className="fu-btn" onClick={()=>start(choice)}>{choice===60?'1時間':`${choice}分`}のタイマーを始める</button>:<p className="fu-note">明日、決めた時間に話し合いに戻りましょう。</p>}
        {phase==='resume'&&<div className="fu-resume"><p className="fu-step-h">再開のひとこと（やわらかい話し始め）</p><p>「私は〜と感じた。〜があって。〜してもらえるとうれしい。」</p></div>}
        <div className="fu-rephr"><h3>言いかえのヒント</h3>
          {troubleHints().map((r,i)=><div key={i} className="fu-pairrow"><span className="x">✕「{r.bad}」</span><br/><span className="o">○「{r.good}」</span></div>)}
        </div>
        <Teach ids={[...new Set(steps.flatMap(s=>s.sourceIds).concat(t.heartSourceIds))]}/>
      </div>
    </SheetContent>
  </Sheet>;
}
