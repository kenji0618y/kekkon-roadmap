import {useEffect,useState,type ReactNode} from 'react';
import {CalendarDays,ExternalLink,Pencil} from 'lucide-react';
import {Label} from './ui/label';
import {Input} from './ui/input';
import {SaveAction} from './book-controls';
import type {GoogleCal} from '../lib/model';
import {CAL_ID_MAX,FAMILY_CAL_ID,GOOGLE_CAL_OPEN_URL,googleEmbedUrl,validCalId,type CalView} from '../lib/google-cal';

/**
 * カレンダータブのいちばん上。「Google（ファミリー）」と「アプリの予定」を切りかえる（はじめは Google）。
 * アプリの予定（app）はいままでのカレンダーそのもの。お知らせ・鈴の印・ふたり会議・.ics はそちらから作るので、消さない。
 * 埋め込みの中身は Google が出す。ファミリー カレンダーは共有した人にしか見えないので、見られないときは「Googleカレンダーで開く」。
 */
export function GoogleFamilyCalendar({view,onView,cal,busy,onSaveId,app}:{view:CalView,onView:(v:CalView)=>void,cal:GoogleCal,busy?:boolean,onSaveId:(id:string)=>Promise<boolean>,app:ReactNode}){
  const id=validCalId(cal.id)?cal.id.trim():FAMILY_CAL_ID;
  const isFamily=id===FAMILY_CAL_ID;
  const [editing,setEditing]=useState(false);
  const [draft,setDraft]=useState(id);
  useEffect(()=>{if(!editing)setDraft(id);},[id,editing]);
  const draftOk=validCalId(draft);
  const save=async(next:string)=>{if(await onSaveId(next.trim()))setEditing(false);};
  return <>
    <div className="calview-switch" role="radiogroup" aria-label="カレンダーの表示">
      <button type="button" role="radio" aria-checked={view==='google'} className={view==='google'?'is-on':''} onClick={()=>onView('google')}>Google（ファミリー）</button>
      <button type="button" role="radio" aria-checked={view==='app'} className={view==='app'?'is-on':''} onClick={()=>onView('app')}>アプリの予定</button>
    </div>
    {view==='app'?app:<section id="deadline-block-calendar" className="deadline-block gcal-block" aria-label="Googleカレンダー">
      <div className="gcal-head">
        <h2 className="deadline-block-label"><CalendarDays size={17} aria-hidden/>Googleカレンダー<small>{isFamily?'ファミリー カレンダー':'設定したカレンダー'}</small></h2>
        {!editing&&<button type="button" className="gcal-fix" onClick={()=>setEditing(true)}><Pencil size={13} aria-hidden/>直す</button>}
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
      <div className="gcal-frame-card">
        <iframe key={id} className="gcal-frame" src={googleEmbedUrl(id)} title={isFamily?'Googleのファミリー カレンダー':'Googleカレンダー'} loading="lazy"/>
      </div>
      <a className="gcal-open" href={GOOGLE_CAL_OPEN_URL} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} aria-hidden/>Googleカレンダーで開く</a>
      <div className="gcal-note">
        <p>{isFamily?'ファミリー カレンダーは、ファミリーに入っている人だけが見られるカレンダーです。':'このカレンダーは、共有されている人だけが見られます。'}予定が出るのは、このブラウザで{isFamily?'ファミリーに入っている':'共有されている'} Google アカウントにログインしているときだけです。</p>
        <p>iPhone の Safari や、ホーム画面に追加したアプリから開くと、ほかのサイトの Cookie を止めるしくみのため、ログインの画面や空のカレンダーが出ることがあります。「Cookie を許可してください」と出たら、押すと見られることがあります。それでも見られないときは「Googleカレンダーで開く」を使ってください。</p>
        <p>期限のお知らせ・ふたり会議・カレンダーへの書き出しは、「アプリの予定」のほうから作っています。</p>
      </div>
    </section>}
  </>;
}
