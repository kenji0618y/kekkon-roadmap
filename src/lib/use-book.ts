import {useCallback,useEffect,useRef,useState} from 'react';
import {toast} from 'sonner';
import {bookSchema,emptyBoard,emptyBook,emptyFutari,type AgreementRecord,type Book,type BoardNote,type FutariAnswer,type FutariMode,type Memory,type PairEvent,type PracticeRecord,type Profile,type TaskRecord} from './model';
import {mergeFutari,sameFutari} from './futari';
import {mergeBoard,pruneDeleted,sameBoard} from './board';

/** 二人が同時に書き込むもの（今日の一問の答え・掲示板のメモ）は、同期のとき両方を残す。 */
function mergeShared(local:Book|null|undefined,remote:Book){
  return {futari:mergeFutari(local?.futari,remote.futari),board:mergeBoard(local?.board,remote.board)};
}
function sameShared(a:{futari:Book['futari'],board:Book['board']},b:{futari:Book['futari'],board:Book['board']}){
  return sameFutari(a.futari,b.futari)&&sameBoard(a.board,b.board);
}
import {validateCatalogBook} from './backup';
import {
  buildPayload,
  compareRemote,
  createEncryptedGist,
  deleteLegacyGist,
  deleteOwnDuplicate,
  discoverGists,
  forgetLegacyConfig,
  GistHttpError,
  KeyMismatchError,
  pullEncrypted,
  pullLegacy,
  pushEncrypted,
  readSyncConfig,
  seenDevices,
  testGistConnection,
  writeSyncConfig,
  type DeviceSeen,
  type GistSyncConfig,
  type SyncStatus,
} from './gist-sync';
import {mergeBooks,newerFirst} from './book-merge';

/** 同期の困りごと（画面に出す）：key=キーが相手と違う / auth=キーが使えない / target=同期先がまだない */
export type SyncProblem=''|'key'|'auth'|'target';
export const KEY_MISMATCH_JA='相手の端末と「アクセス用のキー」が違うため、同期の中身を読めませんでした。二人とも同じキーを入れてください（この端末の内容は送っていません）。';
function stableJson(v:unknown):string{
  if(Array.isArray(v))return `[${v.map(stableJson).join(',')}]`;
  if(v&&typeof v==='object')return `{${Object.keys(v as object).sort().map(k=>`${JSON.stringify(k)}:${stableJson((v as Record<string,unknown>)[k])}`).join(',')}}`;
  return JSON.stringify(v)??'null';
}

const STORAGE_KEY='futari-miraicho-v1';
const PUSH_DEBOUNCE_MS=800;
const PULL_INTERVAL_MS=20_000;

export type Snapshot={book:Book|null,revision:number,members:{slot:number,display_name:string}[],slot:number};

function readStored():{book:Book|null,revision:number,savedAt:string}{
  try{
    const raw=localStorage.getItem(STORAGE_KEY);
    if(!raw)return {book:null,revision:0,savedAt:''};
    const data=JSON.parse(raw) as {book?:unknown,revision?:number,savedAt?:string};
    const parsed=bookSchema.safeParse(data.book);
    if(!parsed.success)return {book:null,revision:0,savedAt:''};
    return {
      book:validateCatalogBook(parsed.data),
      revision:Number(data.revision)||1,
      savedAt:typeof data.savedAt==='string'?data.savedAt:'',
    };
  }catch{
    return {book:null,revision:0,savedAt:''};
  }
}

function writeStored(book:Book,revision:number,savedAt?:string){
  const at=savedAt||new Date().toISOString();
  localStorage.setItem(STORAGE_KEY,JSON.stringify({format:'futari-miraicho',version:1,revision,book,savedAt:at}));
  return at;
}

function localMember(book:Book|null){
  if(!book)return [] as {slot:number,display_name:string}[];
  const name=book.profile.name1||'あなた';
  return [{slot:1,display_name:name}];
}

