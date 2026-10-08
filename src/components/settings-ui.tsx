import type {ReactNode} from 'react';

/**
 * 設定タブの見た目をそろえる部品（2026-10-08〜「設定を見やすく」）。
 * カード（見出し＋状態チップ＋一行の説明）・「くわしく」の折りたたみ・技術的なものの折りたたみ。
 * 中身（設定の値・保存先のキー・ふるまい）はそれぞれの部品のまま。
 */
export type ChipTone='on'|'off'|'wait'|'warn';

export function StatusChip({tone,children,onClick,label}:{tone:ChipTone,children:ReactNode,onClick?:()=>void,label?:string}){
  const cls=`settings-chip is-${tone}`;
  return onClick
    ?<button type="button" className={cls} onClick={onClick} aria-label={label}>{children}</button>
    :<span className={cls} aria-label={label}>{children}</span>;
}

export function SettingsCard({id,icon,title,chip,lead,more,children,className=''}:{id?:string,icon:ReactNode,title:string,chip?:ReactNode,lead?:ReactNode,more?:ReactNode,children?:ReactNode,className?:string}){
  return <section id={id} className={`paper-card settings-card settings-sec ${className}`.trim()}>
    <div className="settings-sec-head"><span className="settings-sec-icon" aria-hidden="true">{icon}</span><h2>{title}</h2>{chip}</div>
    {lead&&<p className="settings-lead">{lead}</p>}
    {more&&<More>{more}</More>}
    {children}
  </section>;
}

/** 説明の続き（ふだんは閉じる）。 */
export function More({children,label='くわしく'}:{children:ReactNode,label?:string}){
  return <details className="settings-more"><summary>{label}</summary><div className="settings-more-body">{children}</div></details>;
}

/** あまり使わない・技術的なもの（キー・中継先 URL など）の折りたたみ。 */
export function Fold({id,title,hint,children,defaultOpen=false}:{id?:string,title:string,hint?:string,children:ReactNode,defaultOpen?:boolean}){
  return <details id={id} className="settings-fold" open={defaultOpen||undefined}><summary><span><strong>{title}</strong>{hint&&<small>{hint}</small>}</span></summary><div className="settings-fold-body">{children}</div></details>;
}

/** 設定タブのいちばん上：いまの状態をチップで（押すとそのカードへ）。 */
export function SettingsOverview({sync,line,ai,go}:{sync:{on:boolean,status:string,problem:boolean},line:'on'|'off'|'preparing',ai:{on:boolean,key:boolean},go:(id:string)=>void}){
  const syncTone:ChipTone=!sync.on?'off':sync.problem||sync.status==='error'?'warn':sync.status==='ok'?'on':'wait';
  const syncText=!sync.on?'オフ':sync.problem||sync.status==='error'?'要確認':sync.status==='ok'?'オン':sync.status==='syncing'?'同期中':'オン（未同期）';
  return <div className="settings-overview" role="group" aria-label="いまの状態">
    <StatusChip tone={syncTone} onClick={()=>go('settings-gist-sync')} label={`同期：${syncText}（押すと同期の設定へ）`}>同期：{syncText}</StatusChip>
    <StatusChip tone={line==='on'?'on':line==='off'?'off':'wait'} onClick={()=>go('settings-line-notify')} label="LINE通知の設定へ">LINE：{line==='on'?'オン':line==='off'?'オフ':'準備中'}</StatusChip>
    <StatusChip tone={!ai.on?'off':ai.key?'on':'wait'} onClick={()=>go('settings-ai')} label="AIの設定へ">AI：{!ai.on?'オフ':ai.key?'オン':'キーなし'}</StatusChip>
  </div>;
}
