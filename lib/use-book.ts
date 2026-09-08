'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {toast} from 'sonner';
import type {Book} from './model';
export type Snapshot={book:Book|null,revision:number,members:{slot:number,display_name:string}[],slot:number};
export function useBook(paused:boolean){
 const [snapshot,setSnapshot]=useState<Snapshot>({book:null,revision:0,members:[],slot:0});
 const [phase,setPhase]=useState<'loading'|'ready'|'error'|'signin'>('loading');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[savedAt,setSavedAt]=useState('');
 const current=useRef(snapshot),working=useRef(false),pause=useRef(paused);
 useEffect(()=>{pause.current=paused;},[paused]);
 const accept=useCallback((data:Snapshot)=>{if(data.book!==undefined){current.current=data;setSnapshot(data);setPhase('ready');}},[]);
 const refresh=useCallback(async(quiet=false)=>{try{const res=await fetch('/api/notebook',{cache:'no-store',signal:AbortSignal.timeout(15000)});const data=await res.json();if(!res.ok){if(!quiet){setPhase(data.signin?'signin':'error');setError(data.error||'読み込めませんでした。');}return;}if(working.current||quiet&&pause.current)return;if(data.revision>=current.current.revision||!current.current.book){accept(data);if(!quiet)setError('');}}catch{if(!quiet){setPhase('error');setError('接続を確認して、もう一度読み込んでください。');}}},[accept]);
 useEffect(()=>{const initial=window.setTimeout(()=>void refresh(),0);const id=setInterval(()=>{if(document.visibilityState==='visible'&&!pause.current&&!working.current)void refresh(true);},30000);return()=>{clearTimeout(initial);clearInterval(id);};},[refresh]);
 const mutate=useCallback(async(payload:Record<string,unknown>,message='保存しました')=>{
  if(working.current)return null;working.current=true;setBusy(true);setError('');
  const post=async(body:Record<string,unknown>)=>{const res=await fetch('/api/notebook',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});const data=await res.json();if(!res.ok){if(data.conflict)accept(data);if(data.signin)setPhase('signin');throw new Error(data.error||'保存できませんでした。');}return data;};
  try{
   if(['profile','record','memory','import'].includes(String(payload.action))&&!current.current.book)accept(await post({action:'create'}));
   const data=await post({...payload,revision:current.current.revision});
   if(data.book!==undefined)accept(data);setSavedAt(new Date().toISOString());if(message)toast.success(message);return data;
  }catch(e){const message=e instanceof Error?e.message:'保存できませんでした。';setError(message);toast.error(message,{duration:8000});return null;}finally{working.current=false;setBusy(false);}
 },[accept]);
 return {...snapshot,phase,busy,error,savedAt,refresh,mutate};
}