export function useBook(_paused:boolean){
  const [snapshot,setSnapshot]=useState<Snapshot>({book:null,revision:0,members:[],slot:0});
  const [phase,setPhase]=useState<'loading'|'ready'|'error'>('loading');
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[savedAt,setSavedAt]=useState('');
  const [syncStatus,setSyncStatus]=useState<SyncStatus>(()=>readSyncConfig().enabled?'ok':'off');
  const [lastSyncAt,setLastSyncAt]=useState('');
  const [syncConfig,setSyncConfig]=useState<GistSyncConfig>(()=>readSyncConfig());
  const [syncProblem,setSyncProblemState]=useState<SyncProblem>('');
  const syncProblemRef=useRef<SyncProblem>('');
  const setSyncProblem=useCallback((v:SyncProblem)=>{syncProblemRef.current=v;setSyncProblemState(v);},[]);
  const [devices,setDevices]=useState<Record<string,DeviceSeen>>({});
  /** 次に読めたときは「合流」（mergeBooks）にする。キーを変えた・読めなかった・前のキーで開いたとき。 */
  const joinNextRef=useRef(Boolean(readSyncConfig().prevToken));
  const runSyncRef=useRef<(mode:'pull'|'push'|'manual')=>Promise<string>>(async()=>'');
  const current=useRef(snapshot),working=useRef(false);
  const savedAtRef=useRef('');
  const pushTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const syncingRef=useRef(false);
  const localDirtyRef=useRef(false);
  const syncConfigRef=useRef(syncConfig);
  syncConfigRef.current=syncConfig;
  type QueuedMutate={payload:Record<string,unknown>,message:string,resolve:(v:Snapshot|null)=>void};
  const pendingQueue=useRef<QueuedMutate[]>([]);
  const mergeRemoteIntoLocalRef=useRef<(remote:{book:Book,revision:number})=>boolean>(()=>false);

  const accept=useCallback((data:Snapshot)=>{
    current.current=data;
    setSnapshot(data);
    setPhase('ready');
  },[]);

  const schedulePush=useCallback(()=>{
    const cfg=syncConfigRef.current;
    if(!cfg.enabled||!cfg.token)return;
    if(pushTimer.current)clearTimeout(pushTimer.current);
    pushTimer.current=setTimeout(()=>{
      pushTimer.current=null;
      void runSyncRef.current('push');
    },PUSH_DEBOUNCE_MS);
  },[]);

  const applyRemote=useCallback((remote:{book:Book,revision:number,savedAt:string})=>{
    const at=writeStored(remote.book,remote.revision,remote.savedAt||new Date().toISOString());
    savedAtRef.current=at;
    setSavedAt(at);
    localDirtyRef.current=false;
    accept({
      book:remote.book,
      revision:remote.revision,
      members:localMember(remote.book),
      slot:1,
    });
  },[accept]);

  /** 他の端末の更新を取り込むとき、ふたりの一問の答えと掲示板のメモは両方を残す（同時に書いても消えない）。 */
  const applyRemoteMerged=useCallback((remote:{book:Book,revision:number,savedAt:string})=>{
    const local=current.current.book;
    const merged=mergeShared(local,remote.book);
    if(local&&!sameShared(merged,remote.book)){
      applyRemote({book:{...remote.book,...merged},revision:remote.revision+1,savedAt:new Date().toISOString()});
      localDirtyRef.current=true;
      return true;
    }
    applyRemote(remote);
    return false;
  },[applyRemote]);
  /** 手帳はこの端末のまま、相手の端末の答え・メモだけを足す。足したら相手が取り込めるよう revision を相手より上げる。 */
  const mergeRemoteIntoLocal=useCallback((remote:{book:Book,revision:number}):boolean=>{
    const snap=current.current;
    if(!snap.book)return false;
    const merged=mergeShared(snap.book,remote.book);
    if(sameShared(merged,snap.book))return false;
    const book={...snap.book,...merged};
    const revision=Math.max(snap.revision,remote.revision)+1;
    const at=writeStored(book,revision);
    savedAtRef.current=at;
    setSavedAt(at);
    localDirtyRef.current=true;
    accept({...snap,book,revision});
    return true;
  },[accept]);
  mergeRemoteIntoLocalRef.current=mergeRemoteIntoLocal;

  const saveCfg=useCallback((partial:Partial<GistSyncConfig>)=>{
    const next=writeSyncConfig({...syncConfigRef.current,...partial});
    syncConfigRef.current=next;
    setSyncConfig(next);
    return next;
  },[]);

  /**
   * 合流：other（古い同期先・キーが合わなかった間の相手・移行先）を、この端末の手帳に「消さずに」足す。
   * ふだんの同期（revision の新しい方を採る）ではなく、mergeBooks で両方を残す。変わったら true。
   */
  const joinInto=useCallback((other:{book:Book,revision:number,savedAt:string}):boolean=>{
    const snap=current.current;
    if(!snap.book){
      applyRemote(other);
      localDirtyRef.current=true;
      return true;
    }
    const [p,s]=newerFirst({book:snap.book,revision:snap.revision,savedAt:savedAtRef.current},{book:other.book,revision:other.revision,savedAt:other.savedAt});
    const merged=mergeBooks(p.book,s.book);
    const changed=stableJson(merged)!==stableJson(snap.book);
    if(!changed&&snap.revision>=other.revision)return false;
    const revision=Math.max(snap.revision,other.revision)+(changed?1:0);
    const at=changed?writeStored(merged,revision):writeStored(snap.book,revision,savedAtRef.current||undefined);
    savedAtRef.current=at;
    setSavedAt(at);
    if(changed)localDirtyRef.current=true;
    accept({...snap,book:changed?merged:snap.book,revision,members:localMember(changed?merged:snap.book),slot:1});
    return changed;
  },[accept,applyRemote]);

  /** 暗号化して送る（平文は送らない）。 */
  const pushNow=useCallback(async(cfg:GistSyncConfig,opts:{dropStrayPlain?:boolean}={})=>{
    const s=current.current;
    if(!s.book)return false;
    await pushEncrypted(cfg,buildPayload(s.book,s.revision,savedAtRef.current||undefined),opts);
    localDirtyRef.current=false;
    setDevices(seenDevices());
    return true;
  },[]);

  /**
   * 暗号化した同期先を決める。
   *   1) 設定にあればそれ
   *   2) なければ自分の Gist 一覧から探す（いちばん古いもの）→ 見つかったら合流
   *   3) なくて、古い（平文の）同期先があれば → 古い内容をこの端末に合流して、暗号化した同期先を新しく作る
   * 古い同期先には書かない。二台が同時に作ったら、古い方にそろえて自分の作った重複を消す。
   */
  const ensureTarget=useCallback(async(create:boolean):Promise<GistSyncConfig|null>=>{
    let cfg=syncConfigRef.current;
    if(!cfg.token)return null;
    if(cfg.gistId)return cfg;
    if(!cfg.deviceId)cfg=saveCfg({});
    const found=await discoverGists(cfg.token);
    // 自分の一覧にある古い同期先だけを使う（他人の Gist は取り込まない）。
    const legacyId=(found.legacy.find(g=>g.id===cfg.legacyGistId)||found.legacy[0])?.id||'';
    let legacySeen='';
    if(legacyId){
      const leg=await pullLegacy(cfg.token,legacyId);
      if(leg.payload)joinInto(leg.payload);
      legacySeen=leg.updatedAt;
    }
    const join=async(id:string)=>{
      cfg=saveCfg({gistId:id,legacyGistId:legacyId,legacySeen});
      const pulled=await pullEncrypted(cfg);
      if(pulled.strayPlain)joinInto(pulled.strayPlain);
      if(pulled.payload)joinInto(pulled.payload);
      await pushNow(cfg,{dropStrayPlain:!!pulled.strayPlain});
    };
    if(found.encrypted.length){
      await join(found.encrypted[0].id);
      return cfg;
    }
    if(!legacyId&&!create){
      if(!cfg.legacyGistId)return null;
      saveCfg({legacyGistId:''});
      return null;
    }
    const snap=current.current;
    const book=snap.book||structuredClone(emptyBook);
    const id=await createEncryptedGist(cfg,buildPayload(book,snap.book?snap.revision:0,savedAtRef.current||undefined));
    cfg=saveCfg({gistId:id,legacyGistId:legacyId,legacySeen,enabled:true});
    localDirtyRef.current=false;
    try{
      const again=await discoverGists(cfg.token);
      const winner=again.encrypted[0]?.id;
      if(winner&&winner!==id){
        await join(winner);
        await deleteOwnDuplicate(cfg,id,winner).catch(()=>undefined);
      }
    }catch{/* 確認できなくても、作った同期先で続ける */}
    return cfg;
  },[joinInto,pushNow,saveCfg]);

  /**
   * 同期の本体。mode:
   *   pull …… 定期・画面に戻ったとき（取り込み、必要なら送る）
   *   push …… この端末で書いた直後（先に相手の答え・メモを取り込んでから送る）
   *   manual …「今すぐ同期」（同期先がなければ作る。結果の文を返す）
   * 読めない（キーが違う・壊れている・つながらない）ときは、決して送らない。
   */
  const runSync=useCallback(async(mode:'pull'|'push'|'manual',opts:{quiet?:boolean}={}):Promise<string>=>{
    const cfg0=syncConfigRef.current;
    if(!cfg0.token){
      if(mode==='manual')throw new Error('アクセス用のキー（GitHub）を入力してください。');
      return '';
    }
    if(!cfg0.enabled&&mode!=='manual')return '';
    if(syncingRef.current){
      if(mode==='push')localDirtyRef.current=true;
      return mode==='manual'?'いま同期しています。少し待ってからもう一度押してください。':'';
    }
    syncingRef.current=true;
    setSyncStatus('syncing');
    try{
      const cfg=await ensureTarget(mode==='manual');
      if(!cfg){
        setSyncProblem('target');
        setSyncStatus('error');
        return '';
      }
      const pulled=await pullEncrypted(cfg);
      setSyncProblem('');
      let needPush=false,msg='すでに最新です';
      if(pulled.strayPlain){joinInto(pulled.strayPlain);needPush=true;}
      // 前のキーで開けた＝相手がまだ前のキー。合流して、いまのキーで送り直す。
      if(pulled.usedPrevKey){joinNextRef.current=true;needPush=true;}
      const remote=pulled.payload;
      if(!remote){
        needPush=needPush||!!current.current.book;
      }else if(joinNextRef.current){
        joinInto(remote);
        joinNextRef.current=false;
        needPush=true;
        msg='相手の端末の内容と合わせました';
      }else if(mode==='push'){
        mergeRemoteIntoLocal(remote);
        needPush=true;
      }else{
        const verdict=compareRemote({revision:current.current.revision,savedAt:savedAtRef.current},remote);
        if(verdict==='remote'){
          if(applyRemoteMerged(remote))needPush=true;
          if(!opts.quiet&&mode==='pull')toast.message('他の端末の更新を取り込みました');
          msg='相手の端末の内容を取り込みました';
        }else{
          const changed=mergeRemoteIntoLocal(remote);
          const snap=current.current;
          const remoteBehind=!!snap.book&&!sameShared(snap.book,remote.book);
          if(snap.book&&(changed||remoteBehind||(verdict==='local'&&(localDirtyRef.current||snap.revision>remote.revision))))needPush=true;
          if(mode==='manual'&&localDirtyRef.current)needPush=true;
          if(needPush)msg='この端末の内容を送りました';
        }
      }
      // 移行中だけ：古い（平文の）同期先を読むだけ。古い版のスマホが書いた分を消さずに取り込む。
      const live=syncConfigRef.current;
      if(live.legacyGistId){
        try{
          const leg=await pullLegacy(live.token,live.legacyGistId);
          if(leg.missing){
            saveCfg({legacyGistId:'',legacySeen:''});
            forgetLegacyConfig();
          }else if(leg.payload&&leg.updatedAt!==live.legacySeen){
            if(joinInto(leg.payload))needPush=true;
            saveCfg({legacySeen:leg.updatedAt});
          }
        }catch{/* 古い同期先が読めなくても、暗号化の同期は続ける */}
      }
      if(needPush)await pushNow(syncConfigRef.current,{dropStrayPlain:!!pulled.strayPlain});
      setDevices(seenDevices());
      setLastSyncAt(new Date().toISOString());
      setSyncStatus('ok');
      if(mode==='manual'&&!syncConfigRef.current.enabled)saveCfg({enabled:true});
      return msg;
    }catch(e){
      setSyncStatus('error');
      if(e instanceof KeyMismatchError){
        setSyncProblem('key');
        joinNextRef.current=true;
        if(mode==='manual')throw new Error(KEY_MISMATCH_JA);
        return '';
      }
      if(e instanceof GistHttpError&&e.status===401)setSyncProblem('auth');
      if(mode==='manual')throw e;
      return '';
    }finally{
      syncingRef.current=false;
    }
  },[applyRemoteMerged,ensureTarget,joinInto,mergeRemoteIntoLocal,pushNow,saveCfg]);
  runSyncRef.current=runSync;

  const pullAndReconcile=useCallback(async(opts?:{quiet?:boolean})=>{await runSync('pull',opts);},[runSync]);

  const refresh=useCallback(async(_quiet=false)=>{
    try{
      const stored=readStored();
      savedAtRef.current=stored.savedAt;
      setSavedAt(stored.savedAt);
      accept({
        book:stored.book,
        revision:stored.revision,
        members:localMember(stored.book),
        slot:stored.book?1:0,
      });
      setError('');
      const cfg=readSyncConfig();
      syncConfigRef.current=cfg;
      setSyncConfig(cfg);
      setSyncStatus(cfg.enabled?(cfg.token?'ok':'error'):'off');
      if(cfg.enabled&&cfg.token)void pullAndReconcile({quiet:true});
    }catch{
      setPhase('error');
      setError('この端末の保存データを読み込めませんでした。');
    }
  },[accept,pullAndReconcile]);

  useEffect(()=>{void refresh();},[refresh]);

  useEffect(()=>{
    const onFocus=()=>{
      if(document.visibilityState==='visible')void pullAndReconcile({quiet:true});
    };
    const onVis=()=>{
      if(document.visibilityState==='visible')void pullAndReconcile({quiet:true});
    };
    window.addEventListener('focus',onFocus);
    document.addEventListener('visibilitychange',onVis);
    const timer=window.setInterval(()=>{
      if(document.visibilityState==='visible')void pullAndReconcile({quiet:true});
    },PULL_INTERVAL_MS);
    return()=>{
      window.removeEventListener('focus',onFocus);
      document.removeEventListener('visibilitychange',onVis);
      window.clearInterval(timer);
      if(pushTimer.current)clearTimeout(pushTimer.current);
    };
  },[pullAndReconcile]);

  const coalesceKey=(payload:Record<string,unknown>)=>{
    const action=String(payload.action||'');
    if(action==='record'||action==='practice'||action==='agreement')return `${action}:${String(payload.id||'')}`;
    if(action==='profile')return 'profile';
    if(action==='memory'){
      const mem=payload.memory as Memory|undefined;
      return mem?.id?`memory:${mem.id}`:'memory';
    }
    if(action==='event'){
      const ev=payload.event as PairEvent|undefined;
      return ev?.id?`event:${ev.id}`:'event';
    }
    if(action==='deleteEvent')return `deleteEvent:${String(payload.id||'')}`;
    if(action==='futariAnswer')return `futariAnswer:${String(payload.date||'')}:${String(payload.who||'')}`;
    if(action==='futariMeeting')return `futariMeeting:${String(payload.date||'')}`;
    if(action==='futariSettings')return 'futariSettings';
    if(action==='boardNote'){
      const n=payload.note as BoardNote|undefined;
      return n?.id?`boardNote:${n.id}`:'';
    }
    if(action==='deleteBoardNote')return `deleteBoardNote:${String(payload.id||'')}`;
    return '';
  };

  const mutate=useCallback(async(payload:Record<string,unknown>,message='保存しました'):Promise<Snapshot|null>=>{
    if(working.current){
      return new Promise((resolve)=>{
        const key=coalesceKey(payload);
        if(key){
          const idx=pendingQueue.current.findIndex(q=>coalesceKey(q.payload)===key);
          if(idx>=0){
            const prev=pendingQueue.current[idx];
            pendingQueue.current[idx]={payload,message,resolve:(v)=>{prev.resolve(v);resolve(v);}};
            return;
          }
        }
        pendingQueue.current.push({payload,message,resolve});
      });
    }
    working.current=true;setBusy(true);setError('');
    try{
      const action=String(payload.action||'');
      if(['invite','join','gift','revokeInvite'].includes(action)){
        toast.message('この公開版では端末内の保存のみです。二人共有・招待コードはまだ使えません。');
        return null;
      }

      let book=current.current.book?structuredClone(current.current.book):null;
      let revision=current.current.revision;

      const ensureBook=()=>{
        if(!book){
          book=structuredClone(emptyBook);
          revision=0;
        }
      };

      if(action==='create'){
        ensureBook();
      }else if(action==='profile'){
        ensureBook();
        book!.profile=payload.profile as Profile;
      }else if(action==='record'){
        ensureBook();
        const id=String(payload.id);
        const record=payload.record as TaskRecord;
        book!.records[id]={...record,updatedAt:new Date().toISOString()};
      }else if(action==='memory'){
        ensureBook();
        const memory=payload.memory as Memory;
        const idx=book!.memories.findIndex(m=>m.id===memory.id);
        if(idx>=0)book!.memories[idx]=memory;else book!.memories.unshift(memory);
      }else if(action==='deleteMemory'){
        ensureBook();
        const id=String(payload.id);
        book!.memories=book!.memories.filter(m=>m.id!==id);
      }else if(action==='practice'){
        ensureBook();
        book!.practices[String(payload.id)]=payload.record as PracticeRecord;
      }else if(action==='agreement'){
        ensureBook();
        book!.agreements[String(payload.id)]=payload.record as AgreementRecord;
      }else if(action==='event'){
        ensureBook();
        if(!book!.events)book!.events=[];
        const event=payload.event as PairEvent;
        const withStamp={...event,updatedAt:event.updatedAt||new Date().toISOString()};
        const idx=book!.events.findIndex(e=>e.id===withStamp.id);
        if(idx>=0)book!.events[idx]=withStamp;else book!.events.unshift(withStamp);
      }else if(action==='deleteEvent'){
        ensureBook();
        if(!book!.events)book!.events=[];
        const id=String(payload.id);
        book!.events=book!.events.filter(e=>e.id!==id);
      }else if(action==='futariAnswer'){
        ensureBook();
        if(!book!.futari)book!.futari=structuredClone(emptyFutari);
        const date=String(payload.date);
        const who=payload.who==='n2'?'n2':'n1';
        const f=book!.futari;
        const day=f.days[date]||{cardId:String(payload.cardId),mode:(payload.mode as FutariMode)||'answer',n1:null,n2:null};
        const prev:FutariAnswer=day[who]||{text:'',guess:'',changed:'',result:'',at:''};
        day[who]={...prev,...(payload.answer as Partial<FutariAnswer>),at:new Date().toISOString()};
        f.days[date]=day;
        if(!f.startedAt||date<f.startedAt)f.startedAt=date;
      }else if(action==='futariMeeting'){
        ensureBook();
        if(!book!.futari)book!.futari=structuredClone(emptyFutari);
        book!.futari.meetings[String(payload.date)]={note:String(payload.note||''),at:new Date().toISOString()};
      }else if(action==='futariSettings'){
        ensureBook();
        if(!book!.futari)book!.futari=structuredClone(emptyFutari);
        book!.futari={...book!.futari,...(payload.patch as object),settingsAt:new Date().toISOString()};
      }else if(action==='boardNote'){
        ensureBook();
        if(!book!.board)book!.board=structuredClone(emptyBoard);
        const note=payload.note as BoardNote;
        const now=new Date().toISOString();
        const b=book!.board;
        const idx=b.notes.findIndex(n=>n.id===note.id);
        const next={...note,updatedAt:now};
        if(idx>=0)b.notes[idx]=next;else b.notes.unshift(next);
        b.notes=b.notes.slice(0,300);
      }else if(action==='deleteBoardNote'){
        ensureBook();
        if(!book!.board)book!.board=structuredClone(emptyBoard);
        const id=String(payload.id);
        const b=book!.board;
        b.notes=b.notes.filter(n=>n.id!==id);
        b.deleted=pruneDeleted({...b.deleted,[id]:new Date().toISOString()});
      }else if(action==='import'){
        book=structuredClone(payload.book as Book);
        revision=0;
      }else if(action==='resetRecords'){
        ensureBook();
        // Clear stamp statuses / amounts / notes on task records only. Profile & memories stay.
        book!.records={};
      }else{
        throw new Error('未対応の操作です。');
      }

      book=validateCatalogBook(bookSchema.parse(book));
      revision+=1;
      const at=writeStored(book,revision);
      savedAtRef.current=at;
      localDirtyRef.current=true;
      const next:Snapshot={book,revision,members:localMember(book),slot:1};
      accept(next);
      setSavedAt(at);
      if(message)toast.success(message);
      schedulePush();
      return next;
    }catch(e){
      const msg=e instanceof Error?e.message:'保存できませんでした。';
      setError(msg);
      toast.error(msg,{duration:8000});
      return null;
    }finally{
      working.current=false;setBusy(false);
      const nextQ=pendingQueue.current.shift();
      if(nextQ){
        void mutate(nextQ.payload,nextQ.message).then(nextQ.resolve);
      }
    }
  },[accept,schedulePush]);

  const saveSyncSettings=useCallback((partial:Partial<GistSyncConfig>)=>{
    const before=syncConfigRef.current;
    const next=saveCfg(partial);
    // キーを変えたら、次に読めたときは「合流」（どちらの書き込みも消さない）。
    if(before.token&&next.token!==before.token)joinNextRef.current=true;
    if(next.gistId!==before.gistId)joinNextRef.current=true;
    if(!next.enabled){
      setSyncStatus('off');
      return next;
    }
    if(!next.token){
      setSyncStatus('error');
      return next;
    }
    setSyncStatus('ok');
    void pullAndReconcile({quiet:true});
    return next;
  },[pullAndReconcile,saveCfg]);

  /** 「今すぐ同期」：同期先がなければ探す・作る（古い同期先があれば移す）。 */
  const syncNow=useCallback(async()=>runSync('manual'),[runSync]);
  /** 互換のため残す（「今すぐ同期」と同じ。もう新しい同期先を別に作ることはしない）。 */
  const createGistNow=syncNow;

  /** キーが合わず読めないとき：この端末の内容で同期先を上書きする（相手の端末は、新しいキーを入れたときに合流する）。 */
  const overwriteRemote=useCallback(async()=>{
    const cfg=syncConfigRef.current;
    if(!cfg.token||!cfg.gistId)throw new Error('同期先がまだありません。');
    if(!current.current.book)throw new Error('まだ手帳がありません。');
    await pushNow(cfg);
    joinNextRef.current=false;
    setSyncProblem('');
    setSyncStatus('ok');
    setLastSyncAt(new Date().toISOString());
    return 'この端末の内容を、いまのキーで暗号化して送りました';
  },[pushNow]);

  /** 移行の最後：古い（暗号化されていない）同期先を削除する。直前にもう一度取り込んでから消す。 */
  const deleteLegacy=useCallback(async()=>{
    const cfg=syncConfigRef.current;
    if(!cfg.legacyGistId)return '古い同期先はもうありません';
    if(!cfg.gistId)throw new Error('先に「今すぐ同期」で暗号化した同期先に移してください。');
    await runSync('manual');
    const live=syncConfigRef.current;
    if(syncProblemRef.current)throw new Error('同期がうまくいっていないため、削除しませんでした。');
    await deleteLegacyGist(live);
    saveCfg({legacyGistId:'',legacySeen:''});
    forgetLegacyConfig();
    return '古い同期先を削除しました';
  },[runSync,saveCfg]);

  const testSync=useCallback(async()=>{
    const cfg=syncConfigRef.current;
    setSyncStatus(cfg.enabled?'syncing':syncStatus==='off'?'off':'syncing');
    try{
      const msg=await testGistConnection(cfg);
      if(cfg.enabled&&cfg.token)setSyncStatus('ok');
      else if(cfg.enabled)setSyncStatus('error');
      setSyncProblem('');
      return msg;
    }catch(e){
      if(cfg.enabled)setSyncStatus('error');
      if(e instanceof KeyMismatchError){setSyncProblem('key');throw new Error(KEY_MISMATCH_JA);}
      throw e;
    }
  },[syncStatus]);

  return {
    ...snapshot,
    phase,
    busy,
    error,
    savedAt,
    refresh,
    mutate,
    syncStatus,
    syncProblem,
    syncDevices:devices,
    lastSyncAt,
    syncConfig,
    saveSyncSettings,
    createGistNow,
    syncNow,
    testSync,
    overwriteRemote,
    deleteLegacy,
  };
}
