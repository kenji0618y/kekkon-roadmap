import {useCallback,useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {Archive,ArrowDownToLine,ArrowRight,ArrowUpRight,CalendarDays,Check,ChevronRight,Cloud,CloudCheck,Download,ExternalLink,Heart,HeartHandshake,House,Info,LoaderCircle,Map,MapPin,Printer,RefreshCw,Search,Settings2,ShieldCheck,Sparkles,Trash2,Users,Wallet,X} from 'lucide-react';
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
import {deadlineVisible} from './lib/deadline-visibility';
import {chapters,emptyBook,emptyGoogleCal,emptyHousehold,emptyLater,emptyShopping,emptyReminders,BOARD_TEXT_MAX,type BoardNote,type LaterItem,inScope,isCeremonyTask,emptyRecord,pairChecks,applyPairCheck,pairEventWhoLabels,type AgreementRecord,type PairEvent,type Book,type PracticeRecord,type Profile,type Task,type TaskRecord,statusNames} from './lib/model';
import {calendarFile,deadlineText,difference,monthDay,nearestDeadline,plusDays,plusYears,shortDate,taskDeadlines,todayJapan,validDate,type CalendarEvent} from './lib/dates';
import {backupText,readBackup} from './lib/backup';
import {useBook} from './lib/use-book';
import {SyncSettings} from './components/SyncSettings';
import {DEFAULT_GROK_BASE,askGrokResearch,grokErrorJa,NETWORK_ERROR_JA,GROK_AI_OFF_JA,GROK_CREDITS_CONSOLE_URL,GROK_CREDITS_LIMIT_JA,isGrokCreditsLimitResult,isGrokEnabled,loadGrokBase,loadGrokKey,saveGrokBase,saveGrokKey,setGrokEnabled} from './lib/amity-grok';
import {clearGrokLocalOnly,markGrokLocalOnly} from './lib/grok-mode';
import {answerDeskQuery} from './lib/desk-chat';
import {DeskChatPanel} from './components/DeskChatPanel';
import {PairWorkbook} from './components/PairWorkbook';
import {FutariDaily,LessonBody,type FutariSave} from './components/FutariDaily';
import {MarriageDesk,MoneySummary} from './components/MarriageDesk';
import {DeskBoard,type BoardSave} from './components/DeskBoard';
import {LineNotifySettings} from './components/LineNotifySettings';
import {SiteLockSettings} from './components/SiteLockSettings';
import {Fold,More,SettingsCard,SettingsOverview,StatusChip} from './components/settings-ui';
import {useLineNotify} from './lib/use-line-notify';
import {boardResultText,remindersResultText,shouldNotifyBoard,type ReminderSync} from './lib/line-notify';
import {becameDone,createStampNotifier,stampDoneText} from './lib/stamp-notify';
import {lessonById,readMe} from './lib/futari';
import {DeskRoleLabels,FilingWeekPath} from './components/WhereToLook';
import {StampIllustBoard} from './components/StampIllustBoard';
import {ExcludeAndLiesPanel,HeroNumbersPanel,HomeInsightPanels,InstitutionalDeadlines,PhasesPanel} from './components/SeedContentPanels';
import {DeadlinesCalendar} from './components/DeadlinesCalendar';
import {GoogleFamilyCalendar} from './components/GoogleFamilyCalendar';
import {WeekTogether} from './components/WeekTogether';
import {MeetingCard,RemindersCard,type ReminderSave} from './components/ReminderSettings';
import {REMIND_WINDOW_DAYS,calendarItems,icsTriggers,meetingDates,meetingRrule,nextReminder,payloadKey,remindOffsets,remindersPayload} from './lib/reminders';
import {readRemindSync,writeRemindSync,appUrl} from './lib/remind-sync';
import {ShoppingList,type ShopSave} from './components/ShoppingList';
import {LaterList,LaterProvider} from './components/Later';
import {hasLater} from './lib/later';
import {newNoteId} from './lib/board';
import {HouseholdSplitCard} from './components/HouseholdSplitCard';
import {buildWeek} from './lib/week-together';
import {OnboardingSheet,isOnboardingDone,markOnboardingDone} from './components/OnboardingSheet';
import {PwaUpdateBanner} from './components/PwaUpdateBanner';
import {absoluteDeadlines,excludeItems,groups,homeContent,practices,relativeDeadlines,reviewedOn,sources,talks,taskById,tasks} from './data/catalog';
import {buildQuickSearchHits,groupQuickSearchHits,taskMatchesQuery,type QuickSearchHit} from './lib/quick-search';
import yearlyUpdateMd from './data/YEARLY_UPDATE.md?raw';
const typeLabels={procedure:'手続き',benefit:'給付・助成',tax:'税の制度',investment:'資産形成',contract:'契約の見直し',conversation:'ふたりで話す'};
const nav=[{id:'desk',label:'デスク',short:'デスク',icon:House},{id:'journey',label:'ロードマップ',short:'ロードマップ',icon:Map},{id:'deadlines',label:'カレンダー',short:'カレンダー',icon:CalendarDays},{id:'money',label:'お金',short:'お金',icon:Wallet},{id:'pair',label:'博士',short:'博士',icon:HeartHandshake},{id:'find',label:'探す',short:'探す',icon:Search},{id:'archive',label:'アーカイブ',short:'アーカイブ',icon:Archive},{id:'settings',label:'設定',short:'設定',icon:Settings2}];
type Modal='profile'|'pair'|null;
export default function FutureNotebook(){
 const [tab,setTab]=useState('desk'),[chapter,setChapter]=useState('prepare'),[groupId,setGroupId]=useState(groups[0].id),[chatOpen,setChatOpen]=useState(false);
 const [taskId,setTaskId]=useState<string|null>(null),[modal,setModal]=useState<Modal>(null),[dirty,setDirty]=useState(false),[pendingClose,setPendingClose]=useState<(()=>void)|null>(null);
 const [query,setQuery]=useState(''),[category,setCategory]=useState('all'),[scopeOnly,setScopeOnly]=useState(true),[statusFilter,setStatusFilter]=useState('all');
 const [resetOpen,setResetOpen]=useState(false),[resetTyped,setResetTyped]=useState(''),[resetAck,setResetAck]=useState(false);
 const [findOpenChapter,setFindOpenChapter]=useState('');
 const [joinCode,setJoinCode]=useState(''),[importDraft,setImportDraft]=useState<{book:Book,legacy:boolean}|null>(null);
 const flushTaskOnUnmountRef=useRef(true);
 const uploadRef=useRef<HTMLInputElement>(null);
 const [grokKey,setGrokKey]=useState(''),[grokBase,setGrokBase]=useState(''),[grokEnabled,setGrokEnabledState]=useState(false);
 const [researchQ,setResearchQ]=useState(''),[researchBusy,setResearchBusy]=useState(false),[researchOut,setResearchOut]=useState('');
 const [onboardOpen,setOnboardOpen]=useState(false);
 const [quickOpen,setQuickOpen]=useState(false),[quickQ,setQuickQ]=useState('');
 const [pairJump,setPairJump]=useState<{theme?:string,practiceId?:string,talkId?:string,agreementId?:string,scrollId?:string}|null>(null);
 const [pairBookOpen,setPairBookOpen]=useState(false);
 useEffect(()=>{if(pairJump)setPairBookOpen(true);},[pairJump]);
 useEffect(()=>{if(tab==='pair')setChatOpen(false);},[tab]);
 // スマホでは下へスクロールするとヘッダーの上段（名前・検索・ふたりで使う）を隠し、上へ戻すと出す。タブの列は残す。
 useEffect(()=>{const header=document.querySelector<HTMLElement>('.site-header');const inner=header?.querySelector<HTMLElement>('.masthead-inner');if(!header||!inner)return;const mq=window.matchMedia('(max-width:700px)');let last=window.scrollY;const onScroll=()=>{const y=window.scrollY;header.style.setProperty('--mh-inner',`${inner.offsetHeight}px`);if(!mq.matches||y<60){header.classList.remove('is-collapsed');}else if(y>last+8){header.classList.add('is-collapsed');}else if(y<last-8){header.classList.remove('is-collapsed');}if(Math.abs(y-last)>8||y<60)last=y;};window.addEventListener('scroll',onScroll,{passive:true});onScroll();return ()=>window.removeEventListener('scroll',onScroll);},[]);
 useEffect(()=>{document.querySelector('.site-header')?.classList.remove('is-collapsed');},[tab]);
 // 動き #6：金色の線が選んだタブへすべり、中身は進む向きから0.2秒で入る（前の画面が消えるのを待たない）。
 const tabsRef=useRef<HTMLDivElement>(null),navListRef=useRef<HTMLDivElement>(null),navIndRef=useRef<HTMLSpanElement>(null),prevTabRef=useRef(tab);
 const placeNavInd=useCallback(()=>{const list=navListRef.current,ind=navIndRef.current;if(!list||!ind)return;const a=list.querySelector<HTMLElement>('[data-slot=tabs-trigger][data-state=active]');if(!a){ind.style.opacity='0';return;}const inset=parseFloat(getComputedStyle(ind).getPropertyValue('--ind-inset'))||0;ind.style.width=`${Math.max(a.offsetWidth-inset*2,8)}px`;ind.style.transform=`translateX(${a.offsetLeft+inset}px)`;ind.style.opacity='1';},[]);
 useLayoutEffect(()=>{const root=tabsRef.current,prev=prevTabRef.current;if(root&&prev!==tab){const d=nav.findIndex(n=>n.id===tab)-nav.findIndex(n=>n.id===prev);root.dataset.tabDir=d>0?'next':'prev';}prevTabRef.current=tab;placeNavInd();},[tab,placeNavInd]);
 useEffect(()=>{const list=navListRef.current;if(!list)return;let ro:ResizeObserver|null=null;if('ResizeObserver' in window){ro=new ResizeObserver(()=>placeNavInd());ro.observe(list);list.querySelectorAll('[data-slot=tabs-trigger]').forEach(t=>ro!.observe(t));}const onResize=()=>placeNavInd();window.addEventListener('resize',onResize);const id=requestAnimationFrame(()=>requestAnimationFrame(()=>list.classList.add('ind-ready')));return()=>{ro?.disconnect();window.removeEventListener('resize',onResize);cancelAnimationFrame(id);};},[placeNavInd]);
 const data=useBook(!!modal||!!taskId||dirty),book=data.book||emptyBook,p=book.profile,today=todayJapan();
 const scoped=useMemo(()=>tasks.filter(t=>inScope(t,p)),[p]);
 const actionable=scoped.filter(t=>book.records[t.id]?.status!=='na'),done=actionable.filter(t=>book.records[t.id]?.status==='done');
 const activeChapter=chapters.find(c=>c.id===chapter)!;
 const chapterGroups=groups.filter(g=>g.chapter===chapter&&scoped.some(t=>g.ids.includes(t.id)&&book.records[t.id]?.status!=='na'));
 const activeGroup=chapterGroups.find(g=>g.id===groupId)||chapterGroups[0];
 const task=taskId?taskById[taskId]:null;
 const dates=useMemo(()=>scoped.filter(t=>!['done','na'].includes(book.records[t.id]?.status||'todo')).flatMap(task=>taskDeadlines(task,p,book.records[task.id]).map(deadline=>({task,deadline}))).sort((a,b)=>(a.deadline.date||'9999').localeCompare(b.deadline.date||'9999')),[scoped,p,book.records]);
 const dated=dates.filter(x=>x.deadline.date&&difference(x.deadline.date,today)>=0),missingDates=dates.filter(x=>!x.deadline.date),soon=dated.filter(x=>difference(x.deadline.date,today)<=14);
 const absExport=useMemo(():CalendarEvent[]=>absoluteDeadlines.filter(d=>deadlineVisible(d,p)&&validDate(d.date)&&difference(d.date,today)>=0).map(d=>({id:`abs-${d.date}-${d.title}`,title:d.title,deadline:{date:d.date,label:d.title,basis:d.note||'制度・カレンダーの絶対期限です。公式案内で最新条件を確認してください。',kind:'rule' as const,uncertain:true}})),[p.child,p.home,today]);
 const pairExport=useMemo(():CalendarEvent[]=>(book.events||[]).filter(e=>e.date&&difference(e.date,today)>=0).map(e=>({id:`pair-${e.id}`,title:e.title,deadline:{date:e.date,label:e.title,basis:e.note||'ふたりのカレンダーに入れた予定です。',kind:'personal' as const,uncertain:false}})),[book.events,today]);
 const weddingExport=useMemo(():CalendarEvent[]=>validDate(p.wdate)&&difference(p.wdate,today)>=0?[{id:'wedding-day',title:'婚姻日（予定日）',deadline:{date:p.wdate,label:'婚姻日',basis:'プロフィールに入れた婚姻日・予定日です。',kind:'personal' as const,uncertain:false}}]:[],[p.wdate,today]);
 // .ics：お知らせがオンなら、アラームをお知らせと同じ日・時間帯に（オフの種類はアラームなし）。オフなら今までどおり3日前。会議は毎月のくり返し、結婚記念日は毎年のくり返し。
 const remindR=book.reminders||emptyReminders;
 const icsAlarm=(kind:'rule'|'task'|'event'|'anniv'|'meeting')=>kind==='meeting'?icsTriggers(remindOffsets('meeting',remindR),remindR.slot):remindR.on?icsTriggers(remindOffsets(kind,remindR),remindR.slot):undefined;
 const meetingExport=useMemo(():CalendarEvent[]=>{const next=meetingDates(remindR.meeting,today,plusDays(today,62))[0];const rrule=meetingRrule(remindR.meeting);return next&&rrule?[{id:'futari-meeting',title:'月に一度のふたり会議',summary:'【ふたり会議】月に一度のふたり会議',rrule,deadline:{date:next,label:'月に一度のふたり会議',basis:'アプリの設定・カレンダーで決めた、毎月の会議の日です。',kind:'personal' as const,uncertain:false}}]:[];},[remindR.meeting,today]);
 const anniversaryExport=useMemo(():CalendarEvent[]=>{if(!validDate(p.wdate)||p.wdate>=today)return [];const wy=Number(p.wdate.slice(0,4));let d='';for(let y=Number(today.slice(0,4));y<=Number(today.slice(0,4))+1&&!d;y++){const c=plusYears(p.wdate,y-wy);if(c>=today&&y>wy)d=c;}return d?[{id:'wedding-anniversary',title:'結婚記念日',summary:'【記念日】結婚記念日',rrule:'FREQ=YEARLY',deadline:{date:d,label:'結婚記念日',basis:'プロフィールに入れた婚姻日から（毎年）。',kind:'personal' as const,uncertain:false}}]:[];},[p.wdate,today]);
 const calendarEvents=useMemo(():CalendarEvent[]=>[
  ...weddingExport.map(e=>({...e,triggers:icsAlarm('anniv')})),
  ...anniversaryExport.map(e=>({...e,triggers:icsAlarm('anniv')})),
  ...dated.map(({task,deadline})=>({id:task.id,title:task.title,deadline,triggers:icsAlarm(deadline.kind==='personal'?'task':'rule')})),
  ...absExport.map(e=>({...e,triggers:icsAlarm('rule')})),
  ...pairExport.map(e=>({...e,triggers:icsAlarm('event')})),
  ...meetingExport.map(e=>({...e,triggers:icsAlarm('meeting')})),
 ],[weddingExport,anniversaryExport,dated,absExport,pairExport,meetingExport,remindR]);
 const week=useMemo(()=>buildWeek({today,tasks:scoped,profile:p,records:book.records,events:book.events||[],rules:absoluteDeadlines.filter(d=>deadlineVisible(d,p)&&validDate(d.date))}),[today,scoped,p,book.records,book.events]);
 const [calFocus,setCalFocus]=useState<{date:string,n:number}|null>(null);
 // 2026-10-09 カレンダータブは Google の埋め込みだけ。外した中身は「アーカイブ」タブ（Kenji 18:15「アーカイブのタブを作ってそこに整理して置く」）：
 // 制度の期限（deadline-block-institutional）・項目の予定（deadline-block-schedule）・時期の区切り（deadline-block-phases）・アプリの予定＋書き出し（archive-app-calendar）。どれも折りたたみ。
 const openBlock=(t:string,id:string)=>{setTab(t);revealAndScroll(id);};
 const moneyTasks=scoped.filter(t=>(t.type==='benefit'||t.type==='tax'||t.type==='investment')&&book.records[t.id]?.status!=='na');
 const moneyContracts=scoped.filter(t=>t.type==='contract'&&/保険|固定費|財形|貸付|カード|火災|電気|ガス|預金|NHK|賠償|ポイント|回線|携帯|プライム/.test(t.title)&&book.records[t.id]?.status!=='na');
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
 const togglePairCheck=async(id:string,who:'male'|'female')=>{
  const cur={...emptyRecord,...(book.records[id]||{})};
  const pair=pairChecks(cur);
  const on=who==='male'?!pair.male:!pair.female;
  const next=applyPairCheck(cur,who,on);
  const whoLabels=pairEventWhoLabels(p); const msg=next.status==='done'?`${whoLabels.male}・${whoLabels.female}どちらもチェック済み。完了にしました。`:undefined;
  if(await data.mutate({action:'record',id,record:next},msg))noteStampChange(id,cur.status,next.status);
 };
 const quickHits=useMemo(()=>buildQuickSearchHits({query:quickQ,tasks,absoluteDeadlines:absoluteDeadlines.filter(d=>deadlineVisible(d,p)),relativeDeadlines,practices,talks,excludeItems,includeTask:t=>p.ceremony!=='no'||!isCeremonyTask(t),limit:20}),[quickQ,p.ceremony,p.child,p.home]);
 const quickGroups=useMemo(()=>groupQuickSearchHits(quickHits),[quickHits]);
 const runQuickHit=(hit:QuickSearchHit)=>{setQuickOpen(false);setQuickQ('');if(hit.tab)setTab(hit.tab);if(hit.scrollId==='journey-shopping')selectChapter('life');if(hit.taskId){if(hit.tab==='find')setQuery(hit.title);requestAnimationFrame(()=>openTask(hit.taskId!));}else if(hit.kind==='pair'){setPairJump({theme:hit.pairTheme,practiceId:hit.pairPracticeId,talkId:hit.pairTalkId,agreementId:hit.pairAgreementId,scrollId:hit.scrollId});}else if(hit.scrollId){revealAndScroll(hit.scrollId);}else if(hit.tab==='find'&&quickQ.trim()){setQuery(quickQ.trim());}};
 const revealAndScroll=(id:string)=>{const go=(tries=0)=>{const el=document.getElementById(id);if(!el){if(tries<40)requestAnimationFrame(()=>go(tries+1));return;}let n:HTMLElement|null=el;while(n){if(n instanceof HTMLDetailsElement)n.open=true;n=n.parentElement;}el.scrollIntoView({behavior:'smooth',block:'start'});};requestAnimationFrame(()=>go());};
 const openProfile=()=>{callClose(()=>{setTaskId(null);setDirty(false);setModal('profile');});};
 const selectChapter=(id:string)=>{setChapter(id);setGroupId(groups.find(g=>g.chapter===id&&scoped.some(t=>g.ids.includes(t.id)&&book.records[t.id]?.status!=='na'))?.id||groups.find(g=>g.chapter===id)?.id||'');};const openShopping=()=>{setTab('journey');selectChapter('life');requestAnimationFrame(()=>requestAnimationFrame(()=>document.getElementById('journey-shopping')?.scrollIntoView({behavior:'smooth',block:'start'})));};const openMoney=(id:string)=>{setTab('money');requestAnimationFrame(()=>requestAnimationFrame(()=>document.getElementById(id)?.scrollIntoView({behavior:'smooth',block:'start'})));};
 const saveRecord=async(r:TaskRecord,mode:'quiet'|'status'='status')=>{if(!task)return false;const msg=mode==='quiet'?'':r.status==='done'?'記録を保存しました':r.status==='na'?'スキップとして保存しました':'ふたりの記録を保存しました';const prevStatus=book.records[task.id]?.status;const result=await data.mutate({action:'record',id:task.id,record:r},msg);if(result){noteStampChange(task.id,prevStatus,r.status);setDirty(false);if(mode==='status'&&(r.status==='done'||r.status==='na'))forceClose();}return !!result;};
 const saveProfile=async(profile:Profile)=>{if(await data.mutate({action:'profile',profile},'ふたりに合わせて手帳を整えました'))forceClose();};
 const savePractice=async(id:string,record:PracticeRecord)=>{return !!(await data.mutate({action:'practice',id,record},''));};
 const saveAgreement=async(id:string,record:AgreementRecord)=>{return !!(await data.mutate({action:'agreement',id,record},'この話題を保存しました'));};
 const futariSave:FutariSave={
  answer:async({date,who,cardId,mode,answer})=>!!(await data.mutate({action:'futariAnswer',date,who,cardId,mode,answer},'')),
  meeting:async(date,note)=>!!(await data.mutate({action:'futariMeeting',date,note},'会議のメモを残しました')),
  settings:async(patch)=>!!(await data.mutate({action:'futariSettings',patch},'保存しました')),
 };
 const savePairEvent=async(event:PairEvent)=>{return !!(await data.mutate({action:'event',event},event.id&&book.events?.some(e=>e.id===event.id)?'予定を更新しました':'予定を手帳に残しました'));};
 const boardSave:BoardSave={put:async(note,message)=>!!(await data.mutate({action:'boardNote',note},message)),remove:async(id)=>!!(await data.mutate({action:'deleteBoardNote',id},'メモを消しました'))};
 const shopSave:ShopSave={set:(id,entry)=>void data.mutate({action:'shopSet',id,entry},''),add:async item=>!!(await data.mutate({action:'shopAdd',item},'品目を足しました')),remove:id=>void data.mutate({action:'shopRemove',id},'品目を消しました')};
 // 「あとで見る」（ふたりで共有）。印は同期で両方の端末にそろい、外した印も同期で外れる。
 const laterBook=book.later||emptyLater;
 const laterCtx=useMemo(()=>({later:laterBook,busy:data.busy,toggle:(item:Omit<LaterItem,'at'|'by'>)=>{const on=hasLater(laterBook,item.id);void data.mutate({action:'laterToggle',item:{...item,by:readMe()||''}},on?'あとで見るから外しました':'あとで見るに入れました');}}),[laterBook,data.busy,data.mutate]);
 const openLater=(it:LaterItem)=>{if(taskById[it.ref])openTask(it.ref);else toast.message('この項目は見つかりませんでした');};
 const shareLater=async(_it:LaterItem,text:string)=>{
  const me=readMe();
  if(!me){toast.message('掲示板に書くには、設定の「この端末はどちら？」を選んでください');return;}
  const at=new Date().toISOString();
  const note:BoardNote={id:newNoteId(),who:me,text:text.slice(0,BOARD_TEXT_MAX),pinned:false,at,updatedAt:at,editedAt:''};
  if(!(await boardSave.put(note,'掲示板に書きました')))return;
  const l=lineRef.current;
  if(l.state!=='on'||!shouldNotifyBoard('compose',note,me))return;
  try{
   const w=pairEventWhoLabels(bookRef.current.profile),names={n1:w.male,n2:w.female};
   const res=boardResultText(await l.send(me,names[me],note.text),names[me==='n1'?'n2':'n1']);
   if(res.warn)toast.message(`LINE通知 — ${res.text}`);
  }catch{toast.message('LINE通知 — お知らせを送れませんでした');}
 };
 const laterInline=(it:LaterItem)=>{if(it.kind!=='lesson')return null;const l=lessonById[it.ref];return l?<LessonBody lesson={l} compact hideMark/>:<p className="hint">このレッスンは見つかりませんでした。</p>;};
 const line=useLineNotify(book,{enabled:data.syncConfig.enabled,token:data.syncConfig.token});
 // ロードマップのスタンプを済にしたら相手の LINE へ（この端末で押したときだけ・5秒待って取り消しがなければ・同じ項目は30分に1回）。
 const lineRef=useRef(line);lineRef.current=line;
 const bookRef=useRef(book);bookRef.current=book;
 const stampNotifier=useMemo(()=>createStampNotifier({
  isStillDone:id=>bookRef.current.records[id]?.status==='done',
  send:async id=>{
   const l=lineRef.current,me=readMe(),t=taskById[id];
   if(l.state!=='on'||!me||!t)return;
   const w=pairEventWhoLabels(bookRef.current.profile),names={n1:w.male,n2:w.female};
   const r=await l.send(me,names[me],stampDoneText(t.title));
   const res=boardResultText(r,names[me==='n1'?'n2':'n1']);
   if(res.warn)toast.message(`LINE通知 — ${res.text}`);
  },
 }),[]);
 useEffect(()=>()=>stampNotifier.dispose(),[stampNotifier]);
 /** この端末で押してスタンプの状態が変わったときだけ呼ぶ（同期・読み込みでは呼ばない）。待たせない。 */
 const noteStampChange=(id:string,prev:string|undefined,next:string|undefined)=>{
  try{
   if(becameDone(prev,next)){if(lineRef.current.state==='on'&&readMe())stampNotifier.stamped(id);}
   else if(prev==='done'&&next!=='done')stampNotifier.unstamped(id);
  }catch{/* 通知はおまけ */}
 };
 const saveLineNotify=async(patch:Partial<Book['lineNotify']>,message:string)=>!!(await data.mutate({action:'lineNotify',patch},message));
 // 期限と記念日の LINE お知らせ・月に一度のふたり会議（2026-10-08〜）。カレンダーにのるものから作り、中継先へは「この先35日・お知らせするものだけ」を渡す。
 const remindersVal=book.reminders||emptyReminders;
 const saveReminders:ReminderSave=async(patch,message)=>!!(await data.mutate({action:'reminders',patch},message));
 const rulesVisible=useMemo(()=>absoluteDeadlines.filter(d=>deadlineVisible(d,p)&&validDate(d.date)),[p.child,p.home]);
 const itemsFor=useCallback((from:string,to:string)=>calendarItems({from,to,profile:p,tasks:scoped,records:book.records,events:book.events||[],rules:rulesVisible,reminders:remindersVal}),[p,scoped,book.records,book.events,rulesVisible,remindersVal]);
 const calExtrasFor=useCallback((from:string,to:string)=>itemsFor(from,to).filter(x=>x.kind==='task'||x.kind==='anniv'||x.kind==='meeting'),[itemsFor]);
 const remindNames=useMemo(()=>{const w=pairEventWhoLabels(p);return {n1:w.male,n2:w.female};},[p.name1,p.name2]);
 const remindPayload=useMemo(()=>remindersPayload({secret:'',today,reminders:remindersVal,items:itemsFor(today,plusDays(today,REMIND_WINDOW_DAYS)),names:remindNames}),[today,remindersVal,itemsFor,remindNames]);
 const remindKey=payloadKey(remindPayload);
 const remindPreview=useMemo(()=>nextReminder(remindPayload,today,appUrl()),[remindPayload,today]);
 const [remSync,setRemSync]=useState<ReminderSync>(()=>readRemindSync().result);
 const postRemRef=useRef(line.postReminders);postRemRef.current=line.postReminders;
 useEffect(()=>{
  if(data.phase!=='ready'||!data.book||line.state!=='on')return;
  const last=readRemindSync();
  if(!remindPayload.on&&!last.on)return; // 使ったことがない／もう消した
  const key=`${today}|${remindKey}`;
  if(last.key===key)return; // 同じ内容は1日1回まで
  const t=setTimeout(()=>{void(async()=>{
   setRemSync({state:'sending',text:''});
   const {secret:_secret,...rest}=remindPayload;
   const r=await postRemRef.current(rest);
   const res=remindersResultText(r);
   setRemSync(res);
   if(r.ok||res.state==='old-relay')writeRemindSync({key,on:remindPayload.on,result:res});
  })();},1500);
  return()=>clearTimeout(t);
 },[data.phase,data.book,line.state,remindKey,today]);
 const deletePairEvent=async(id:string)=>{return !!(await data.mutate({action:'deleteEvent',id},'予定を削除しました'));};
 const exportBackup=()=>{if(!data.book){toast.info('手帳を始めてから保存できます');return;}downloadText(`futari-miraicho-${today}.json`,backupText(data.book));toast.success('バックアップを書き出しました');};
 const exportCalendar=()=>{
  if(!calendarEvents.length){
   toast.info('書き出せる予定はまだありません。婚姻日や引っ越し日などを入れるか、カレンダーに予定を入れると書き出せます。',{action:{label:'ふたりに合わせる',onClick:()=>openProfile()}});
   openProfile();
   return;
  }
  downloadText('amity-chan-ni-kiku.ics',calendarFile(calendarEvents),'text/calendar;charset=utf-8');
  toast.success(`${calendarEvents.length}件の予定を書き出しました。お使いのカレンダーに読み込んでください。`);
 };
 const loadBackup=async(file:File)=>{try{if(file.size>2000000)throw new Error('2MB以内のJSONファイルを選んでください。');setImportDraft(readBackup(JSON.parse(await file.text())));}catch(e){toast.error(e instanceof SyntaxError?'バックアップのファイルとして読めませんでした。':e instanceof Error?e.message:'読み込めませんでした');}};
 useEffect(()=>{try{setGrokKey(localStorage.getItem('amity-grok-key')||'')}catch{setGrokKey('')}setGrokBase(loadGrokBase());setGrokEnabledState(isGrokEnabled());},[]);
 useEffect(()=>{
  if(data.phase!=='ready')return;
  if(isOnboardingDone())return;
  const unset=!data.book||(p.ward==='未設定'&&!p.name1&&!p.name2);
  if(unset)setOnboardOpen(true);
 },[data.phase,data.book,p.ward,p.name1,p.name2]);
 useEffect(()=>{if(!dirty)return;const before=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',before);return()=>window.removeEventListener('beforeunload',before);},[dirty]);
 const resetStampProgress=async()=>{if(resetTyped!=='リセット'||!resetAck)return;const result=await data.mutate({action:'resetRecords'},'スタンプ進捗をリセットしました（プロフィール・記念は残しています）');if(result){setResetOpen(false);setResetTyped('');setResetAck(false);}};
 const renderTask=(t:Task,compact=false)=>{const r=book.records[t.id],deadline=nearestDeadline(t,p,r);return <button key={t.id} className={`task-row ${compact?'compact':''} ${r?.status==='done'?'task-done':''}`} onClick={()=>openTask(t.id)}><span className="task-circle">{r?.status==='done'?<Check size={17}/>:t.type==='conversation'?<Heart size={16}/>:<span/>}</span><span className="task-row-body"><span className="task-row-top"><span className="task-type">{typeLabels[t.type]}</span>{r&&<StatusMark status={r.status}/>}</span><strong>{t.title}</strong>{!compact&&<span className="task-summary">{t.summary}</span>}<span className="task-meta">{deadline&&!['done','na'].includes(r?.status||'')&&<span className={difference(deadline.date,today)<=7?'urgency':''}><CalendarDays size={13}/>{monthDay(deadline.date)} · {deadline.kind==='personal'?'予定':deadline.uncertain?'原則日':'届出期限'}</span>}</span></span><ChevronRight size={17}/></button>;};
 return <LaterProvider value={laterCtx}><a className="skip-link" href="#main-content">本文へ進む</a><Toaster theme="light" position="top-center" richColors visibleToasts={1}/><PwaUpdateBanner/>
 <Tabs value={tab} onValueChange={v=>{if(v==='pair')setChatOpen(false);setTab(v);}} className="notebook-tabs" ref={tabsRef}>
 <header className="masthead site-header"><div className="masthead-inner"><button className="brand" onClick={()=>setTab('desk')} aria-label="Amityちゃん（デスクへ戻る）" title="デスクへ戻る"><span className="brand-seal">結</span><span className="wordmark">Amityちゃん<small>広島市・式なし</small></span></button><div className="header-right"><button type="button" className="header-search-btn" onClick={()=>{setQuickOpen(true);setQuickQ('');}} aria-label="項目・画面・期限を検索"><Search size={16}/><span>検索</span></button><span className="city-tag"><MapPin size={15}/>広島市{p.ward!=='未設定'?` ${p.ward}`:''}</span><button className="pair-pill" onClick={()=>setModal('pair')}><Users size={16}/><span>ふたりで使う</span></button><span className="save-status header-save" role="status">{data.busy?<><LoaderCircle className="spin" size={14}/>保存中</>:data.phase==='loading'?<>読み込み中…</>:data.phase==='error'?<>接続を確認</>:data.book?<><CloudCheck size={15}/>この端末に保存済み</>:<>まだ手帳を始めていません</>}</span></div></div>
 <div className="nav-wrap"><TabsList className="main-nav has-ind" aria-label="メインメニュー" ref={navListRef}>{nav.map(n=><TabsTrigger key={n.id} value={n.id}><n.icon/><span className="nav-label-full">{n.label}</span><span className="nav-label-short">{n.short}</span></TabsTrigger>)}<span className="nav-ind" ref={navIndRef} aria-hidden="true"/></TabsList></div></header>
 <main className="workspace" id="main-content">
 {data.error&&<div className="connection-error" role="alert"><Info size={18}/><p>{data.error}</p><button onClick={()=>void data.refresh()}>再読み込み</button></div>}
 <TabsContent value="desk" className="tab-surface">
 <DeskBoard book={book} busy={data.busy} syncStatus={data.syncStatus} save={boardSave} onOpenSync={()=>{setTab('settings');revealAndScroll('settings-gist-sync');}} line={line} onOpenLine={()=>{setTab('settings');revealAndScroll('settings-line-notify');}}/>
 <MarriageDesk book={book} profile={p} scoped={scoped} actionable={actionable} done={done} soonCount={soon.length} today={today} hasBook={!!data.book} syncStatus={data.syncStatus} onOpenTask={openTask} onOpenProfile={openProfile} onGoDeadlines={()=>openBlock('archive','deadline-block-institutional')} onGoMoney={()=>openMoney('money-totals')}/>
 <HomeInsightPanels
  onOpenTask={openTask}
  profile={p}
  fillNext={next.map(t=>({id:t.id,title:t.title,sub:nearestDeadline(t,p,book.records[t.id])?'期限・予定を確認':typeLabels[t.type]}))}
  isStampOpen={(id)=>{const t=tasks.find(x=>x.id===id);if(t&&!inScope(t,p))return false;const st=book.records[id]?.status||'todo';return !['done','applied','waiting','na'].includes(st);}}
 />
 </TabsContent>
 <TabsContent value="journey" className="tab-surface">
 <div className="section-heading" id="journey-stamp-board"><div><p className="eyebrow">暮らしの道のり</p><h2>スタンプで進める、暮らしロードマップ</h2></div></div>
 <div className="chapter-nav" role="group" aria-label="暮らしの章">{chapters.map(c=>{const count=scoped.filter(t=>t.chapter===c.id&&book.records[t.id]?.status!=='na');const n=count.filter(t=>book.records[t.id]?.status==='done').length;return <button key={c.id} className={chapter===c.id?'active':''} onClick={()=>selectChapter(c.id)} aria-pressed={chapter===c.id}><span className="chapter-kanji">{c.kanji}</span><span>{c.label}<small>{count.length?`${n} / ${count.length}`:'必要になったら'}</small></span>{count.length>0&&n===count.length&&<Check size={15}/>}</button>;})}</div>
 <section className="journey-panel"><div className="journey-heading"><div><span className="eyebrow">{activeChapter.label}</span><h3>{activeChapter.description}</h3></div><span className="hint">絵の縁のスタンプを押すと、その項目が開きます。</span></div>
 {chapter==='child'&&['unknown','none'].includes(p.child)?<EmptyState symbol={<Heart/>} title="必要になった時に、この章を。" action={<Action secondary onClick={openProfile}>表示する段階を選ぶ</Action>}>妊娠・出産・子育ての項目は、今の二人の希望に合わせて開けます。</EmptyState>:!chapterGroups.length?<EmptyState symbol={<Map/>} title="この章に、今の二人向けのスタンプはありません。" action={<Action secondary onClick={openProfile}>設定を開く</Action>}>式の有無や働き方を変えると、表示されるマスが変わります。</EmptyState>:<>
 <StampIllustBoard groups={chapterGroups} tasksFor={g=>scoped.filter(t=>g.ids.includes(t.id)&&book.records[t.id]?.status!=='na')} recordStatus={id=>book.records[id]?.status} profile={p} activeId={activeGroup?.id} activeTaskId={taskId||undefined} onSelectGroup={setGroupId} onPressStamp={openTask} recordPair={id=>pairChecks(book.records[id])} onTogglePair={(id,who)=>void togglePairCheck(id,who)} />

 </>}
 </section>
 {chapter==='life'&&<ShoppingList shopping={book.shopping||emptyShopping} profile={p} busy={data.busy} save={shopSave}/>}
 <div className={`milestone ${newLifeReady?'reached':''}`}><span className="milestone-seal">進</span><div><h3>{newLifeReady?'結婚準備と新生活の項目をひと通り確認しました。':'一歩ずつ、ふたりの暮らしに。'}</h3><p>{newLifeReady?'ほかの章で、次の一歩を続けられます。':'結婚準備と新生活の項目を進めると、ここに進捗がまとまります。'}</p></div></div>
 </TabsContent>
 <TabsContent value="deadlines" className="tab-surface deadlines-tab">
 <GoogleFamilyCalendar cal={book.googleCal||emptyGoogleCal} busy={data.busy} onSaveId={async id=>!!(await data.mutate({action:'googleCal',patch:{id}},'カレンダーのIDを保存しました'))}/>
 <WeekTogether profile={p} range={week.range} items={week.items} shares={week.shares} records={book.records} busy={data.busy} onToggleCheck={(id,who)=>void togglePairCheck(id,who)}/>
 </TabsContent>
 <TabsContent value="money" className="tab-surface money-tab">
 <SectionTitle eyebrow="お金" title="お金のことを、ひとつに。" sub="家計の分け方、記録した金額、お金の締切。ロードマップのスタンプはここへ移していません。"/>
 <nav className="deadlines-mini-nav" aria-label="お金タブ内の節">
  <a href="#pair-household">家計の分け方</a>
  <a href="#money-shopping">買い物リスト</a>
  <a href="#money-totals">金額の集計</a>
  <a href="#money-hero">数字</a>
  <a href="#money-deadlines">締切</a>
  <a href="#money-faq">項目と質問</a>
 </nav>
 <HouseholdSplitCard value={book.household||emptyHousehold} busy={data.busy} onSave={async patch=>!!(await data.mutate({action:'household',patch},'家計の分け方を、ふたりの合意として残しました'))}/>
 <section id="money-shopping" className="paper-card money-block" aria-label="新生活の買い物リスト">
  <h2 className="deadline-block-label">新生活の買い物リスト</h2>
  <p className="hint">ロードマップの「新生活」にあります。こちらへは移していません。</p>
  <button type="button" className="text-button" onClick={openShopping}>ロードマップの新生活で開く</button>
 </section>
 <MoneySummary book={book}/>
 <div id="money-hero"><HeroNumbersPanel profile={p}/></div>
 <InstitutionalDeadlines moneyOnly child={p.child} home={p.home}/>
 <div className="stack-actions">
  <Action secondary onClick={()=>{setPairBookOpen(true);setPairJump({theme:'お金・働き方'});setTab('pair');}}>博士の「お金・働き方」</Action>
  <Action secondary onClick={()=>openBlock('archive','deadline-block-phases')}>時期の区切り</Action>
 </div>
 <details id="money-faq" className="paper-card money-block">
  <summary><strong>給付・税・資産の項目（{moneyTasks.length}）</strong><span className="hint">質問は項目を開くと読めます。ロードマップのスタンプはそのままです。</span></summary>
  <div className="results-list">{moneyTasks.map(t=>renderTask(t,true))}</div>
 </details>
 <details id="money-contracts" className="paper-card money-block">
  <summary><strong>契約・固定費の項目（{moneyContracts.length}）</strong><span className="hint">保険・光熱・カードなど。質問は項目を開くと読めます。</span></summary>
  <div className="results-list">{moneyContracts.map(t=>renderTask(t,true))}</div>
 </details>
 </TabsContent>
 <TabsContent value="pair" forceMount className="tab-surface pair-tab data-[state=inactive]:hidden">
  <FutariDaily book={book} busy={data.busy} save={futariSave} active={tab==='pair'}/>
  <p className="money-moved paper-card">家計の分け方は<button type="button" className="desk-linkish" onClick={()=>openMoney('pair-household')}>お金</button>タブへ移動しました。</p>
  <details className="paper-card pair-workbook-fold" id="pair-workbook" open={pairBookOpen} onToggle={e=>setPairBookOpen((e.currentTarget as HTMLDetailsElement).open)}>
   <summary><strong>ふたりの練習帳（行動・会話・合意）</strong><span className="hint">これまでのスタンプ台と、書きためた合意</span></summary>
   <SectionTitle eyebrow="ふたりの練習帳" title="スタンプで試す、日々の過ごし方。" sub="行動・会話・合意をスタンプ台で。押して試し、合わなければやめる表です。"/>
   <PairWorkbook book={book} busy={data.busy} onSavePractice={savePractice} onSaveAgreement={saveAgreement} jump={pairJump} onJumpHandled={()=>setPairJump(null)}/>
  </details>
 </TabsContent>
 <TabsContent value="find" className="tab-surface find-tab"><SectionTitle eyebrow="探す" title="二人に必要な制度を探す。" sub={`手続き、税、勤務先の制度、暮らしの工夫。全部で${tasks.length}項目を収録しています。デスクとロードマップに出る数（${actionable.length}項目）は、そのうち、いまの二人の候補（スキップしたものを除く）です。`}/>
 <div className="search-panel find-search-sticky"><label className="search-box"><Search size={21}/><Input aria-label="制度を検索" value={query} onChange={e=>setQuery(e.target.value)} placeholder="例：結婚祝金、引っ越し、NISA、育休…"/>{query&&<button className="icon-button" onClick={()=>setQuery('')} aria-label="検索をクリア"><X size={17}/></button>}</label><div className="search-filters find-filters-compact"><Choice label="暮らしの章" value={category} onChange={setCategory} options={{all:'すべての章',...Object.fromEntries(chapters.map(c=>[c.id,c.label]))}}/><Choice label="記録の状況" value={statusFilter} onChange={setStatusFilter} options={{all:'すべての状況',todo:'これから',learned:'確認した',preparing:'準備中',applied:'申請した',waiting:'結果待ち',done:'完了',na:'スキップ'}}/><label className="scope-toggle"><Switch checked={scopeOnly} onCheckedChange={setScopeOnly}/><span>いまの二人の候補だけ</span></label></div></div>
  <nav className="find-pin-nav" aria-label="探すタブ内の近道">
  <a href="#find-where-to-look" onClick={(e)=>{e.preventDefault();const el=document.getElementById('find-where-to-look');if(el instanceof HTMLDetailsElement){el.open=true;}el?.scrollIntoView({behavior:'smooth',block:'start'});}}>どこを見るか</a>
  <a href="#find-exclude-lies" onClick={(e)=>{e.preventDefault();const el=document.getElementById('find-exclude-lies');if(el instanceof HTMLDetailsElement){el.open=true;}el?.scrollIntoView({behavior:'smooth',block:'start'});}}>思い込み・もらえない制度</a>
 </nav>
 <details id="find-where-to-look" className="find-where-outer paper-card">
  <summary>
   <strong>市の窓口と、届出週の手順</strong>
   <span className="hint">婚姻届の窓口・オンライン手続き · 結婚新生活支援 · 最短パス</span>
  </summary>
  <DeskRoleLabels/>
  <FilingWeekPath onOpenTask={openTask}/>
 </details>
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
 <details id="find-exclude-lies" className="find-exclude-outer paper-card">
  <summary>
   <strong>思い込み・もらえない制度（{homeContent.lies_not_to_buy.length}+{excludeItems.length}）</strong>
   <span className="hint">検索のあとで読む用 · 誤解 {homeContent.lies_not_to_buy.length} · 対象外 {excludeItems.length}</span>
  </summary>
  <ExcludeAndLiesPanel/>
 </details>
 </TabsContent>
 <TabsContent value="archive" className="tab-surface archive-tab">
 <h1 className="sr-only">アーカイブ</h1>
 <details id="deadline-block-institutional" className="paper-card moved-fold">
  <summary><strong>制度の期限</strong><span className="hint">届出の期限もふくむ全部</span></summary>
  <InstitutionalDeadlines child={p.child} home={p.home}/>
  <p className="hint moved-note">日付は原則の計算です。出生届の休日は2026・2027年の祝日で補正しています。<SourceLink source={sources.holidays} compact/></p>
 </details>
 <details id="deadline-block-schedule" className="paper-card moved-fold">
  <summary><strong>項目の予定</strong><span className="hint">日付 {dated.length}件 · 14日以内 {soon.length}件</span></summary>
  <div className="schedule-layout schedule-layout-solo"><section className="schedule-main"><div className="schedule-summary"><div><strong>{dated.length}</strong><span>日付のある予定</span></div><div><strong>{soon.length}</strong><span>14日以内・経過した原則日</span></div><button onClick={openProfile}><Settings2 size={17}/>手続きの日付を入れる</button></div>
 {dated.length?<div className="timeline timeline-dense">{dated.map(({task:t,deadline:d},i)=><button className={`timeline-item ${difference(d.date,today)<=7?'near':''}`} key={`${t.id}-${d.kind}`} onClick={()=>openTask(t.id)}><span className="timeline-date"><small>{d.date.slice(0,4)}年</small><strong>{monthDay(d.date)}</strong><span>{new Intl.DateTimeFormat('ja-JP',{weekday:'short',timeZone:'UTC'}).format(new Date(d.date+'T00:00:00Z'))}曜日</span></span><span className="timeline-body"><span className="timeline-top"><span className={`status ${d.kind==='personal'?'status-learned':''}`}>{d.kind==='personal'?'二人の予定':d.uncertain?'原則日・要確認':'届出期限'}</span><span className="countdown">{deadlineText(d.date,today)}</span></span><strong>{t.title}</strong><span>{d.basis}</span></span><ChevronRight size={18}/></button>)}</div>:<EmptyState symbol={<CalendarDays/>} title="次の予定を、ひとつ決めよう。" action={validDate(p.wdate)?undefined:<Action secondary onClick={openProfile}>婚姻日を入れる</Action>}>日付が分かれば、ここに期限が出ます。</EmptyState>}
 {missingDates.length>0&&<details className="missing-dates missing-dates-fold"><summary><strong>日付が分かったら確認</strong><span className="hint">{missingDates.length}件 · 閉じたまま大丈夫</span></summary>{missingDates.map(({task:t,deadline:d})=><button key={t.id} onClick={()=>openTask(t.id)}><span><strong>{t.title}</strong><small>{d.missing}が未設定</small></span><ChevronRight size={16}/></button>)}</details>}
 </section></div>
 </details>
 <details id="deadline-block-phases" className="paper-card moved-fold">
  <summary><strong>時期の区切り</strong><span className="hint">結婚前後から暮らしまで</span></summary>
  <PhasesPanel child={p.child} home={p.home} onOpenProfile={openProfile}/>
 </details>
 <details id="archive-app-calendar" className="paper-card moved-fold app-cal-fold"><summary><strong>アプリの予定</strong><span className="hint">お知らせのもと · カレンダーに書き出す</span></summary>
  <div className="export-cal-wrap"><Action secondary onClick={exportCalendar}><Download/>カレンダーに書き出す</Action>{!calendarEvents.length&&<p className="hint export-cal-hint">書き出せる予定はまだありません。</p>}</div>
  <DeadlinesCalendar profile={p} events={book.events||[]} busy={data.busy} onSave={savePairEvent} onDelete={deletePairEvent} focus={calFocus} itemsFor={calExtrasFor} reminders={remindersVal} onOpenTask={openTask}/>
 </details>
 <details id="archive-later" className="paper-card moved-fold">
  <summary><strong>あとで見る</strong><span className="hint">項目・質問・レッスンにつけた印（{laterBook.items.length}件）</span></summary>
 <LaterList later={laterBook} profile={p} busy={data.busy} canShare={!!readMe()} onOpen={openLater} onShare={(it,text)=>void shareLater(it,text)} renderInline={laterInline}/>
 </details>
 <details id="archive-desk-detail" className="paper-card moved-fold">
  <summary><strong>くわしく見る</strong><span className="hint">章ごとの進み・最近の動き・つながり・重さ・種類</span></summary>
  <MarriageDesk detailOnly book={book} profile={p} scoped={scoped} actionable={actionable} done={done} soonCount={soon.length} today={today} hasBook={!!data.book} onOpenTask={openTask} onOpenProfile={openProfile}/>
 </details>
 </TabsContent>
 <TabsContent value="settings" className="tab-surface"><SectionTitle eyebrow="設定" title="ふたりらしい手帳に。" sub="よく使うものから順に並べています。"/>
 <SettingsOverview sync={{on:data.syncConfig.enabled,status:data.syncStatus,problem:!!data.syncProblem}} line={line.state} ai={{on:grokEnabled,key:!!grokKey.trim()}} go={revealAndScroll}/>
 <div className="settings-stack">
 <SettingsCard id="settings-profile" icon={<Users size={20}/>} title="ふたりのプロフィール" lead="呼び名・住まい・婚姻日。表示する制度がこれで決まります。"><p className="profile-names">{p.name1||'一人目'} <span>&</span> {p.name2||'二人目'}</p><dl><div><dt>住まい</dt><dd>広島市 {p.ward==='未設定'?'（区は未設定）':p.ward}</dd></div><div><dt>婚姻日・予定日</dt><dd>{p.wdate?shortDate(p.wdate):'未設定'}</dd></div><div><dt>子育ての章</dt><dd>{['unknown','none'].includes(p.child)?'表示していません':'選んだ段階を表示'}</dd></div></dl><Action secondary onClick={openProfile}>プロフィールを整える<ArrowRight/></Action></SettingsCard>
 <SettingsCard id="settings-backup" icon={<ArrowDownToLine size={20}/>} title="データ（書き出し・バックアップ）" lead="記録はこの端末の中。受け渡しや機種変更はバックアップで。" more={<><p>記録（進みぐあい・メモ・金額）は、この端末のブラウザの中に保存されます。二人で同じ手帳を使うときや端末を変えるときは、バックアップのファイルを書き出して、もう一方の端末で読み込んでください。</p><p className="hint">バックアップには、名前・日付・メモが入ります。渡す相手と保管先を選んでください。</p><p className="hint">以前の版で書き出したファイルも読み込めます（自動では移りません）。</p></>}><input ref={uploadRef} type="file" accept=".json,application/json" className="sr-only" aria-label="手帳のバックアップ" onChange={e=>{const file=e.target.files?.[0];if(file)void loadBackup(file);e.target.value='';}}/><div className="stack-actions"><Action secondary onClick={exportBackup} disabled={!data.book}><Download/>バックアップを書き出す</Action><Action secondary onClick={()=>uploadRef.current?.click()}><ArrowUpRight/>バックアップを読み込む</Action><Action secondary onClick={()=>window.print()}><Printer/>手帳を印刷・PDFにする</Action></div></SettingsCard>
 <SyncSettings data={data} profile={p}/>
 <LineNotifySettings book={book} line={line} save={saveLineNotify} onOpenSync={()=>revealAndScroll('settings-gist-sync')}><RemindersCard value={remindersVal} busy={data.busy} save={saveReminders} lineState={line.state} sync={remSync} preview={remindPreview}/><MeetingCard value={remindersVal} busy={data.busy} save={saveReminders} lineState={line.state} sync={remSync}/>
</LineNotifySettings>
 <SettingsCard id="settings-ai" icon={<Sparkles size={20}/>} title="AI（Amityちゃんの調べもの）" chip={<StatusChip tone={!grokEnabled?'off':grokKey.trim()?'on':'wait'}>{!grokEnabled?'オフ':grokKey.trim()?'オン':'キーなし'}</StatusChip>} lead="オンのときだけ xAI に送ります（クレジットを使います）。" more={<><p>Amityちゃんは、手帳の内容から探すのに加えて、AI（xAI の Grok）で調べた答えを足せます。AIで調べるには、下の「AIのキーと接続先」に xAI のキーを入れてください。キーはこの端末の中だけに保存され、同期やバックアップには入りません（もう一方の端末では、その端末でも入れてください）。キーが無くても、手帳の中から探す答えは出ます。</p><p className="hint">オフのときは、Amityちゃんのチャット・「今の制度を調べる」・博士タブのAI助言は、すべて手帳の中だけから答えます（xAIへは送りません）。オンでキーがあるときだけクレジットを使います。この端末だけに保存されます。</p></>}><label className="scope-toggle settings-switch"><Switch checked={grokEnabled} onCheckedChange={v=>{setGrokEnabled(v);setGrokEnabledState(v);toast.success(v?'AIを使う（クレジットを使う）をオンにしました':'AIをオフにしました（xAIへ送りません）');}}/><span>AIを使う（クレジットを使う）</span></label>
 <div id="settings-research" className="settings-tool"><h3><Search size={17}/>今の制度を調べる</h3><p className="hint">AIで短く調べます。「探す」タブで同じ言葉の項目も見られます。</p><div className="field" style={{width:'100%',marginBottom:12}}><Label htmlFor="policy-research-q">調べたいこと</Label><Input id="policy-research-q" value={researchQ} onChange={e=>setResearchQ(e.target.value)} placeholder="例：広島市 児童手当 申請、転入届の期限…" maxLength={200} autoComplete="off" disabled={researchBusy}/></div><div className="stack-actions"><Action secondary disabled={researchBusy||!researchQ.trim()} onClick={()=>void(async()=>{const q=researchQ.trim().slice(0,200);if(!q)return;setResearchBusy(true);setResearchOut('');try{if(!isGrokEnabled()){setResearchOut(GROK_AI_OFF_JA);toast.info('AIはオフです');}else{const r=await askGrokResearch(q);if(r.ok)setResearchOut(r.text);else if(r.error==='no-key'){markGrokLocalOnly('no-key');setResearchOut('AIのキーがまだ入っていません。下の「AIのキーと接続先」で xAI のキーを入れるか、まず「探す」タブで確認してね。');toast.info('キーがないため「探す」タブを開きます');setQuery(q);setTab('find');}else if(isGrokCreditsLimitResult(r.error)){markGrokLocalOnly('credits-limit');const local=answerDeskQuery(q,3,p);setResearchOut(`${GROK_CREDITS_LIMIT_JA}\n\n—— 手帳の中の案内 ——\n${local.text}`);toast.error(GROK_CREDITS_LIMIT_JA,{duration:8000});}else{setResearchOut(`調べられなかったよ。${grokErrorJa(r.error)} 公式案内もあわせて確認してね。`);toast.error(grokErrorJa(r.error));}}}finally{setResearchBusy(false);}})()}>{researchBusy?<><LoaderCircle className="spin" size={16}/>調べています…</>:<><Sparkles size={16}/>Amityに調べてもらう</>}</Action><Action secondary disabled={!researchQ.trim()} onClick={()=>{setQuery(researchQ.trim());setTab('find');}}>「探す」で見る<ArrowRight/></Action></div>{researchOut&&<div className="research-result" role="status"><p className="hint" style={{marginBottom:6}}>Amityの調べメモ（金額は勝手に作りません。結婚新生活支援は広島市では受けられません）</p><p style={{whiteSpace:'pre-wrap',fontSize:13,lineHeight:1.55,margin:0}}>{researchOut}</p></div>}<p className="hint" style={{marginTop:10}}>{!isGrokEnabled()?'AIはオフです（上のスイッチでオンにできます）。':loadGrokKey()?'AIで調べられます。':'AIのキーがなくても「探す」タブは使えます。'}</p></div>
 <Fold id="settings-grok" title="AIのキーと接続先" hint="xAI のキー・接続先・利用枠"><div className="field" style={{width:'100%',marginBottom:12}}><Label htmlFor="amity-grok-key">xAI のキー</Label><Input id="amity-grok-key" type="password" autoComplete="off" value={grokKey} onChange={e=>setGrokKey(e.target.value)} onBlur={()=>{saveGrokKey(grokKey);if(grokKey.trim()){clearGrokLocalOnly();}else{markGrokLocalOnly('no-key');}toast.success(grokKey.trim()?'AIのキーをこの端末に保存しました':'AIのキーを消しました');}} placeholder="xAI のキーを貼り付け" maxLength={200}/></div><div className="field" style={{width:'100%',marginBottom:12}}><Label htmlFor="amity-grok-base">接続先のURL（ふだんは変えません）</Label><Input id="amity-grok-base" value={grokBase} onChange={e=>setGrokBase(e.target.value)} onBlur={()=>{saveGrokBase(grokBase||DEFAULT_GROK_BASE);setGrokBase(loadGrokBase());}} placeholder={DEFAULT_GROK_BASE} maxLength={200} autoComplete="off"/><p className="hint" style={{marginTop:6}}>初期値 {DEFAULT_GROK_BASE}</p></div>
<p className="hint" style={{marginTop:8}}>AIで調べるには、xAI の利用枠が必要です。このアプリからは購入できません。枠が上限のときは <a href={GROK_CREDITS_CONSOLE_URL} target="_blank" rel="noopener noreferrer">xAI コンソール（console.x.ai）</a> で増やしてください。</p>
<div className="stack-actions" style={{marginTop:10}}><Action secondary onClick={()=>window.open(GROK_CREDITS_CONSOLE_URL,'_blank','noopener,noreferrer')}><ExternalLink size={16}/>利用枠を増やす（xAIコンソール）</Action></div></Fold>
 </SettingsCard>
 <section id="settings-advanced" className="paper-card settings-card settings-sec settings-advanced"><details className="settings-advanced-fold" id="settings-advanced-fold"><summary><span className="settings-sec-icon" aria-hidden="true"><Settings2 size={20}/></span><span><h2>詳細</h2><span className="hint">ふだんは開かなくて大丈夫（この端末の合言葉・見直しメモ・リセット）</span></span></summary>
 <SiteLockSettings/>
 <div className="settings-sub"><h3><RefreshCw size={17}/>毎年の見直しメモ</h3><p className="hint">年に一度、締切や対象条件を見直すときの手順です。</p><details className="yearly-fold"><summary>メモを開く</summary><pre className="yearly-update-pre">{yearlyUpdateMd}</pre></details></div>
 <div className="settings-sub danger-reset-card"><h3><Trash2 size={17}/>スタンプ進捗をリセット</h3><p className="hint">スタンプ・金額・メモだけを消します（プロフィールと記念手帳は残ります）。</p><More><p>各項目のスタンプ状態・金額・メモだけを消します。プロフィールと記念手帳の文章は残します。バックアップを先に書き出すことをおすすめします。</p><p className="hint">誤タップ防止のため、確認ダイアログで「リセット」と入力し、もう一度チェックを入れる必要があります。</p></More><div className="stack-actions"><Action secondary onClick={()=>{setResetTyped('');setResetAck(false);setResetOpen(true);}} disabled={!data.book||data.busy}><Trash2/>スタンプ進捗をリセット…</Action></div></div>
 </details></section>
</div>
 <div className="settings-stack settings-stack-after"><SettingsCard id="settings-policy" icon={<ShieldCheck size={20}/>} title="安心して確かめるために" lead="制度の適用は申請先が決めます。申請や契約の前に、公式案内を確かめてください。" more={<><p>この手帳は、制度を調べて手続きを進めるための案内です。給付や税の適用は、二人の条件と申請先の判断で決まります。</p><p>内容を確認した日を参照先ごとに表示しています。未確認の案内はその旨を表示し、勤務先・契約ごとの条件は窓口への質問としてまとめています。</p><p>制度の更新は自動配信されません。申請・契約の前には、公式案内と予算・受付状況を再確認してください。</p><h3 className="settings-more-h">使い続けるためのメモ</h3><ul><li>記録はこの端末のブラウザの中に保存されます。</li><li>端末を変えるときや二人で受け渡すときは、バックアップのファイルを使います。</li><li>端末どうしの自動同期は「同期」、AIのキーは「AI」のカードにあります。</li><li>スマートフォンのブラウザーの「ホーム画面に追加」から、すぐ開けるようにできます（名前は「Amityちゃん」）。合言葉を入れて開いたあとで追加してください。前に追加したものは、いったん消して追加し直すと新しい名前になります。</li></ul></>}><button className="text-button" onClick={()=>void data.refresh()}><RefreshCw size={15}/>最新の保存内容を読み込む</button></SettingsCard></div>
 </TabsContent>
 <footer className="book-footer"><span>Amityちゃん · 広島市 · 情報の確認日 {reviewedOn}</span></footer>
 </main></Tabs>
 <Sheet open={!!task} onOpenChange={open=>{if(!open)callClose(forceClose);}}><SheetContent side="right" className="task-sheet"><SheetHeader><span className="eyebrow">{task?typeLabels[task.type]:''} <i> / </i> ふたりの一歩</span><SheetTitle>{task?.title}</SheetTitle><SheetDescription>{task?.summary}</SheetDescription></SheetHeader>{task&&<TaskForm key={task.id} task={task} profile={p} record={book.records[task.id]} onSave={saveRecord} busy={data.busy} onDirty={setDirty} hasBook={!!data.book} onProfile={openProfile} flushOnUnmountRef={flushTaskOnUnmountRef}/>}</SheetContent></Sheet>
 <Dialog open={!!modal} onOpenChange={open=>{if(!open)callClose(forceClose);}}><DialogContent className={`notebook-dialog dialog-${modal}`}><DialogHeader><p className="eyebrow">ふたりの手帳</p><DialogTitle>{modal==='profile'?'ふたりに合わせて、整える。':'同じ手帳を、ふたりで。'}</DialogTitle><DialogDescription>{modal==='profile'?'すべての項目はあとから変えられます。':'記録はこの端末の中に保存されます。もう一方の端末へは、バックアップのファイルで渡せます。'}</DialogDescription></DialogHeader>
 {modal==='profile'&&<ProfileForm profile={p} onSave={saveProfile} busy={data.busy} onDirty={setDirty} hasBook={!!data.book}/>}
 {modal==='pair'&&<div className="form-stack pair-content">
<ol className="pair-steps">
 <li>この端末で「バックアップを書き出す」を押します。</li>
 <li>できたファイルを相手に渡します（メール・メッセージ・AirDrop など）。</li>
 <li>相手の端末で「設定」の「バックアップを読み込む」から開きます。</li>
</ol>
<div className="stack-actions" style={{marginBottom:16}}>
 <Action secondary disabled={!data.book} onClick={()=>{exportBackup();}}><Download/>バックアップを書き出す</Action>
 {!data.book&&<Action secondary onClick={()=>setModal('profile')}>新しい手帳を整える<ArrowRight/></Action>}
</div>
<details className="pair-legacy-fold">
 <summary>詳細設定</summary>
 <p className="hint">ファイルを渡さずに自動でそろえたいときは、設定の「同期（端末どうし）」を使えます（GitHub のアカウントが必要です）。</p>
 <Action secondary onClick={()=>{forceClose();setTab('settings');revealAndScroll('settings-gist-sync');}}><Cloud/>自動同期の設定を開く</Action>
 <p className="hint" style={{marginTop:12}}>以前に受け取った招待コードでは、いまはつながりません。バックアップのファイルで受け渡してください。</p>
 <div className="field"><Label htmlFor="join-code">以前の招待コード</Label><Input id="join-code" value={joinCode} onChange={e=>setJoinCode(e.target.value)} placeholder="受け取ったコード" maxLength={100} autoComplete="off"/></div>
 <SaveAction busy={data.busy} disabled={!/^[a-f0-9]{48}$/.test(joinCode.trim().toLowerCase())} onClick={()=>void(async()=>{await data.mutate({action:'join',code:joinCode.trim().toLowerCase()},'');setJoinCode('');})}>コードを確かめる</SaveAction>
</details>
</div>}
 </DialogContent></Dialog>
 <AlertDialog open={resetOpen} onOpenChange={open=>{if(!open&&!data.busy){setResetOpen(false);setResetTyped('');setResetAck(false);}}}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>スタンプ進捗をリセットしますか？</AlertDialogTitle><AlertDialogDescription>ロードマップのスタンプ状態・入力した金額・項目メモをすべて消します。プロフィール（呼び名・婚姻日など）と記念手帳の文章は残ります。この操作は取り消せません。先にバックアップの書き出しを推奨します。</AlertDialogDescription></AlertDialogHeader><div className="reset-lock"><div className="field"><Label htmlFor="reset-type">確認のため「リセット」と入力</Label><Input id="reset-type" value={resetTyped} onChange={e=>setResetTyped(e.target.value)} placeholder="リセット" autoComplete="off" maxLength={20} disabled={data.busy}/></div><label className="reset-confirm-row"><Checkbox checked={resetAck} onCheckedChange={v=>setResetAck(!!v)} disabled={data.busy}/><span>上記の内容を理解し、スタンプ進捗だけを消すことに同意します（二重確認）</span></label></div><AlertDialogFooter><AlertDialogCancel disabled={data.busy}>やめる</AlertDialogCancel><AlertDialogAction disabled={data.busy||resetTyped!=='リセット'||!resetAck} onClick={e=>{e.preventDefault();void resetStampProgress();}}>本当にリセットする</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
 <AlertDialog open={!!pendingClose} onOpenChange={open=>{if(!open)setPendingClose(null);}}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>入力中の内容を閉じますか？</AlertDialogTitle><AlertDialogDescription>まだ保存していない変更があります。編集を続けるか、変更を破棄して閉じられます。</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>編集を続ける</AlertDialogCancel><AlertDialogAction onClick={()=>{flushTaskOnUnmountRef.current=false;setDirty(false);pendingClose?.();setPendingClose(null);window.setTimeout(()=>{flushTaskOnUnmountRef.current=true;},0);}}>変更を破棄して閉じる</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
 <AlertDialog open={!!importDraft} onOpenChange={open=>{if(!open&&!data.busy)setImportDraft(null);}}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>このバックアップを読み込みますか？</AlertDialogTitle><AlertDialogDescription>{importDraft?.legacy?'旧版の状況を移行します。手順が変わっているため、旧版の小さなチェックと調査メモ・除外理由は自動移行しません。働き方は各自で設定し直してください。':'名前・日付・進捗・記念手帳を復元します。'} 現在の二人の手帳の内容は、このバックアップで置き換わります。</AlertDialogDescription></AlertDialogHeader><div className="import-details"><p>{importDraft?.book.profile.name1||'名前未設定'} & {importDraft?.book.profile.name2||'名前未設定'}</p><p>{Object.keys(importDraft?.book.records||{}).length}項目の記録 · {importDraft?.book.memories.length}件の記念</p><Action secondary onClick={exportBackup} disabled={!data.book}><Download/>現在の内容を先に書き出す</Action></div><AlertDialogFooter><AlertDialogCancel disabled={data.busy}>キャンセル</AlertDialogCancel><AlertDialogAction disabled={data.busy} onClick={e=>{e.preventDefault();void(async()=>{if(importDraft&&await data.mutate({action:'import',book:importDraft.book},'手帳を読み込みました'))setImportDraft(null);})();}}>この内容に置き換える</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>


 <button type="button" className="amity-fab" onClick={()=>setChatOpen(true)} aria-label="Amityちゃんにきく" hidden={chatOpen || !!taskId || tab==='pair'} aria-hidden={chatOpen || !!taskId || tab==='pair'}>
  <img src="./desk-mascot.png" alt="" decoding="async"/>
 </button>
 
 <Sheet open={quickOpen} onOpenChange={open=>{setQuickOpen(open);if(!open)setQuickQ('');}}><SheetContent side="bottom" className="quick-search-sheet" showCloseButton={true}><SheetHeader><SheetTitle>さがす</SheetTitle><SheetDescription>項目・画面・期限・設定・ふたりの練習へジャンプできます。</SheetDescription></SheetHeader><div className="quick-search-body"><label className="search-box quick-search-input"><Search size={20}/><Input autoFocus value={quickQ} onChange={e=>setQuickQ(e.target.value)} placeholder="項目・画面・期限を検索" aria-label="項目・画面・期限を検索" maxLength={80}/>{quickQ&&<button type="button" className="icon-button" onClick={()=>setQuickQ('')} aria-label="クリア"><X size={16}/></button>}</label><div className="quick-search-list" role="listbox" aria-label="検索結果">{!quickQ.trim()&&<p className="quick-search-hint">よく使う画面</p>}{quickGroups.map(g=><div key={g.kind} className="quick-search-group"><h3>{g.label}</h3>{g.items.map(hit=><button type="button" key={hit.id} className="quick-search-item" onClick={()=>runQuickHit(hit)}><span className="quick-search-item-main"><strong>{hit.title}</strong>{hit.hint&&<small>{hit.hint}</small>}</span><ChevronRight size={16}/></button>)}</div>)}{quickQ.trim()&&!quickHits.length&&<p className="quick-search-empty">見つかりませんでした。別の言葉で試してください。</p>}</div></div></SheetContent></Sheet>

 <DeskChatPanel open={chatOpen} onClose={()=>setChatOpen(false)} profile={p} onOpenTask={(id)=>{setChatOpen(false);if(id==='deadlines')openBlock('archive','institutional-deadlines');else if(id==='phases')openBlock('archive','deadline-block-phases');else if(id==='exclude')openBlock('find','find-exclude-lies');else openTask(id);}} onGoFind={(kw)=>{setChatOpen(false);if(kw)setQuery(kw);setTab('find');}}/>
 <OnboardingSheet open={onboardOpen&&!modal&&!taskId} profile={p} busy={data.busy} onSave={async(profile)=>{const ok=!!(await data.mutate({action:'profile',profile},'ふたりに合わせて手帳を整えました'));if(ok)setOnboardOpen(false);return ok;}} onSkip={()=>{markOnboardingDone();setOnboardOpen(false);}}/>

 <div className="print-book"><h1>Amityちゃん</h1><h2>{p.name1||'一人目'}さん & {p.name2||'二人目'}さん</h2><p>広島市 {p.ward!=='未設定'?p.ward:''} · 書き出し {shortDate(today)}</p><h2>これまでの一歩</h2><p>{done.length}項目が完了</p><table><thead><tr><th>項目</th><th>状況・記録</th></tr></thead><tbody>{tasks.filter(t=>(p.ceremony!=='no'||!isCeremonyTask(t))&&book.records[t.id]).map(t=><tr key={t.id}><td>{t.title}</td><td>{statusNames[book.records[t.id].status]||book.records[t.id].status}{book.records[t.id].note?` · ${book.records[t.id].note}`:''}<br/>{book.records[t.id].due&&`予定：${book.records[t.id].due}`}</td></tr>)}</tbody></table><h2>これからの予定</h2>{dated.map(({task:t,deadline:d})=><p key={`${t.id}-${d.kind}`}>{d.date} · {t.title} · {d.kind==='personal'?'二人の予定':'原則・条件を確認'}<br/>{d.basis}</p>)}<h2>ふたりの言葉</h2>{book.memories.map(m=><section key={m.id}><h3>{m.date} {m.title}</h3><p className="print-letter">{m.text}</p></section>)}<p>各制度の最新条件は手帳内の公式参照先で確認してください。案内の内容確認日：{reviewedOn}</p></div>
 </LaterProvider>;
}
