import {useCallback,useEffect,useRef,useState} from 'react';
import {toast} from 'sonner';
import {bookSchema,emptyBook,type Book,type Memory,type Profile,type TaskRecord} from './model';
import {validateCatalogBook} from './backup';
import {
  buildPayload,
  compareRemote,
  createSecretGist,
  pullFromGist,
  pushToGist,
  readSyncConfig,
  testGistConnection,
  writeSyncConfig,
  type GistSyncConfig,
  type SyncStatus,
} from './gist-sync';

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
  const [phase,setPhase]=useState<'loading'|'ready'|'error'|'signin'>('loading');
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[savedAt,setSavedAt]=useState('');
  const [syncStatus,setSyncStatus]=useState<SyncStatus>(()=>readSyncConfig().enabled?'ok':'off');
  const [lastSyncAt,setLastSyncAt]=useState('');
  const [syncConfig,setSyncConfig]=useState<GistSyncConfig>(()=>readSyncConfig());
  const current=useRef(snapshot),working=useRef(false);
  const savedAtRef=useRef('');
  const pushTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const syncingRef=useRef(false);
  const localDirtyRef=useRef(false);
  const syncConfigRef=useRef(syncConfig);
  syncConfigRef.current=syncConfig;

  const accept=useCallback((data:Snapshot)=>{
    current.current=data;
    setSnapshot(data);
    setPhase('ready');
  },[]);

  const schedulePush=useCallback(()=>{
    const cfg=syncConfigRef.current;
    if(!cfg.enabled||!cfg.token||!cfg.gistId)return;
    if(pushTimer.current)clearTimeout(pushTimer.current);
    pushTimer.current=setTimeout(()=>{
      pushTimer.current=null;
      void (async()=>{
        const latest=syncConfigRef.current;
        if(!latest.enabled||!latest.token||!latest.gistId)return;
        const snap=current.current;
        if(!snap.book)return;
        if(syncingRef.current){
          localDirtyRef.current=true;
          return;
        }
        syncingRef.current=true;
        setSyncStatus('syncing');
        try{
          const payload=buildPayload(snap.book,snap.revision,savedAtRef.current||undefined);
          await pushToGist(latest,payload);
          localDirtyRef.current=false;
          const at=new Date().toISOString();
          setLastSyncAt(at);
          setSyncStatus('ok');
        }catch{
          setSyncStatus('error');
        }finally{
          syncingRef.current=false;
        }
      })();
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

  const pullAndReconcile=useCallback(async(opts?:{quiet?:boolean})=>{
    const cfg=syncConfigRef.current;
    if(!cfg.enabled||!cfg.token||!cfg.gistId)return;
    if(syncingRef.current)return;
    syncingRef.current=true;
    setSyncStatus('syncing');
    try{
      const remote=await pullFromGist(cfg);
      if(!remote){
        setSyncStatus('ok');
        return;
      }
      const local={revision:current.current.revision,savedAt:savedAtRef.current};
      const verdict=compareRemote(local,remote);
      // Concurrent conflict: prefer higher revision; if equal, prefer higher savedAt (see compareRemote).
      if(verdict==='remote'){
        applyRemote(remote);
        if(!opts?.quiet)toast.message('他の端末の更新を取り込みました');
      }else if(verdict==='local'&&(localDirtyRef.current||current.current.revision>remote.revision)){
        if(current.current.book){
          const payload=buildPayload(current.current.book,current.current.revision,savedAtRef.current||undefined);
          await pushToGist(cfg,payload);
          localDirtyRef.current=false;
        }
      }
      const at=new Date().toISOString();
      setLastSyncAt(at);
      setSyncStatus('ok');
    }catch{
      setSyncStatus('error');
    }finally{
      syncingRef.current=false;
    }
  },[applyRemote]);

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
      setSyncConfig(cfg);
      setSyncStatus(cfg.enabled?(cfg.token&&cfg.gistId?'ok':'error'):'off');
      if(cfg.enabled&&cfg.token&&cfg.gistId)void pullAndReconcile({quiet:true});
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

  const mutate=useCallback(async(payload:Record<string,unknown>,message='保存しました')=>{
    if(working.current)return null;
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
      }else if(action==='import'){
        book=structuredClone(payload.book as Book);
        revision=0;
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
    }
  },[accept,schedulePush]);

  const saveSyncSettings=useCallback((partial:Partial<GistSyncConfig>)=>{
    const next=writeSyncConfig({...syncConfigRef.current,...partial});
    setSyncConfig(next);
    syncConfigRef.current=next;
    if(!next.enabled){
      setSyncStatus('off');
      return next;
    }
    if(!next.token||!next.gistId){
      setSyncStatus('error');
      return next;
    }
    setSyncStatus('ok');
    void pullAndReconcile({quiet:true});
    return next;
  },[pullAndReconcile]);

  const createGistNow=useCallback(async()=>{
    const cfg=syncConfigRef.current;
    if(!cfg.token)throw new Error('GitHub PATを入力してください。');
    const snap=current.current;
    const book=snap.book||structuredClone(emptyBook);
    const revision=snap.book?snap.revision:0;
    const payload=buildPayload(book,revision,savedAtRef.current||undefined);
    setSyncStatus('syncing');
    try{
      const id=await createSecretGist(cfg.token,payload);
      const next=writeSyncConfig({...cfg,gistId:id,enabled:true});
      setSyncConfig(next);
      syncConfigRef.current=next;
      localDirtyRef.current=false;
      const at=new Date().toISOString();
      setLastSyncAt(at);
      setSyncStatus('ok');
      return id;
    }catch(e){
      setSyncStatus('error');
      throw e;
    }
  },[]);

  const syncNow=useCallback(async()=>{
    const cfg=syncConfigRef.current;
    if(!cfg.token)throw new Error('GitHub PATを入力してください。');
    if(!cfg.gistId)throw new Error('Gist IDが未設定です。');
    if(syncingRef.current)return;
    syncingRef.current=true;
    setSyncStatus('syncing');
    try{
      const remote=await pullFromGist(cfg);
      if(remote){
        const local={revision:current.current.revision,savedAt:savedAtRef.current};
        const verdict=compareRemote(local,remote);
        if(verdict==='remote'){
          applyRemote(remote);
          toast.success('リモートの内容を取り込みました');
        }else if(verdict==='local'||localDirtyRef.current){
          if(!current.current.book)throw new Error('まだ手帳がありません。');
          const payload=buildPayload(current.current.book,current.current.revision,savedAtRef.current||undefined);
          await pushToGist(cfg,payload);
          localDirtyRef.current=false;
          toast.success('この端末の内容をGistへ送りました');
        }else{
          toast.message('すでに最新です');
        }
      }else if(current.current.book){
        const payload=buildPayload(current.current.book,current.current.revision,savedAtRef.current||undefined);
        await pushToGist(cfg,payload);
        localDirtyRef.current=false;
        toast.success('この端末の内容をGistへ送りました');
      }
      const at=new Date().toISOString();
      setLastSyncAt(at);
      setSyncStatus('ok');
      if(!cfg.enabled){
        const next=writeSyncConfig({...cfg,enabled:true});
        setSyncConfig(next);
        syncConfigRef.current=next;
      }
    }catch(e){
      setSyncStatus('error');
      throw e;
    }finally{
      syncingRef.current=false;
    }
  },[applyRemote]);

  const testSync=useCallback(async()=>{
    const cfg=syncConfigRef.current;
    setSyncStatus(cfg.enabled?'syncing':syncStatus==='off'?'off':'syncing');
    try{
      const msg=await testGistConnection(cfg);
      if(cfg.enabled&&cfg.token&&cfg.gistId)setSyncStatus('ok');
      else if(cfg.enabled)setSyncStatus('error');
      return msg;
    }catch(e){
      if(cfg.enabled)setSyncStatus('error');
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
    lastSyncAt,
    syncConfig,
    saveSyncSettings,
    createGistNow,
    syncNow,
    testSync,
  };
}
