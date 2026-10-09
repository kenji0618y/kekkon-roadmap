import {useEffect,useState} from 'react';
import {ExternalLink,Pencil} from 'lucide-react';
import {Label} from './ui/label';
import {Input} from './ui/input';
import {SaveAction} from './book-controls';
import type {GoogleCal} from '../lib/model';
import {CAL_ID_MAX,FAMILY_CAL_ID,GOOGLE_CAL_OPEN_URL,googleEmbedUrl,validCalId} from '../lib/google-cal';

/**
 * カレンダータブの中身は、これだけ（2026-10-09・Kenji が切りかえ・見出し・説明文・チップ・書き出しを消すよう指定）。
 * Google の埋め込みを幅いっぱいに出し、下に小さく「Googleカレンダーで開く」と ID の「直す」だけを置く。
 * アプリのカレンダー（お知らせ・鈴の印・ふたり会議・.ics のもと）は消さずに 設定 →「通知（LINE）」の「アプリの予定」へ移した。
 */
export function GoogleFamilyCalendar({cal,busy,onSaveId}:{cal:GoogleCal,busy?:boolean,onSaveId:(id:string)=>Promise<boolean>}){
  const id=validCalId(cal.id)?cal.id.trim():FAMILY_CAL_ID;
  const isFamily=id===FAMILY_CAL_ID;
  const [editing,setEditing]=useState(false);
  const [draft,setDraft]=useState(id);
  useEffect(()=>{if(!editing)setDraft(id);},[id,editing]);
  const draftOk=validCalId(draft);
  const save=async(next:string)=>{if(await onSaveId(next.trim()))setEditing(false);};
  return <section id="gcal-block" className="gcal-block" aria-label={isFamily?'Googleのファミリー カレンダー':'Googleカレンダー'}>
      <div className="gcal-frame-card">
        <iframe key={id} className="gcal-frame" src={googleEmbedUrl(id)} title={isFamily?'Googleのファミリー カレンダー':'Googleカレンダー'} loading="lazy"/>
      </div>
      <div className="gcal-foot">
        <a className="gcal-open" href={GOOGLE_CAL_OPEN_URL} target="_blank" rel="noopener noreferrer"><ExternalLink size={13} aria-hidden/>Googleカレンダーで開く</a>
        {!editing&&<button type="button" className="gcal-fix" onClick={()=>setEditing(true)} aria-label="GoogleカレンダーのIDを直す"><Pencil size={12} aria-hidden/>直す</button>}
      </div>
      {editing&&<div className="gcal-edit">
        <div className="field"><Label htmlFor="gcal-id">GoogleカレンダーのID</Label>
          <Input id="gcal-id" value={draft} maxLength={CAL_ID_MAX} inputMode="email" autoCapitalize="off" autoCorrect="off" spellCheck={false} onChange={e=>setDraft(e.target.value)} disabled={busy}/></div>
        <p className="hint">パソコンの Googleカレンダーで、設定 → カレンダーの名前 →「カレンダーの統合」にある「カレンダー ID」です。ふたりの端末で同じになります。</p>
        {!draftOk&&draft.trim()!==''&&<p className="gcal-error" role="alert">「…@group.calendar.google.com」のような形のIDを入れてください。</p>}
        <div className="gcal-edit-actions">
          <SaveAction busy={!!busy} disabled={!draftOk||draft.trim()===id} onClick={()=>void save(draft)}>保存する</SaveAction>
          {!isFamily&&<button type="button" className="gcal-link-btn" disabled={busy} onClick={()=>void save(FAMILY_CAL_ID)}>ファミリー カレンダーに戻す</button>}
          <button type="button" className="gcal-link-btn" onClick={()=>{setDraft(id);setEditing(false);}}>やめる</button>
        </div>
      </div>}
    </section>;
}
