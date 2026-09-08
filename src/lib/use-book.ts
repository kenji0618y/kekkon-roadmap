import {useCallback,useEffect,useRef,useState} from 'react';
import {toast} from 'sonner';
import {bookSchema,emptyBook,type Book,type Memory,type Profile,type TaskRecord} from './model';
import {validateCatalogBook} from './backup';

const STORAGE_KEY='futari-miraicho-v1';

export type Snapshot={book:Book|null,revision:number,members:{slot:number,display_name:string}[],slot:number};

function readStored():{book:Book|null,revision:number}{
  try{
    const raw=localStorage.getItem(STORAGE_KEY);
    if(!raw)return {book:null,revision:0};
    const data=JSON.parse(raw) as {book?:unknown,revision?:number};
    const parsed=bookSchema.safeParse(data.book);
    if(!parsed.success)return {book:null,revision:0};
    return {book:validateCatalogBook(parsed.data),revision:Number(data.revision)||1};
  }catch{
    return {book:null,revision:0};
  }
}

function writeStored(book:Book,revision:number){
  localStorage.setItem(STORAGE_KEY,JSON.stringify({format:'futari-miraicho',version:1,revision,book,savedAt:new Date().toISOString()}));
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
  const current=useRef(snapshot),working=useRef(false);

  const accept=useCallback((data:Snapshot)=>{
    current.current=data;
    setSnapshot(data);
    setPhase('ready');
  },[]);

  const refresh=useCallback(async(_quiet=false)=>{
    try{
      const stored=readStored();
      accept({
        book:stored.book,
        revision:stored.revision,
        members:localMember(stored.book),
        slot:stored.book?1:0,
      });
      setError('');
    }catch{
      setPhase('error');
      setError('この端末の保存データを読み込めませんでした。');
    }
  },[accept]);

  useEffect(()=>{void refresh();},[refresh]);

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
      writeStored(book,revision);
      const next:Snapshot={book,revision,members:localMember(book),slot:1};
      accept(next);
      setSavedAt(new Date().toISOString());
      if(message)toast.success(message);
      return next;
    }catch(e){
      const msg=e instanceof Error?e.message:'保存できませんでした。';
      setError(msg);
      toast.error(msg,{duration:8000});
      return null;
    }finally{
      working.current=false;setBusy(false);
    }
  },[accept]);

  return {...snapshot,phase,busy,error,savedAt,refresh,mutate};
}
