import {useCallback,useEffect,useState} from 'react';
import type {Book} from './model';
import type {Who} from './futari';
import {LINE_SECRET_OVERRIDE_KEY,lineMissing,type LineMissing,boardPayload,cleanRelayUrl,postRelay,resolveBoardSecret,statusPayload,type RelayResult} from './line-notify';

/**
 * off       … 「LINE通知を使う」がオフ
 * preparing … オンだが、この端末では送れない（自動同期がオフ＝合言葉を作れない／中継先の URL が無い）
 * on        … 送れる
 */
export type LineState='off'|'preparing'|'on';
export type LineNotify={
  state:LineState,
  /** preparing のわけ */
  missing:LineMissing,
  url:string,
  hasSecret:boolean,
  send:(who:Who,name:string,text:string)=>Promise<RelayResult>,
  status:()=>Promise<RelayResult>,
  copySecret:()=>Promise<boolean>,
  refresh:()=>void,
};

/** LINE 通知の状態と操作。合言葉は state に持たず、使うたびに端末の中で作る。 */
export function useLineNotify(book:Book,sync:{enabled:boolean,token:string}):LineNotify{
  const url=cleanRelayUrl(book.lineNotify?.url);
  const on=!!book.lineNotify?.on;
  const syncOn=!!sync.enabled;
  const token=sync.token;
  const [hasSecret,setHasSecret]=useState(false);
  const [tick,setTick]=useState(0);
  useEffect(()=>{
    let alive=true;
    void resolveBoardSecret({enabled:syncOn,token}).then(s=>{if(alive)setHasSecret(!!s);});
    return()=>{alive=false;};
  },[syncOn,token,tick]);
  useEffect(()=>{
    const h=(e:StorageEvent)=>{if(e.key===LINE_SECRET_OVERRIDE_KEY)setTick(t=>t+1);};
    window.addEventListener('storage',h);
    return()=>window.removeEventListener('storage',h);
  },[]);
  const missing=lineMissing({syncEnabled:syncOn,hasSecret,url});
  const state:LineState=!on?'off':missing?'preparing':'on';
  const send=useCallback(async(who:Who,name:string,text:string):Promise<RelayResult>=>{
    try{
      if(!on||!url)return {ok:false,error:'off'};
      const secret=await resolveBoardSecret({enabled:syncOn,token});
      if(!secret)return {ok:false,error:'no-local-secret'};
      return await postRelay(url,boardPayload(secret,who,name,text));
    }catch{return {ok:false,error:'network'};}
  },[on,url,syncOn,token]);
  const status=useCallback(async():Promise<RelayResult>=>{
    try{
      if(!url)return {ok:false,error:'bad-url'};
      const secret=await resolveBoardSecret({enabled:syncOn,token});
      if(!secret)return {ok:false,error:'no-local-secret'};
      return await postRelay(url,statusPayload(secret));
    }catch{return {ok:false,error:'network'};}
  },[url,syncOn,token]);
  const copySecret=useCallback(async()=>{
    try{
      const secret=await resolveBoardSecret({enabled:syncOn,token});
      if(!secret)return false;
      await navigator.clipboard.writeText(secret);
      return true;
    }catch{return false;}
  },[syncOn,token]);
  return {state,missing,url,hasSecret,send,status,copySecret,refresh:()=>setTick(t=>t+1)};
}
