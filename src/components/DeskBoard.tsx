import {useEffect,useMemo,useRef,useState} from 'react';
import {Pencil,Pin,PinOff,Trash2} from 'lucide-react';
import {AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,AlertDialogDescription,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle} from './ui/alert-dialog';
import {BOARD_TEXT_MAX,pairEventWhoLabels,type Book,type BoardNote} from '../lib/model';
import {boardTime,markSeen,newNoteId,readSeen,sortBoard,unreadNotes} from '../lib/board';
import {onMeChange,readMe,writeMe,type Who} from '../lib/futari';
import type {SyncStatus} from '../lib/gist-sync';

/** デスクで最初に見せる件数。残りは「すべて見る」で開く。 */
const PREVIEW=3;
/** 画面に見えてからこの時間たったら、見えている相手のメモを「見た」にする。 */
const SEEN_AFTER_MS=2000;

export type BoardSave={
  put:(note:BoardNote,message:string)=>Promise<boolean>,
  remove:(id:string)=>Promise<boolean>,
};

/**
 * デスクの「ふたりの掲示板」。ふたりが書いたメモを、相手の端末でも見られるようにする。
 * メモは手帳（book.board）に入るので、保存と同期は手帳と同じ（自動同期がオンなら相手の端末へ届く）。
 * 書いた人は「この端末はどちら？」（ふたりタブと共通）で決める。
 */
