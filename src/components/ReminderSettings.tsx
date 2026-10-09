import {Bell,CalendarDays,HeartHandshake} from 'lucide-react';
import {Switch} from './ui/switch';
import {Checkbox} from './ui/checkbox';
import {MEETING_WEEKS,REMIND_SLOTS,type Reminders} from '../lib/model';
import {SLOT_LABEL,WEEK_LABEL,meetingReady,meetingRuleText} from '../lib/reminders';
import {monthDay} from '../lib/dates';
import type {ReminderSync} from '../lib/line-notify';
import type {LineState} from '../lib/use-line-notify';

const WD=['月','火','水','木','金','土','日'] as const;
const WD_NUM:Record<(typeof WD)[number],number>={日:0,月:1,火:2,水:3,木:4,金:5,土:6};
export type ReminderSave=(patch:Partial<Omit<Reminders,'kinds'|'meeting'>>&{kinds?:Partial<Reminders['kinds']>,meeting?:Partial<Reminders['meeting']>},message:string)=>Promise<boolean>;

function Pill({on,children,onClick,disabled,label}:{on:boolean,children:React.ReactNode,onClick:()=>void,disabled?:boolean,label?:string}){
  return <button type="button" className={`remind-pill${on?' on':''}`} aria-pressed={on} disabled={disabled} onClick={onClick} aria-label={label}>{children}</button>;
}

function LinePreview({head,text}:{head:string,text:string}){
  return <div className="remind-line" aria-label={head}>
    <p className="remind-line-head">{head}</p>
    <div className="remind-line-msg"><img className="remind-line-ava" src={`${import.meta.env.BASE_URL}amity-shark.png`} alt="" aria-hidden/><div><p className="remind-line-name">Amityちゃん</p><div className="remind-line-bubble">{text}</div></div></div>
  </div>;
}

function syncLine(lineState:LineState,sync:ReminderSync,active:boolean){
  if(!active)return null;
  if(lineState!=='on')return <p className="hint warn remind-sync">LINE通知がオンで、この端末から送れる状態のときに、中継先へお知らせの予定を渡します。</p>;
  if(sync.state==='idle'||!sync.text)return null;
  return <p className={`hint remind-sync${sync.state==='ok'?'':' warn'}`} role="status">{sync.state==='sending'?'中継先にお知らせの予定を渡しています…':sync.text}</p>;
}

/** 設定「通知（LINE）」の中：期限と記念日の LINE お知らせ（F1）。 */
export function RemindersCard({value,busy,save,lineState,sync,preview}:{value:Reminders,busy?:boolean,save:ReminderSave,lineState:LineState,sync:ReminderSync,preview:{date:string,text:string}|null}){
  const r=value;
  const kinds:{k:keyof Reminders['kinds'],label:string}[]=[
    {k:'rule',label:'制度の締切（カレンダーの点）'},
    {k:'task',label:'項目の予定日（自分たちで入れた日）'},
    {k:'event',label:'カレンダーの予定（一人目・二人目・ふたり）'},
    {k:'anniv',label:'記念日（婚姻日など、プロフィールの日付）'},
  ];
  return <div className="remind-sub" id="settings-reminders">
    <h3><Bell size={17} aria-hidden/>期限と記念日のLINEお知らせ</h3>
    <p>近づいた期限や記念日を、ふたりのLINEに知らせます。お知らせは<b>1日1通まで</b>にまとめます。</p>
    <label className="scope-toggle settings-switch"><Switch checked={r.on} disabled={busy} onCheckedChange={v=>void save({on:v},v?'期限と記念日のお知らせをオンにしました':'期限と記念日のお知らせをオフにしました')}/><span>お知らせを使う（ふたりで共通）</span></label>
    <h4>知らせるもの</h4>
    <div className="remind-checks">
      {kinds.map(({k,label})=><label key={k} className="remind-check"><Checkbox checked={r.kinds[k]} disabled={busy} onCheckedChange={v=>void save({kinds:{[k]:!!v}},'お知らせするものを保存しました')}/>{label}</label>)}
    </div>
    <h4>いつ</h4>
    <div className="remind-pills">
      <Pill on={r.before3} disabled={busy} onClick={()=>void save({before3:!r.before3},'保存しました')}>3日前</Pill>
      <Pill on={r.sameDay} disabled={busy} onClick={()=>void save({sameDay:!r.sameDay},'保存しました')}>当日</Pill>
    </div>
    <h4>送る時間帯</h4>
    <div className="remind-pills">
      {REMIND_SLOTS.map(s=><Pill key={s} on={r.slot===s} disabled={busy} onClick={()=>void save({slot:s},`送る時間帯を「${SLOT_LABEL[s]}」にしました`)}>{SLOT_LABEL[s]}</Pill>)}
    </div>
    <p className="hint">その日の分は1通にまとめ、ない日は送りません。</p>
    {syncLine(lineState,sync,r.on)}
    {r.on&&(preview?<LinePreview head={`LINEでの見え方（次のお知らせ：${monthDay(preview.date)}）`} text={preview.text}/>:<p className="hint">この先35日に、お知らせする日はありません。</p>)}
  </div>;
}

