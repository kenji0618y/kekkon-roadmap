import {useEffect,useMemo,useRef,useState} from 'react';
import {ArrowDownToLine,ArrowRight,ArrowUpRight,CalendarDays,Check,ChevronRight,Cloud,CloudCheck,Download,ExternalLink,Heart,HeartHandshake,House,Info,LoaderCircle,Map,MapPin,Printer,RefreshCw,Search,Settings2,ShieldCheck,Sparkles,Trash2,Users,X} from 'lucide-react';
import {toast} from 'sonner';
import {Tabs,TabsContent,TabsList,TabsTrigger} from './components/ui/tabs';
import {Accordion,AccordionContent,AccordionItem,AccordionTrigger} from './components/ui/accordion';
import {Sheet,SheetContent,SheetDescription,SheetHeader,SheetTitle} from './components/ui/sheet';
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from './components/ui/dialog';
import {AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,AlertDialogDescription,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle} from './components/ui/alert-dialog';
import {Input} from './components/ui/input';
import {Label} from './components/ui/label';
import {Toaster} from './components/ui/sonner';
import {Switch} from './components/ui/switch';
import {Checkbox} from './components/ui/checkbox';
import {Action,Choice,downloadText,EmptyState,SaveAction,SectionTitle,SourceLink,StatusMark} from './components/book-controls';
import {ProfileForm,TaskForm} from './components/notebook-forms';
import {chapters,emptyBook,inScope,isCeremonyTask,type AgreementRecord,type Book,type PracticeRecord,type Profile,type Task,type TaskRecord} from './lib/model';
import {calendarFile,deadlineText,difference,monthDay,nearestDeadline,shortDate,taskDeadlines,todayJapan} from './lib/dates';
import {backupText,readBackup} from './lib/backup';
import {useBook} from './lib/use-book';
import {DEFAULT_GIST_ID} from './lib/gist-sync';
import {DEFAULT_GROK_BASE,askGrokResearch,GROK_CREDITS_CONSOLE_URL,GROK_CREDITS_LIMIT_JA,isGrokCreditsLimitResult,loadGrokBase,loadGrokKey,saveGrokBase,saveGrokKey} from './lib/amity-grok';
import {clearGrokLocalOnly,markGrokLocalOnly} from './lib/grok-mode';
import {answerDeskQuery} from './lib/desk-chat';
import {DeskChatPanel} from './components/DeskChatPanel';
import {PairWorkbook} from './components/PairWorkbook';
import {MarriageDesk} from './components/MarriageDesk';
import {StampIllustBoard} from './components/StampIllustBoard';
import {ExcludeAndLiesPanel,HeroNumbersPanel,HomeInsightPanels,InstitutionalDeadlines,PhasesPanel} from './components/SeedContentPanels';
import {OnboardingSheet,isOnboardingDone,markOnboardingDone} from './components/OnboardingSheet';
import {PwaUpdateBanner} from './components/PwaUpdateBanner';
import {absoluteDeadlines,excludeItems,groups,homeContent,practices,relativeDeadlines,reviewedOn,sources,talks,taskById,tasks} from './data/catalog';
import {buildQuickSearchHits,groupQuickSearchHits,taskMatchesQuery,type QuickSearchHit} from './lib/quick-search';
import yearlyUpdateMd from './data/YEARLY_UPDATE.md?raw';
const typeLabels={procedure:'手続き',benefit:'給付・助成',tax:'税の制度',investment:'資産形成',contract:'契約の見直し',conversation:'ふたりで話す'};
const nav=[{id:'desk',label:'デスク',short:'デスク',icon:House},{id:'journey',label:'ロードマップ',short:'ロードマップ',icon:Map},{id:'deadlines',label:'期限と時期',short:'期限',icon:CalendarDays},{id:'pair',label:'ふたりの練習帳',short:'ふたり',icon:HeartHandshake},{id:'find',label:'制度を探す',short:'探す',icon:Search},{id:'settings',label:'ふたりの設定',short:'設定',icon:Settings2}];
type Modal='profile'|'pair'|null;
export default function FutureNotebook(){
 const [tab,setTab]=useState('desk'),[chapter,setChapter]=useState('prepare'),[groupId,setGroupId]=useState(groups[0].id),[chatOpen,setChatOpen]=useState(false);
 const [taskId,setTaskId]=useState<string|null>(null),[modal,setModal]=useState<Modal>(null),[dirty,setDirty]=useState(false),[pendingClose,setPendingClose]=useState<(()=>void)|null>(null);
 const [query,setQuery]=useState(''),[category,setCategory]=useState('all'),[scopeOnly,setScopeOnly]=useState(true),[statusFilter,setStatusFilter]=useState('all');
 const [resetOpen,setResetOpen]=useState(false),[resetTyped,setResetTyped]=useState(''),[resetAck,setResetAck]=useState(false);
 const [findOpenChapter,setFindOpenChapter]=useState('');
 const [joinCode,setJoinCode]=useState(''),[importDraft,setImportDraft]=useState<{book:Book,legacy:boolean}|null>(null);
 const uploadRef=useRef<HTMLInputElement>(null);
 const [syncToken,setSyncToken]=useState(''),[syncGistId,setSyncGistId]=useState(DEFAULT_GIST_ID),[syncEnabled,setSyncEnabled]=useState(false),[syncBusy,setSyncBusy]=useState(false);
 const [grokKey,setGrokKey]=useState(''),[grokBase,setGrokBase]=useState('');
 const [researchQ,setResearchQ]=useState(''),[researchBusy,setResearchBusy]=useState(false),[researchOut,setResearchOut]=useState('');
 const [onboardOpen,setOnboardOpen]=useState(false);
 const [quickOpen,setQuickOpen]=useState(false),[quickQ,setQuickQ]=useState('');
 const data=useBook(!!modal||!!taskId||dirty),book=data.book||emptyBook,p=book.profile,today=todayJapan();
 const scoped=useMemo(()=>tasks.filter(t=>inScope(t,p)),[p]);
 const actionable=scoped.filter(t=>book.records[t.id]?.status!=='na'),done=actionable.filter(t=>book.records[t.id]?.status==='done');
 const activeChapter=chapters.find(c=>c.id===chapter)!;
 const chapterGroups=groups.filter(g=>g.chapter===chapter&&scoped.some(t=>g.ids.includes(t.id)&&book.records[t.id]?.status!=='na'));
 const activeGroup=chapterGroups.find(g=>g.id===groupId)||chapterGroups[0];
 const task=taskId?taskById[taskId]:null;
 const dates=useMemo(()=>scoped.filter(t=>!['done','na'].includes(book.records[t.id]?.status||'todo')).flatMap(task=>taskDeadlines(task,p,book.records[task.id]).map(deadline=>({task,deadline}))).sort((a,b)=>(a.deadline.date||'9999').localeCompare(b.deadline.date||'9999')),[scoped,p,book.records]);
 const dated=dates.filter(x=>x.deadline.date),missingDates=dates.filter(x=>!x.deadline.date),soon=dated.filter(x=>difference(x.deadline.date,today)<=14);
 const next=actionable.filter(t=>!['done','applied','waiting'].includes(book.records[t.id]?.status||'todo')).sort((a,b)=>{
  const da=nearestDeadline(a,p,book.records[a.id])?.date||'9999',db=nearestDeadline(b,p,book.records[b.id])?.date||'9999';
  if(da!==db)return da.localeCompare(db);const priority=['A無1','A必1','P1','A必3','C14-1'];const ai=priority.indexOf(a.id),bi=priority.indexOf(b.id);return (ai<0?999:ai)-(bi<0?999:bi);
 }).slice(0,3);
 const filtered=tasks.filter(t=>(p.ceremony!=='no'||!isCeremonyTask(t))&&(!scopeOnly||inScope(t,p))&&(category==='all'||t.chapter===category)&&(statusFilter==='all'||(book.records[t.id]?.status||'todo')===statusFilter)&&(!query||taskMatchesQuery(t,query)));
 useEffect(()=>{
  if(!filtered.length){setFindOpenChapter('');return;}
  if(category!=='all'){setFindOpenChapter(category);return;}
  if(query.trim()){
   const first=chapters.find(c=>filtered.some(t=>t.chapter===c.id));
   setFindOpenChapter(first?.id||'');
   return;
  }
  if(!findOpenChapter||!filtered.some(t=>t.chapter===findOpenChapter)){
   const first=chapters.find(c=>filtered.some(t=>t.chapter===c.id));
   setFindOpenChapter(first?.id||'');
  }
 },[query,category,statusFilter,scopeOnly,filtered.length,p]);

 const firstSteps=tasks.filter(t=>['prepare','life'].includes(t.chapter)&&inScope(t,p)&&book.records[t.id]?.status!=='na');
 const newLifeReady=firstSteps.length>0&&firstSteps.every(t=>book.records[t.id]?.status==='done');
 const callClose=(action:()=>void)=>{if(data.busy)return;if(dirty)setPendingClose(()=>action);else{setDirty(false);action();}};
 const forceClose=()=>{setDirty(false);setTaskId(null);setModal(null);};
 const openTask=(id:string)=>{setDirty(false);setTaskId(id);};
 const quickHits=useMemo(()=>buildQuickSearchHits({query:quickQ,tasks,absoluteDeadlines,relativeDeadlines,practices,talks,includeTask:t=>p.ceremony!=='no'||!isCeremonyTask(t),limit:20}),[quickQ,p.ceremony]);
 const quickGroups=useMemo(()=>groupQuickSearchHits(quickHits),[quickHits]);
 const runQuickHit=(hit:QuickSearchHit)=>{setQuickOpen(false);setQuickQ('');if(hit.tab)setTab(hit.tab);if(hit.taskId){if(hit.tab==='find')setQuery(hit.title);requestAnimationFrame(()=>openTask(hit.taskId!));}else if(hit.scrollId){requestAnimationFrame(()=>document.getElementById(hit.scrollId!)?.scrollIntoView({behavior:'smooth',block:'start'}));}else if(hit.kind==='pair'){/* pair tab only */}else if(hit.tab==='find'&&quickQ.trim()){setQuery(quickQ.trim());}};
 const openProfile=()=>{callClose(()=>{setTaskId(null);setDirty(false);setModal('profile');});};
 const selectChapter=(id:string)=>{setChapter(id);setGroupId(groups.find(g=>g.chapter===id&&scoped.some(t=>g.ids.includes(t.id)&&book.records[t.id]?.status!=='na'))?.id||groups.find(g=>g.chapter===id)?.id||'');};
 const saveRecord=async(r:TaskRecord)=>{if(!task)return;const result=await data.mutate({action:'record',id:task.id,record:r},r.status==='done'?'記録を保存しました':'ふたりの記録を保存しました');if(result)forceClose();};
 const saveProfile=async(profile:Profile)=>{if(await data.mutate({action:'profile',profile},'ふたりに合わせて手帳を整えました'))forceClose();};
 const savePractice=(id:string,record:PracticeRecord)=>{void data.mutate({action:'practice',id,record},'');};
 const saveAgreement=(id:string,record:AgreementRecord)=>{void data.mutate({action:'agreement',id,record},'この話題を保存しました');};
 const exportBackup=()=>{if(!data.book){toast.info('手帳を始めてから保存できます');return;}downloadText(`futari-miraicho-${today}.json`,backupText(data.book));toast.success('バックアップを書き出しました');};
 const exportCalendar=()=>{if(!dated.length){toast.info('基準の日付か予定日を設定してください');return;}downloadText('amity-chan-ni-kiku.ics',calendarFile(dated),'text/calendar;charset=utf-8');toast.success('予定を書き出しました。お使いのカレンダーに読み込んでください。');};
 const loadBackup=async(file:File)=>{try{if(file.size>2000000)throw new Error('2MB以内のJSONファイルを選んでください。');setImportDraft(readBackup(JSON.parse(await file.text())));}catch(e){toast.error(e instanceof Error?e.message:'読み込めませんでした');}};
 useEffect(()=>{setSyncToken(data.syncConfig.token);setSyncGistId(data.syncConfig.gistId);setSyncEnabled(data.syncConfig.enabled);},[data.syncConfig.token,data.syncConfig.gistId,data.syncConfig.enabled]);
 useEffect(()=>{try{setGrokKey(localStorage.getItem('amity-grok-key')||'')}catch{setGrokKey('')}setGrokBase(loadGrokBase());},[]);
 useEffect(()=>{
  if(data.phase!=='ready')return;
  if(isOnboardingDone())return;
  const unset=!data.book||(p.ward==='未設定'&&!p.name1&&!p.name2);
  if(unset)setOnboardOpen(true);
 },[data.phase,data.book,p.ward,p.name1,p.name2]);
 useEffect(()=>{if(!dirty)return;const before=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',before);return()=>window.removeEventListener('beforeunload',before);},[dirty]);
 const resetStampProgress=async()=>{if(resetTyped!=='リセット'||!resetAck)return;const result=await data.mutate({action:'resetRecords'},'スタンプ進捗をリセットしました（プロフィール・記念は残しています）');if(result){setResetOpen(false);setResetTyped('');setResetAck(false);}};
 const persistSync=(override?:Partial<{token:string,gistId:string,enabled:boolean}>)=>{data.saveSyncSettings({token:override?.token??syncToken,gistId:override?.gistId??syncGistId,enabled:override?.enabled??syncEnabled});};
 const runSyncAction=async(fn:()=>Promise<unknown>)=>{setSyncBusy(true);try{persistSync();const result=await fn();if(typeof result==='string')toast.success(result);}catch(e){toast.error(e instanceof Error?e.message:'同期に失敗しました',{duration:8000});}finally{setSyncBusy(false);}};
 const syncStatusLabel=data.syncStatus==='syncing'?'同期中':data.syncStatus==='ok'?'同期OK':data.syncStatus==='error'?'エラー':'オフ';
 const lastSyncLabel=data.lastSyncAt?new Date(data.lastSyncAt).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo'}):'—';
 const renderTask=(t:Task,compact=false)=>{const r=book.records[t.id],deadline=nearestDeadline(t,p,r);return <button key={t.id} className={`task-row ${compact?'compact':''} ${r?.status==='done'?'task-done':''}`} onClick={()=>openTask(t.id)}><span className="task-circle">{r?.status==='done'?<Check size={17}/>:t.type==='conversation'?<Heart size={16}/>:<span/>}</span><span className="task-row-body"><span className="task-row-top"><span className="task-type">{typeLabels[t.type]}</span>{r&&<StatusMark status={r.status}/>}</span><strong>{t.title}</strong>{!compact&&<span className="task-summary">{t.summary}</span>}<span className="task-meta">{deadline&&!['done','na'].includes(r?.status||'')&&<span className={difference(deadline.date,today)<=7?'urgency':''}><CalendarDays size={13}/>{monthDay(deadline.date)} · {deadline.kind==='personal'?'予定':deadline.uncertain?'原則日':'届出期限'}</span>}{r?.assignee&&<span><Users size={13}/>{r.assignee==='together'?'二人で':r.assignee==='one'?p.name1||'一人目':p.name2||'二人目'}</span>}</span></span><ChevronRight size={17}/></button>;};
 return <><a className="skip-link" href="#main-content">本文へ進む</a><Toaster theme="light" position="top-center" richColors/><PwaUpdateBanner/>
 <Tabs value={tab} onValueChange={setTab} className="notebook-tabs">
 <header className="masthead site-header"><div className="masthead-inner"><button className="brand" onClick={()=>setTab('desk')} aria-label="Amityちゃんにきく ホーム"><span className="brand-seal">結</span><span className="wordmark">Amityちゃんにきく<small>AMITY CHAN NI KIKU · 広島</small></span></button><div className="header-right"><button type="button" className="header-search-btn" onClick={()=>{setQuickOpen(true);setQuickQ('');}} aria-label="項目・画面・期限を検索"><Search size={16}/><span>検索</span></button><span className="city-tag"><MapPin size={15}/>広島市{p.ward!=='未設定'?` ${p.ward}`:''}</span><button className="pair-pill" onClick={()=>setModal('pair')}><Users size={16}/><span>ふたりで使う</span></button><span className="save-status header-save" role="status">{data.busy?<><LoaderCircle className="spin" size={14}/>保存中</>:data.phase==='loading'?<>読み込み中…</>:data.phase==='error'?<>接続を確認</>:data.book?<><CloudCheck size={15}/>この端末に保存済み</>:<>まだ手帳を始めていません</>}</span></div></div>
 <div className="nav-wrap"><TabsList className="main-nav" aria-label="メインメニュー">{nav.map(n=><TabsTrigger key={n.id} value={n.id}><n.icon/><span className="nav-label-full">{n.label}</span><span className="nav-label-short">{n.short}</span>{n.id==='deadlines'&&soon.length>0&&<i className="nav-dot"/>}</TabsTrigger>)}</TabsList></div></header>
 <main className="workspace" id="main-content">
 {data.error&&<div className="connection-error" role="alert"><Info size={18}/><p>{data.error}</p><button onClick={()=>void data.refresh()}>再読み込み</button></div>}
 <TabsContent value="desk" className="tab-surface">
 <div className="welcome-line"><div><p className="eyebrow">OUR DESK</p><h1>{p.name1&&p.name2?`${p.name1}さんと${p.name2}さんの、これから。`:'ふたりの未来に、小さな一歩を。'}</h1><p className="muted">いまの進みぐあいと、次にやることをまとめた画面です。項目はマップ、締切と時期の流れは期限のタブにあります。</p></div></div>
 <MarriageDesk book={book} profile={p} scoped={scoped} actionable={actionable} done={done} soonCount={soon.length} today={today} hasBook={!!data.book} syncStatus={data.syncStatus} onOpenTask={openTask} onOpenProfile={openProfile} onGoJourney={()=>setTab('journey')} onOpenSettings={()=>setTab('settings')} onGoDeadlines={()=>{setTab('deadlines');requestAnimationFrame(()=>document.getElementById('institutional-deadlines')?.scrollIntoView({behavior:'smooth',block:'start'}));}} onGoFind={(kw)=>{if(kw)setQuery(kw);setTab('find');}}/>
 <HomeInsightPanels
  onOpenTask={openTask}
  profile={p}
  fillNext={next.map(t=>({id:t.id,title:t.title,sub:nearestDeadline(t,p,book.records[t.id])?'期限・予定を確認':typeLabels[t.type]}))}
  isStampOpen={(id)=>{const t=tasks.find(x=>x.id===id);if(t&&!inScope(t,p))return false;const st=book.records[id]?.status||'todo';return !['done','applied','waiting','na'].includes(st);}}
 />
 </TabsContent>
 <TabsContent value="journey" className="tab-surface">
 <div className="section-heading" id="journey-stamp-board"><div><p className="eyebrow">OUR JOURNEY</p><h2>スタンプで進める、暮らしロードマップ</h2><p className="hint" style={{marginTop:6}}>章を選んで、絵の縁にあるスタンプを押していきます。項目の多い章は、絵が何枚かに分かれます。</p></div></div>
 <div className="chapter-nav" role="group" aria-label="暮らしの章">{chapters.map(c=>{const count=scoped.filter(t=>t.chapter===c.id&&book.records[t.id]?.status!=='na');const n=count.filter(t=>book.records[t.id]?.status==='done').length;return <button key={c.id} className={chapter===c.id?'active':''} onClick={()=>selectChapter(c.id)} aria-pressed={chapter===c.id}><span className="chapter-kanji">{c.kanji}</span><span>{c.label}<small>{count.length?`${n} / ${count.length}`:'必要になったら'}</small></span>{count.length>0&&n===count.length&&<Check size={15}/>}</button>;})}</div>
 <section className="journey-panel"><div className="journey-heading"><div><span className="eyebrow">{activeChapter.en}</span><h3>{activeChapter.description}</h3></div><span className="hint">絵の縁のスタンプを押すと、その項目が開きます。</span></div>
 {chapter==='child'&&['unknown','none'].includes(p.child)?<EmptyState symbol={<Heart/>} title="必要になった時に、この章を。" action={<Action secondary onClick={openProfile}>表示する段階を選ぶ</Action>}>妊娠・出産・子育ての項目は、今の二人の希望に合わせて開けます。</EmptyState>:!chapterGroups.length?<EmptyState symbol={<Map/>} title="この章に、今の二人向けのスタンプはありません。" action={<Action secondary onClick={openProfile}>ふたりの設定を開く</Action>}>式の有無や働き方を変えると、表示されるマスが変わります。</EmptyState>:<>
 <StampIllustBoard groups={chapterGroups} tasksFor={g=>scoped.filter(t=>g.ids.includes(t.id)&&book.records[t.id]?.status!=='na')} recordStatus={id=>book.records[id]?.status} activeId={activeGroup?.id} onSelectGroup={setGroupId} onPressStamp={openTask}/>

 </>}
 </section>
 <div className={`milestone ${newLifeReady?'reached':''}`}><span className="milestone-seal">進</span><div><h3>{newLifeReady?'結婚準備と新生活の項目をひと通り確認しました。':'一歩ずつ、ふたりの暮らしに。'}</h3><p>{newLifeReady?'ほかの章や期限タブで、次の一歩を続けられます。':'結婚準備と新生活の項目を進めると、ここに進捗がまとまります。'}</p></div></div>
 </TabsContent>
 <TabsContent value="deadlines" className="tab-surface deadlines-tab">
 <SectionTitle eyebrow="期限と時期" title="期限と、ふたりの予定。" sub="数字 → 制度 → 予定 → 時期。上から順に、いま必要な節だけ開けば足ります。"><Action secondary onClick={exportCalendar} disabled={!dated.length}><Download/>カレンダーに書き出す</Action></SectionTitle>
 <nav className="deadlines-mini-nav" aria-label="期限タブ内の節">
  <a href="#deadline-block-hero">数字</a>
  <a href="#institutional-deadlines">制度</a>
  <a href="#deadline-block-schedule">予定</a>
  <a href="#deadline-block-phases">時期</a>
 </nav>
 <section id="deadline-block-hero" className="deadline-block" aria-label="覚えておきたい数字">
  <h2 className="deadline-block-label">覚えておきたい数字</h2>
  <p className="deadline-block-intro">いまの二人の前提に合わせて並べた、覚えておきたい目安です。</p>
  <HeroNumbersPanel profile={p}/>
 </section>
 <section id="deadline-block-institutional" className="deadline-block" aria-label="制度の期限">
  <h2 className="deadline-block-label">制度の期限</h2>
  <p className="deadline-block-intro">日付が決まっている締切と、届出の相対期限。近いものだけ先に出します。</p>
  <InstitutionalDeadlines child={p.child} home={p.home}/>
 </section>
 <section id="deadline-block-schedule" className="deadline-block" aria-label="これからの予定">
  <h2 className="deadline-block-label">これからの予定</h2>
  <p className="deadline-block-intro">二人の手帳に入っている日付つきの予定と、未設定の項目です。</p>
  <div className="schedule-layout schedule-layout-solo"><section className="schedule-main"><div className="schedule-summary"><div><strong>{dated.length}</strong><span>日付のある予定</span></div><div><strong>{soon.length}</strong><span>14日以内・経過した原則日</span></div><button onClick={openProfile}><Settings2 size={17}/>基準の日付を整える</button></div>
 {dated.length?<div className="timeline timeline-dense">{dated.map(({task:t,deadline:d},i)=><button className={`timeline-item ${difference(d.date,today)<=7?'near':''}`} key={`${t.id}-${d.kind}`} onClick={()=>openTask(t.id)}><span className="timeline-date"><small>{d.date.slice(0,4)}年</small><strong>{monthDay(d.date)}</strong><span>{new Intl.DateTimeFormat('ja-JP',{weekday:'short',timeZone:'UTC'}).format(new Date(d.date+'T00:00:00Z'))}曜日</span></span><span className="timeline-body"><span className="timeline-top"><span className={`status ${d.kind==='personal'?'status-learned':''}`}>{d.kind==='personal'?'二人の予定':d.uncertain?'原則日・要確認':'届出期限'}</span><span className="countdown">{deadlineText(d.date,today)}</span></span><strong>{t.title}</strong><span>{d.basis}</span></span><ChevronRight size={18}/></button>)}</div>:<EmptyState symbol={<CalendarDays/>} title="次の予定を、ひとつ決めよう。" action={<Action secondary onClick={openProfile}>基準の日付を設定する</Action>}>日付が分かれば期限を確認できます。各項目に、二人で決めた予定日を入れることもできます。</EmptyState>}
 {missingDates.length>0&&<details className="missing-dates missing-dates-fold"><summary><strong>日付が分かったら確認</strong><span className="hint">{missingDates.length}件 · 閉じたまま大丈夫</span></summary>{missingDates.map(({task:t,deadline:d})=><button key={t.id} onClick={()=>openTask(t.id)}><span><strong>{t.title}</strong><small>{d.missing}が未設定</small></span><ChevronRight size={16}/></button>)}</details>}
 <details className="paper-card schedule-tips-fold">
  <summary><strong>窓口・カレンダーのメモ</strong><span className="hint">必要なときだけ開く</span></summary>
  <div className="schedule-tips-body">
   <div><h3>窓口へ行く、その前に。</h3><p>表示した日付は原則の計算です。対象条件や受付方法も、各手続きの公式案内で確認してください。</p><p>出生届の休日補正は、確認できた2026・2027年の祝日を使っています。それ以外の年や他の手続きの休日は、窓口への確認を表示します。</p><SourceLink source={sources.holidays} compact/></div>
   <div><h3>いつものカレンダーへ。</h3><p>書き出したファイルをGoogle・Appleなどのカレンダーへ読み込めます。3日前の通知を含みますが、通知されるかはカレンダー側の設定によります。</p><p className="hint">この手帳自体から通知は届きません。予定を変えた場合は、取り込んだ予定も更新してください。</p></div>
  </div>
 </details>
 </section></div>
 </section>
 <section id="deadline-block-phases" className="deadline-block phases-in-deadlines" aria-label="時期の区切り">
  <details className="deadline-phases-fold">
   <summary>
    <h2 className="deadline-block-label">時期の区切り</h2>
    <span className="hint">結婚前後から暮らしまでの案内（スタンプの進みぐあいとは別）</span>
   </summary>
   <PhasesPanel/>
  </details>
 </section>
</TabsContent>
 <TabsContent value="pair" className="tab-surface pair-tab"><SectionTitle eyebrow="ふたりの練習帳" title="スタンプで試す、日々の過ごし方。" sub="行動・会話・合意をスタンプ台で。押して試し、合わなければやめる表です。"/>
  <PairWorkbook book={book} busy={data.busy} onSavePractice={savePractice} onSaveAgreement={saveAgreement}/>
 </TabsContent>
 <TabsContent value="find" className="tab-surface find-tab"><SectionTitle eyebrow="制度を探す" title="二人に必要な制度を探す。" sub={`手続き、税、勤務先の制度、暮らしの工夫。${tasks.length}項目を収録しています。`}/>
 <div className="search-panel find-search-sticky"><label className="search-box"><Search size={21}/><Input aria-label="制度を検索" value={query} onChange={e=>setQuery(e.target.value)} placeholder="例：結婚祝金、引っ越し、NISA、育休…"/>{query&&<button className="icon-button" onClick={()=>setQuery('')} aria-label="検索をクリア"><X size={17}/></button>}</label><div className="search-filters find-filters-compact"><Choice label="暮らしの章" value={category} onChange={setCategory} options={{all:'すべての章',...Object.fromEntries(chapters.map(c=>[c.id,c.label]))}}/><Choice label="記録の状況" value={statusFilter} onChange={setStatusFilter} options={{all:'すべての状況',todo:'これから',learned:'確認した',preparing:'準備中',applied:'申請した',waiting:'結果待ち',done:'完了',na:'今回は対象外'}}/><label className="scope-toggle"><Switch checked={scopeOnly} onCheckedChange={setScopeOnly}/><span>いまの二人の候補だけ</span></label></div></div>
 <div className="results-label"><strong>{filtered.length}件</strong><span>章ごとにまとめています。表示は対象の確定ではありません。</span></div>
 {filtered.length?<Accordion type="single" collapsible value={findOpenChapter} onValueChange={v=>setFindOpenChapter(v||'')} className="find-by-chapter">
  {(category==='all'?chapters:chapters.filter(c=>c.id===category)).map(c=>{
   const rows=filtered.filter(t=>t.chapter===c.id);
   if(!rows.length)return null;
   return <AccordionItem key={c.id} value={c.id}>
    <AccordionTrigger><span className="find-chapter-trigger"><span className="chapter-kanji">{c.kanji}</span><span>{c.label}</span><strong>{rows.length}件</strong></span></AccordionTrigger>
    <AccordionContent><section className="results-list find-chapter-list">{rows.map(t=>renderTask(t))}</section></AccordionContent>
   </AccordionItem>;
  })}
 </Accordion>:<EmptyState symbol={<Search/>} title="当てはまる項目がありません。" action={<Action secondary onClick={()=>{setQuery('');setCategory('all');setStatusFilter('all');setScopeOnly(true);setFindOpenChapter('');}}>条件をリセットする</Action>}>短い言葉で探すか、章や状況の条件を変えてみてください。</EmptyState>}
 <details className="find-exclude-outer paper-card">
  <summary>
   <strong>思い込み・もらえない制度（{homeContent.lies_not_to_buy.length}+{excludeItems.length}）</strong>
   <span className="hint">検索のあとで読む用 · 誤解 {homeContent.lies_not_to_buy.length} · 対象外 {excludeItems.length}</span>
  </summary>
  <ExcludeAndLiesPanel/>
 </details>
 </TabsContent>
 <TabsContent value="settings" className="tab-surface"><SectionTitle eyebrow="MAKE THIS NOTEBOOK YOURS" title="ふたりらしい手帳に。" sub="呼び名、共有、バックアップ。いつでも整え直せます。"/>
 <div className="settings-grid"><section id="settings-profile" className="paper-card settings-card"><div className="settings-icon"><Users/></div><h2>ふたりのプロフィール</h2><p className="profile-names">{p.name1||'一人目'} <span>&</span> {p.name2||'二人目'}</p><dl><div><dt>住まい</dt><dd>広島市 {p.ward==='未設定'?'（区は未設定）':p.ward}</dd></div><div><dt>婚姻日・予定日</dt><dd>{p.wdate?shortDate(p.wdate):'未設定'}</dd></div><div><dt>子育ての章</dt><dd>{['unknown','none'].includes(p.child)?'表示していません':'選んだ段階を表示'}</dd></div></dl><Action secondary onClick={openProfile}>プロフィールを整える<ArrowRight/></Action></section>
 <section className="paper-card settings-card"><div className="settings-icon"><Heart/></div><h2>同じ手帳を、二人で。</h2><p>招待コードは未対応です。端末間は<strong>バックアップの書き出し／読み込み</strong>、または下の<strong>GitHub Gist 同期</strong>で受け渡してください。</p><div className="stack-actions"><Action secondary onClick={exportBackup} disabled={!data.book}><Download/>バックアップを書き出す</Action><Action secondary onClick={()=>{const el=document.getElementById('settings-gist-sync');el?.scrollIntoView({behavior:'smooth',block:'start'});}}><Cloud/>Gist同期へ</Action></div></section>
 <section className="paper-card settings-card"><div className="settings-icon"><ShieldCheck/></div><h2>この端末に保存します。</h2><p>進捗・メモ・金額はブラウザ内に残ります。端末を変えるときはバックアップJSONを書き出してください。</p><p className="hint">二人で使う場合は、バックアップの受け渡しか「ふたりで使う」から始めてください。</p><div className="stack-actions"><Action secondary onClick={exportBackup}><Download/>バックアップを書き出す</Action></div></section>
 <section id="settings-gist-sync" className="paper-card settings-card"><div className="settings-icon"><Cloud/></div><h2>端末どうしで同期（GitHub Gist）</h2><p>Device A の保存を secret Gist へ送り、Device B が取り込みます。双方向です。</p><p className="hint"><strong>同期用の secret Gist は用意済み</strong>です（IDは下欄に初期入力）。あとは<strong>各端末で gist 権限の PAT を入力</strong>し、同期を有効にしてください。PATはリポジトリに書きません。</p><p className="hint">PATは<strong>この端末のブラウザ内（localStorage）のみ</strong>。gist scope の fine-grained / classic PAT が必要です。MVPは<strong>同じアカウントのPATを両端末で使う</strong>のが簡単です。</p><label className="scope-toggle" style={{marginBottom:14}}><Switch checked={syncEnabled} onCheckedChange={v=>{setSyncEnabled(v);data.saveSyncSettings({token:syncToken,gistId:syncGistId||DEFAULT_GIST_ID,enabled:v});}}/><span>Gist同期を有効にする</span></label><div className="field" style={{width:'100%',marginBottom:12}}><Label htmlFor="gist-pat">GitHub PAT（password）</Label><Input id="gist-pat" type="password" autoComplete="off" value={syncToken} onChange={e=>setSyncToken(e.target.value)} onBlur={()=>persistSync({gistId:syncGistId||DEFAULT_GIST_ID})} placeholder="ghp_… または github_pat_…" maxLength={200}/></div><div className="field" style={{width:'100%',marginBottom:12}}><Label htmlFor="gist-id">Gist ID（用意済み・変更可）</Label><Input id="gist-id" value={syncGistId} onChange={e=>setSyncGistId(e.target.value)} onBlur={()=>persistSync({gistId:syncGistId||DEFAULT_GIST_ID})} placeholder={DEFAULT_GIST_ID} maxLength={64} autoComplete="off"/><p className="hint" style={{marginTop:6}}>初期値 {DEFAULT_GIST_ID}</p></div><p className="hint">状態：{syncStatusLabel} · 最終同期：{lastSyncLabel}</p><div className="stack-actions"><Action secondary disabled={syncBusy||!syncToken.trim()} onClick={()=>void runSyncAction(async()=>{persistSync({token:syncToken,gistId:syncGistId||DEFAULT_GIST_ID,enabled:syncEnabled});const id=await data.createGistNow();setSyncGistId(id);setSyncEnabled(true);return `secret Gistを作成しました（${id.slice(0,8)}…）`;})}>Gistを新規作成</Action><Action secondary disabled={syncBusy||!syncToken.trim()||!(syncGistId||DEFAULT_GIST_ID).trim()} onClick={()=>void runSyncAction(()=>{persistSync({gistId:syncGistId||DEFAULT_GIST_ID});return data.syncNow();})}>今すぐ同期</Action><Action secondary disabled={syncBusy||!syncToken.trim()} onClick={()=>void runSyncAction(()=>{persistSync({gistId:syncGistId||DEFAULT_GIST_ID});return data.testSync();})}>接続テスト</Action></div><p className="hint">ファイル名は futari-miraicho.json。公開Gistにはしません（secret）。</p>
<p className="hint" style={{marginTop:10}}><strong>GitHubで接続（推奨）</strong>：端末フロー（device flow）OAuth は準備中です。いまは PAT 入力で同期できます。PATはリポジトリに書き込みません。</p></section>
 <section id="settings-research" className="paper-card settings-card"><div className="settings-icon"><Search/></div><h2>今の制度を調べる</h2><p>気になる制度・手続きを入力すると、Amity（Grok）が短く調べます。端末内の「制度を探す」にも同じ言葉で飛べます。</p><div className="field" style={{width:'100%',marginBottom:12}}><Label htmlFor="policy-research-q">調べたいこと</Label><Input id="policy-research-q" value={researchQ} onChange={e=>setResearchQ(e.target.value)} placeholder="例：広島市 児童手当 申請、転入届の期限…" maxLength={200} autoComplete="off" disabled={researchBusy}/></div><div className="stack-actions"><Action secondary disabled={researchBusy||!researchQ.trim()} onClick={()=>void(async()=>{const q=researchQ.trim().slice(0,200);if(!q)return;setResearchBusy(true);setResearchOut('');try{const r=await askGrokResearch(q);if(r.ok)setResearchOut(r.text);else if(r.error==='no-key'){markGrokLocalOnly('no-key');setResearchOut('Grokキーがありません。下の「Amityちゃん · Grok 深掘り」にキーを入れるか、まず「制度を探す」で確認してね。');toast.info('キー未設定のため探すタブへ');setQuery(q);setTab('find');}else if(isGrokCreditsLimitResult(r.error)){markGrokLocalOnly('credits-limit');const local=answerDeskQuery(q,3,p);setResearchOut(`${GROK_CREDITS_LIMIT_JA}\n\n—— 端末内の案内 ——\n${local.text}`);toast.error(GROK_CREDITS_LIMIT_JA,{duration:8000});}else{setResearchOut(`調べられなかったよ（${r.error}）。公式案内もあわせて確認してね。`);toast.error('調べに失敗しました');}}finally{setResearchBusy(false);}})()}>{researchBusy?<><LoaderCircle className="spin" size={16}/>調べています…</>:<><Sparkles size={16}/>Amityに調べてもらう</>}</Action><Action secondary disabled={!researchQ.trim()} onClick={()=>{setQuery(researchQ.trim());setTab('find');}}>制度を探すで見る<ArrowRight/></Action></div>{researchOut&&<div className="research-result" role="status"><p className="hint" style={{marginBottom:6}}>Amityの調べメモ（金額は勝手に作りません。結婚新生活支援は広島市では受けられません）</p><p style={{whiteSpace:'pre-wrap',fontSize:13,lineHeight:1.55,margin:0}}>{researchOut}</p></div>}<p className="hint" style={{marginTop:10}}>{loadGrokKey()?'キーあり：Grok深掘りが使えます。':'キー未設定でも「制度を探す」には飛べます。'}</p></section>
 <section id="settings-grok" className="paper-card settings-card"><div className="settings-icon"><Sparkles/></div><h2>Amityちゃん · Grok 深掘り</h2><p>質問すると端末内検索に加え、xAI の Grok で調べた日本語の答えを足せるよ。キーはこの端末の localStorage のみ（リポジトリには書かない）。</p><div className="field" style={{width:'100%',marginBottom:12}}><Label htmlFor="amity-grok-key">xAI (Grok) APIキー（password）</Label><Input id="amity-grok-key" type="password" autoComplete="off" value={grokKey} onChange={e=>setGrokKey(e.target.value)} onBlur={()=>{saveGrokKey(grokKey);if(grokKey.trim()){clearGrokLocalOnly();}else{markGrokLocalOnly('no-key');}toast.success(grokKey.trim()?'Grokキーをこの端末に保存しました':'Grokキーを削除しました');}} placeholder="キーを貼り付け（任意）" maxLength={200}/></div><div className="field" style={{width:'100%',marginBottom:12}}><Label htmlFor="amity-grok-base">API base URL（任意・OpenAI互換）</Label><Input id="amity-grok-base" value={grokBase} onChange={e=>setGrokBase(e.target.value)} onBlur={()=>{saveGrokBase(grokBase||DEFAULT_GROK_BASE);setGrokBase(loadGrokBase());}} placeholder={DEFAULT_GROK_BASE} maxLength={200} autoComplete="off"/><p className="hint" style={{marginTop:6}}>初期値 {DEFAULT_GROK_BASE} · モデル grok-3</p></div><p className="hint">localStorageのキーが優先。空ならアプリ同梱の難読化キー（実行時デコード）を使う。未設定でも端末内の回答は使えるよ。上書きしたいときだけここに入力。</p>
<p className="hint" style={{marginTop:8}}><strong>深掘りには xAI のクレジットが必要</strong>です。このアプリからは購入できません。枠が上限のときは <a href={GROK_CREDITS_CONSOLE_URL} target="_blank" rel="noopener noreferrer">xAI コンソール（console.x.ai）</a> で枠を増やしてください。</p>
<div className="stack-actions" style={{marginTop:10}}><Action secondary onClick={()=>window.open(GROK_CREDITS_CONSOLE_URL,'_blank','noopener,noreferrer')}><ExternalLink size={16}/>クレジットを増やす（xAIコンソール）</Action></div>
</section>
 <section id="settings-backup" className="paper-card settings-card"><div className="settings-icon"><ArrowDownToLine/></div><h2>大切な記録を手元にも。</h2><p>バックアップには、名前・日付・メモを含みます。保管先と渡す相手を選んでください。</p><input ref={uploadRef} type="file" accept=".json,application/json" className="sr-only" aria-label="手帳のバックアップ" onChange={e=>{const file=e.target.files?.[0];if(file)void loadBackup(file);e.target.value='';}}/><div className="stack-actions"><Action secondary onClick={exportBackup} disabled={!data.book}><Download/>バックアップを書き出す</Action><Action secondary onClick={()=>uploadRef.current?.click()}><ArrowUpRight/>バックアップ・旧版を読み込む</Action><Action secondary onClick={()=>window.print()}><Printer/>手帳を印刷・PDFにする</Action></div><p className="hint">旧版は書き出したJSONに対応しています。データはこの端末に自動移行されません。</p></section>
 <section className="paper-card settings-card settings-dev-fold"><div className="settings-icon"><RefreshCw/></div><details className="yearly-fold"><summary><h2>開発者向け · 毎年更新メモ</h2><span className="hint">友人利用では閉じたままにしてください</span></summary><p className="hint">開発用のメモです。年に一度、締切や対象条件を見直すときの手順が書いてあります。</p><pre className="yearly-update-pre">{yearlyUpdateMd}</pre></details></section>
 <section className="paper-card settings-card danger-reset-card"><div className="settings-icon"><Trash2/></div><h2>スタンプ進捗をリセット</h2><p>各項目のスタンプ状態・金額・メモ（records）だけを消します。プロフィールと記念手帳の文章は残します。バックアップを先に書き出すことをおすすめします。</p><p className="hint">誤タップ防止のため、確認ダイアログで「リセット」と入力し、もう一度チェックを入れる必要があります。</p><div className="stack-actions"><Action secondary onClick={()=>{setResetTyped('');setResetAck(false);setResetOpen(true);}} disabled={!data.book||data.busy}><Trash2/>スタンプ進捗をリセット…</Action></div></section>
</div>
 <section className="source-policy paper-card"><div><ShieldCheck size={25}/><h2>安心して確かめるために。</h2><p>この手帳は、制度を調べて手続きを進めるための案内です。給付や税の適用は、二人の条件と申請先の判断で決まります。</p><p>内容を確認した日を参照先ごとに表示しています。未確認の案内はその旨を表示し、勤務先・契約ごとの条件は窓口への質問としてまとめています。</p><p>制度の更新は自動配信されません。申請・契約の前には、公式案内と予算・受付状況を再確認してください。</p></div><div><h3>使い続けるためのメモ</h3><ul><li>記録はこの端末のブラウザに保存されます（localStorage）。</li><li>端末間同期は設定の「GitHub Gist」から有効にできます（PATは端末内のみ）。</li><li>Amityちゃんの Grok 深掘り用 xAI APIキーも設定に保存できます（端末内のみ）。</li><li>バックアップJSONの書き出し／読み込みも引き続き使えます。</li><li>招待コード・アカウント共有はこの公開版では使えません。</li><li>スマートフォンのブラウザーの「ホーム画面に追加」から、すぐ開けるようにできます。</li></ul><button className="text-button" onClick={()=>void data.refresh()}><RefreshCw size={15}/>最新の保存内容を読み込む</button></div></section>
 </TabsContent>
 <footer className="book-footer"><span>Amityちゃんにきく · 広島市 · 確認日 {reviewedOn}</span></footer>
 </main></Tabs>
 <Sheet open={!!task} onOpenChange={open=>{if(!open)callClose(forceClose);}}><SheetContent side="right" className="task-sheet"><SheetHeader><span className="eyebrow">{task?typeLabels[task.type]:''} <i> / </i> ふたりの一歩</span><SheetTitle>{task?.title}</SheetTitle><SheetDescription>{task?.summary}</SheetDescription></SheetHeader>{task&&<TaskForm key={task.id} task={task} profile={p} record={book.records[task.id]} onSave={saveRecord} busy={data.busy} onDirty={setDirty} hasBook={!!data.book} onProfile={openProfile}/>}</SheetContent></Sheet>
 <Dialog open={!!modal} onOpenChange={open=>{if(!open)callClose(forceClose);}}><DialogContent className={`notebook-dialog dialog-${modal}`}><DialogHeader><p className="eyebrow">OUR NOTEBOOK</p><DialogTitle>{modal==='profile'?'ふたりに合わせて、整える。':'同じ手帳を、バックアップで。'}</DialogTitle><DialogDescription>{modal==='profile'?'すべての項目はあとから変えられます。':'この公開版は端末内＋バックアップ／Gist。クラウド招待は未対応です。'}</DialogDescription></DialogHeader>
 {modal==='profile'&&<ProfileForm profile={p} onSave={saveProfile} busy={data.busy} onDirty={setDirty} hasBook={!!data.book}/>}
 {modal==='pair'&&<div className="form-stack pair-content">
 <div className="condition-note"><Users size={19}/><p><strong>この公開版は端末内＋バックアップ／Gist</strong>です。クラウド招待コードは未対応です。</p></div>
 <p>二人の端末で同じ手帳を使うときは、次のどちらかで受け渡してください。</p>
 <div className="stack-actions" style={{marginBottom:16}}>
  <Action secondary disabled={!data.book} onClick={()=>{exportBackup();}}><Download/>バックアップを書き出す</Action>
  <Action secondary onClick={()=>{forceClose();setTab('settings');requestAnimationFrame(()=>document.getElementById('settings-gist-sync')?.scrollIntoView({behavior:'smooth',block:'start'}));}}><Cloud/>設定の Gist 同期へ</Action>
  {!data.book&&<Action secondary onClick={()=>setModal('profile')}>新しい手帳を整える<ArrowRight/></Action>}
 </div>
 <p className="hint">バックアップJSONを相手端末で読み込むか、各端末で同じ secret Gist＋PAT を設定してください。招待コードの発行はこの公開版では使えません。</p>
 <details className="pair-legacy-fold">
  <summary>以前の招待コードがある場合（レガシー）</summary>
  <p className="hint">クラウド招待は未対応のため、コードを入力しても接続できません。バックアップ／Gist を使ってください。</p>
  <div className="field"><Label htmlFor="join-code">受け取り・招待コード（参考）</Label><Input id="join-code" value={joinCode} onChange={e=>setJoinCode(e.target.value)} placeholder="受け取ったコード（通常は使えません）" maxLength={100} autoComplete="off"/></div>
  <SaveAction busy={data.busy} disabled={!/^[a-f0-9]{48}$/.test(joinCode.trim().toLowerCase())} onClick={()=>void(async()=>{await data.mutate({action:'join',code:joinCode.trim().toLowerCase()},'');setJoinCode('');})}>試す（未対応の案内が出ます）</SaveAction>
 </details>
</div>}
 </DialogContent></Dialog>
 <AlertDialog open={resetOpen} onOpenChange={open=>{if(!open&&!data.busy){setResetOpen(false);setResetTyped('');setResetAck(false);}}}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>スタンプ進捗をリセットしますか？</AlertDialogTitle><AlertDialogDescription>ロードマップのスタンプ状態・入力した金額・項目メモ（records）をすべて消します。プロフィール（呼び名・婚姻日など）と記念手帳の文章は残ります。この操作は取り消せません。先にバックアップの書き出しを推奨します。</AlertDialogDescription></AlertDialogHeader><div className="reset-lock"><div className="field"><Label htmlFor="reset-type">確認のため「リセット」と入力</Label><Input id="reset-type" value={resetTyped} onChange={e=>setResetTyped(e.target.value)} placeholder="リセット" autoComplete="off" maxLength={20} disabled={data.busy}/></div><label className="reset-confirm-row"><Checkbox checked={resetAck} onCheckedChange={v=>setResetAck(!!v)} disabled={data.busy}/><span>上記の内容を理解し、スタンプ進捗だけを消すことに同意します（二重確認）</span></label></div><AlertDialogFooter><AlertDialogCancel disabled={data.busy}>やめる</AlertDialogCancel><AlertDialogAction disabled={data.busy||resetTyped!=='リセット'||!resetAck} onClick={e=>{e.preventDefault();void resetStampProgress();}}>本当にリセットする</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
 <AlertDialog open={!!pendingClose} onOpenChange={open=>{if(!open)setPendingClose(null);}}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>入力中の内容を閉じますか？</AlertDialogTitle><AlertDialogDescription>まだ保存していない変更があります。編集を続けるか、変更を破棄して閉じられます。</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>編集を続ける</AlertDialogCancel><AlertDialogAction onClick={()=>{setDirty(false);pendingClose?.();setPendingClose(null);}}>変更を破棄して閉じる</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
 <AlertDialog open={!!importDraft} onOpenChange={open=>{if(!open&&!data.busy)setImportDraft(null);}}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>このバックアップを読み込みますか？</AlertDialogTitle><AlertDialogDescription>{importDraft?.legacy?'旧版の状況を移行します。手順が変わっているため、旧版の小さなチェックと調査メモ・除外理由は自動移行しません。働き方は各自で設定し直してください。':'名前・日付・進捗・記念手帳を復元します。'} 現在の二人の手帳の内容は、このバックアップで置き換わります。</AlertDialogDescription></AlertDialogHeader><div className="import-details"><p>{importDraft?.book.profile.name1||'名前未設定'} & {importDraft?.book.profile.name2||'名前未設定'}</p><p>{Object.keys(importDraft?.book.records||{}).length}項目の記録 · {importDraft?.book.memories.length}件の記念</p><Action secondary onClick={exportBackup} disabled={!data.book}><Download/>現在の内容を先に書き出す</Action></div><AlertDialogFooter><AlertDialogCancel disabled={data.busy}>キャンセル</AlertDialogCancel><AlertDialogAction disabled={data.busy} onClick={e=>{e.preventDefault();void(async()=>{if(importDraft&&await data.mutate({action:'import',book:importDraft.book},'手帳を読み込みました'))setImportDraft(null);})();}}>この内容に置き換える</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>


 <button type="button" className="amity-fab" onClick={()=>setChatOpen(true)} aria-label="Amityちゃんにきく" hidden={chatOpen || !!taskId} aria-hidden={chatOpen || !!taskId}>
  <img src="./desk-mascot.png" alt="" decoding="async"/>
 </button>
 
 <Sheet open={quickOpen} onOpenChange={open=>{setQuickOpen(open);if(!open)setQuickQ('');}}><SheetContent side="bottom" className="quick-search-sheet" showCloseButton={true}><SheetHeader><SheetTitle>さがす</SheetTitle><SheetDescription>項目・画面・期限・設定・ふたりの練習へジャンプできます。</SheetDescription></SheetHeader><div className="quick-search-body"><label className="search-box quick-search-input"><Search size={20}/><Input autoFocus value={quickQ} onChange={e=>setQuickQ(e.target.value)} placeholder="項目・画面・期限を検索" aria-label="項目・画面・期限を検索" maxLength={80}/>{quickQ&&<button type="button" className="icon-button" onClick={()=>setQuickQ('')} aria-label="クリア"><X size={16}/></button>}</label><div className="quick-search-list" role="listbox" aria-label="検索結果">{!quickQ.trim()&&<p className="quick-search-hint">よく使う画面</p>}{quickGroups.map(g=><div key={g.kind} className="quick-search-group"><h3>{g.label}</h3>{g.items.map(hit=><button type="button" key={hit.id} className="quick-search-item" onClick={()=>runQuickHit(hit)}><span className="quick-search-item-main"><strong>{hit.title}</strong>{hit.hint&&<small>{hit.hint}</small>}</span><ChevronRight size={16}/></button>)}</div>)}{quickQ.trim()&&!quickHits.length&&<p className="quick-search-empty">見つかりませんでした。別の言葉で試してください。</p>}</div></div></SheetContent></Sheet>

 <DeskChatPanel open={chatOpen} onClose={()=>setChatOpen(false)} profile={p} onOpenTask={(id)=>{setChatOpen(false);openTask(id);}} onGoFind={(kw)=>{setChatOpen(false);if(kw)setQuery(kw);setTab('find');}}/>
 <OnboardingSheet open={onboardOpen&&!modal&&!taskId} profile={p} busy={data.busy} onSave={async(profile)=>{if(await data.mutate({action:'profile',profile},'ふたりに合わせて手帳を整えました')){markOnboardingDone();setOnboardOpen(false);}}} onSkip={()=>{markOnboardingDone();setOnboardOpen(false);}}/>

 <div className="print-book"><h1>Amityちゃんにきく</h1><h2>{p.name1||'一人目'}さん & {p.name2||'二人目'}さん</h2><p>広島市 {p.ward!=='未設定'?p.ward:''} · 書き出し {shortDate(today)}</p><h2>これまでの一歩</h2><p>{done.length}項目が完了</p><table><thead><tr><th>項目</th><th>状況・記録</th></tr></thead><tbody>{tasks.filter(t=>book.records[t.id]).map(t=><tr key={t.id}><td>{t.title}</td><td>{book.records[t.id].status} · {book.records[t.id].note}<br/>{book.records[t.id].due&&`予定：${book.records[t.id].due}`}</td></tr>)}</tbody></table><h2>これからの予定</h2>{dated.map(({task:t,deadline:d})=><p key={`${t.id}-${d.kind}`}>{d.date} · {t.title} · {d.kind==='personal'?'二人の予定':'原則・条件を確認'}<br/>{d.basis}</p>)}<h2>ふたりの言葉</h2>{book.memories.map(m=><section key={m.id}><h3>{m.date} {m.title}</h3><p className="print-letter">{m.text}</p></section>)}<p>各制度の最新条件は手帳内の公式参照先で確認してください。案内の内容確認日：{reviewedOn}</p></div>
 </>;
}