export function DeskBoard({book,busy,syncStatus,save,onOpenSync}:{book:Book,busy:boolean,syncStatus:SyncStatus,save:BoardSave,onOpenSync:()=>void}){
  const w=pairEventWhoLabels(book.profile);
  const names:Record<Who,string>={n1:w.male,n2:w.female};
  const [me,setMe]=useState<Who|''>(()=>readMe());
  useEffect(()=>onMeChange(setMe),[]);
  const [draft,setDraft]=useState('');
  const [expanded,setExpanded]=useState(false);
  const [editId,setEditId]=useState('');
  const [editText,setEditText]=useState('');
  const [confirmId,setConfirmId]=useState('');
  const notes=useMemo(()=>sortBoard(book.board?.notes||[]),[book.board]);
  const shown=expanded?notes:notes.slice(0,PREVIEW);
  const now=new Date();
  // 新着（この端末でまだ見ていない相手のメモ）。見たあとも、この画面を開いているあいだはバッジを残す。
  const [seen,setSeen]=useState<Set<string>>(()=>readSeen());
  const [justRead,setJustRead]=useState<Set<string>>(()=>new Set());
  const unread=unreadNotes(notes,me,seen);
  const unreadIds=new Set(unread.map(n=>n.id));
  const isNew=(n:BoardNote)=>unreadIds.has(n.id)||justRead.has(n.id);
  const rootRef=useRef<HTMLElement>(null);
  const [inView,setInView]=useState(false);
  useEffect(()=>{
    const el=rootRef.current;
    if(!el||typeof IntersectionObserver==='undefined')return;
    const io=new IntersectionObserver(([e])=>setInView(e.isIntersecting),{threshold:0.3});
    io.observe(el);
    return()=>io.disconnect();
  },[]);
  const shownUnreadKey=shown.filter(n=>unreadIds.has(n.id)).map(n=>n.id).join(',');
  useEffect(()=>{
    if(!inView||!shownUnreadKey)return;
    const t=window.setTimeout(()=>{
      if(document.visibilityState!=='visible')return;
      const ids=shownUnreadKey.split(',');
      markSeen(ids);
      setJustRead(prev=>new Set([...prev,...ids]));
      setSeen(readSeen());
    },SEEN_AFTER_MS);
    return()=>window.clearTimeout(t);
  },[inView,shownUnreadKey]);

  const add=async()=>{
    const text=draft.trim();
    if(!text||!me)return;
    const at=new Date().toISOString();
    if(await save.put({id:newNoteId(),who:me,text:text.slice(0,BOARD_TEXT_MAX),pinned:false,at,updatedAt:at,editedAt:''},'掲示板に書きました'))setDraft('');
  };
  const saveEdit=async(n:BoardNote)=>{
    const text=editText.trim();
    if(!text)return;
    if(text===n.text){setEditId('');return;}
    if(await save.put({...n,text:text.slice(0,BOARD_TEXT_MAX),editedAt:new Date().toISOString()},'メモを直しました'))setEditId('');
  };
  const togglePin=(n:BoardNote)=>void save.put({...n,pinned:!n.pinned},n.pinned?'ピンを外しました':'上にとめました');
  const target=notes.find(n=>n.id===confirmId);

  return <section id="desk-board" ref={rootRef} className="seed-block desk-board" aria-label="ふたりの掲示板">
    <div className="seed-block-head desk-board-head">
      <h3>ふたりの掲示板{unread.length>0&&<span className="desk-board-unread" aria-label={`新着 ${unread.length}件`}><i aria-hidden/>新着 {unread.length}</span>}</h3>
      <p className="hint">買い物・連絡・ひとこと。書いたメモは相手の画面にも出ます。</p>
    </div>

    {!me?(
      <div className="desk-board-who">
        <p>この端末で書くのはどちら？</p>
        <div className="desk-board-who-btns">{(['n1','n2'] as Who[]).map(v=><button key={v} type="button" className="quiet-button" onClick={()=>writeMe(v)}>{names[v]}</button>)}</div>
        <small>ふたりタブの「今日の一問」と同じ設定です。あとから切り替えられます。</small>
      </div>
    ):(
      <form className="desk-board-compose" onSubmit={e=>{e.preventDefault();void add();}}>
        <textarea value={draft} onChange={e=>setDraft(e.target.value.slice(0,BOARD_TEXT_MAX))} rows={2} maxLength={BOARD_TEXT_MAX} placeholder={`${names[me]}さんから、ひとこと`} aria-label="掲示板に書くメモ"/>
        <div className="desk-board-compose-row">
          <small>{names[me]}として書きます · <button type="button" className="desk-board-link" onClick={()=>writeMe(me==='n1'?'n2':'n1')}>{names[me==='n1'?'n2':'n1']}に切り替え</button></small>
          <button type="submit" className="desk-board-send" disabled={busy||!draft.trim()}>書く</button>
        </div>
      </form>
    )}

    {notes.length===0?(
      <p className="hint desk-board-empty">まだメモはありません。</p>
    ):(
      <ul className="desk-board-list">
        {shown.map(n=>{
          const mine=!!me&&n.who===me;
          const editing=editId===n.id;
          return <li key={n.id} className={`desk-board-note ${n.who}${n.pinned?' pinned':''}${isNew(n)?' is-new':''}`}>
            <span className={`desk-board-av ${n.who}`} aria-hidden>{[...names[n.who]][0]||'・'}</span>
            <div className="desk-board-body">
              <div className="desk-board-meta">
                <strong>{names[n.who]}</strong>
                {isNew(n)&&<span className="desk-board-new">新着</span>}
                <time dateTime={n.at}>{boardTime(n.at,now)}</time>
                {n.editedAt&&<span>（直しました）</span>}
                {n.pinned&&<span className="desk-board-pin-tag"><Pin size={11} aria-hidden/>とめてあります</span>}
              </div>
              {editing?(
                <div className="desk-board-edit">
                  <textarea value={editText} onChange={e=>setEditText(e.target.value.slice(0,BOARD_TEXT_MAX))} rows={3} maxLength={BOARD_TEXT_MAX} aria-label="メモを直す" autoFocus/>
                  <div className="desk-board-edit-row">
                    <button type="button" className="desk-board-link" onClick={()=>setEditId('')}>やめる</button>
                    <button type="button" className="desk-board-send" disabled={busy||!editText.trim()} onClick={()=>void saveEdit(n)}>保存</button>
                  </div>
                </div>
              ):<p className="desk-board-text">{n.text}</p>}
              {!editing&&<div className="desk-board-actions">
                <button type="button" onClick={()=>togglePin(n)} disabled={busy} aria-label={n.pinned?'ピンを外す':'上にとめる'}>{n.pinned?<PinOff size={14}/>:<Pin size={14}/>}<span>{n.pinned?'外す':'とめる'}</span></button>
                {mine&&<button type="button" onClick={()=>{setEditId(n.id);setEditText(n.text);}} disabled={busy} aria-label="メモを直す"><Pencil size={14}/><span>直す</span></button>}
                {mine&&<button type="button" className="danger" onClick={()=>setConfirmId(n.id)} disabled={busy} aria-label="メモを消す"><Trash2 size={14}/><span>消す</span></button>}
              </div>}
            </div>
          </li>;
        })}
      </ul>
    )}
    {notes.length>PREVIEW&&<button type="button" className="desk-board-more" onClick={()=>setExpanded(v=>!v)} aria-expanded={expanded}>{expanded?'たたむ':`すべて見る（${notes.length}件）`}</button>}

    {syncStatus==='off'&&<p className="desk-board-sync">いまはこの端末だけに残ります。相手のスマホにも出すには <button type="button" className="desk-board-link" onClick={onOpenSync}>端末どうしの自動同期</button> をオンにしてください。</p>}
    {syncStatus==='error'&&<p className="desk-board-sync warn">相手の端末とそろえられていません。電波か <button type="button" className="desk-board-link" onClick={onOpenSync}>自動同期の設定</button> を確かめてください。</p>}

    <AlertDialog open={!!confirmId} onOpenChange={open=>{if(!open&&!busy)setConfirmId('');}}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>このメモを消しますか？</AlertDialogTitle>
          <AlertDialogDescription>{target?`「${target.text.length>40?target.text.slice(0,40)+'…':target.text}」を消します。相手の画面からも消えます。`:'メモを消します。'}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>やめる</AlertDialogCancel>
          <AlertDialogAction disabled={busy} onClick={e=>{e.preventDefault();void (async()=>{if(await save.remove(confirmId))setConfirmId('');})();}}>消す</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </section>;
}