/** 月に一度のふたり会議の日（設定とカレンダーで共通の編集部分）。 */
export function MeetingEditor({value,busy,save}:{value:Reminders,busy?:boolean,save:ReminderSave}){
  const m=value.meeting;
  return <div className="meeting-editor">
    <h4><CalendarDays size={15} aria-hidden/>会議の日<span className="meeting-rule">{meetingRuleText(m)}</span></h4>
    <div className="remind-pills" role="group" aria-label="第何週">
      {MEETING_WEEKS.map(w=><Pill key={w} on={m.week===w} disabled={busy} onClick={()=>void save({meeting:{week:m.week===w?'':w}},'会議の日を保存しました')}>{WEEK_LABEL[w]}</Pill>)}
    </div>
    <div className="remind-pills" role="group" aria-label="曜日">
      {WD.map(d=><Pill key={d} on={m.weekday===WD_NUM[d]} disabled={busy} onClick={()=>void save({meeting:{weekday:m.weekday===WD_NUM[d]?-1:WD_NUM[d]}},'会議の日を保存しました')}>{d}</Pill>)}
    </div>
    <label className="scope-toggle settings-switch"><Switch checked={m.on} disabled={busy||!meetingReady(m)} onCheckedChange={v=>void save({meeting:{on:v}},v?'会議の日のお知らせをオンにしました':'会議の日のお知らせをオフにしました')}/><span>月に一度のお知らせを使う</span></label>
    <h4><Bell size={15} aria-hidden/>お知らせ</h4>
    <div className="remind-pills">
      <Pill on={m.before3} disabled={busy} onClick={()=>void save({meeting:{before3:!m.before3}},'保存しました')}>3日前</Pill>
      <Pill on={m.sameDay} disabled={busy} onClick={()=>void save({meeting:{sameDay:!m.sameDay}},'保存しました')}>当日</Pill>
    </div>
    {!meetingReady(m)&&<p className="hint">第何週と曜日を選ぶと、アプリの予定にくり返し出ます。</p>}
  </div>;
}

/** 設定「通知（LINE）」の中：月に一度のふたり会議（F6）。 */
export function MeetingCard({value,busy,save,lineState,sync}:{value:Reminders,busy?:boolean,save:ReminderSave,lineState:LineState,sync:ReminderSync}){
  return <div className="remind-sub" id="settings-meeting">
    <h3><HeartHandshake size={17} aria-hidden/>月に一度のふたり会議</h3>
    <p>毎月の会議の日をLINEで知らせます。</p>
    <MeetingEditor value={value} busy={busy} save={save}/>
    
    {syncLine(lineState,sync,value.meeting.on&&!value.on)}
  </div>;
}
