import {useEffect,useState} from 'react';
import {Cloud,Lock,LockOpen,TriangleAlert} from 'lucide-react';
import {toast} from 'sonner';
import {AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,AlertDialogDescription,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle} from './ui/alert-dialog';
import {Input} from './ui/input';
import {Label} from './ui/label';
import {Switch} from './ui/switch';
import {Checkbox} from './ui/checkbox';
import {Action} from './book-controls';
import {Fold,SettingsCard,StatusChip,type ChipTone} from './settings-ui';
import {NETWORK_ERROR_JA} from '../lib/amity-grok';
import {KEY_MISMATCH_JA,type useBook} from '../lib/use-book';
import type {Profile} from '../lib/model';

type BookData=ReturnType<typeof useBook>;

/**
 * 設定 →「同期（端末どうし）」のカード。キー・同期先の ID は折りたたみの中（キーが無いときだけ最初から開く）。
 * 同期の中身は暗号化（鍵は二人のスマホに入れた同じキーから作る）。同期先の ID はふつうは入れなくてよい（自動で見つける）。
 * 移行中は「古い同期先の片づけ」を出す（二人のスマホが新しい版になったら削除）。
 */
export function SyncSettings({data,profile}:{data:BookData,profile:Profile}){
  const cfg=data.syncConfig;
  const [token,setToken]=useState(cfg.token),[gistId,setGistId]=useState(cfg.gistId),[enabled,setEnabled]=useState(cfg.enabled);
  const [busy,setBusy]=useState(false);
  const [overwriteOpen,setOverwriteOpen]=useState(false);
  const [deleteOpen,setDeleteOpen]=useState(false),[singleAck,setSingleAck]=useState(false);
  useEffect(()=>{setToken(cfg.token);setGistId(cfg.gistId);setEnabled(cfg.enabled);},[cfg.token,cfg.gistId,cfg.enabled]);

  const persist=(o:Partial<{token:string,gistId:string,enabled:boolean}>={})=>data.saveSyncSettings({token:o.token??token,gistId:o.gistId??gistId,enabled:o.enabled??enabled});
  const run=async(fn:()=>Promise<unknown>)=>{
    setBusy(true);
    try{persist();const r=await fn();if(typeof r==='string'&&r)toast.success(r);}
    catch(e){toast.error(e instanceof TypeError?NETWORK_ERROR_JA:e instanceof Error?e.message:'同期に失敗しました',{duration:8000});}
    finally{setBusy(false);}
  };

  const statusLabel=data.syncStatus==='syncing'?'同期中':data.syncStatus==='ok'?'同期OK':data.syncStatus==='error'?'エラー':'オフ';
  const last=data.lastSyncAt?new Date(data.lastSyncAt).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo'}):'—';
  const encrypted=!!cfg.gistId;
  const legacy=!!cfg.legacyGistId;
  const devices=Object.values(data.syncDevices||{});
  const who=(w:string)=>w==='n1'?(profile.name1||'一人目'):w==='n2'?(profile.name2||'二人目'):'どちらか未設定';
  const canDelete=devices.length>=2||singleAck;
  const [keyFoldOpen]=useState(()=>!cfg.token);
  const tone:ChipTone=data.syncStatus==='error'||data.syncProblem?'warn':data.syncStatus==='syncing'?'wait':enabled&&data.syncStatus==='ok'?'on':enabled?'wait':'off';

  return <SettingsCard id="settings-gist-sync" icon={<Cloud size={20}/>} title="同期（端末どうし）" chip={<StatusChip tone={tone}>{enabled?statusLabel:'オフ'}</StatusChip>}
    lead="二人の端末の手帳を、自動で同じにします。"
    more={<><p>二人の端末で同じ手帳を自動でそろえたいときに使います。GitHub のアカウントと、GitHub で発行する「アクセス用のキー（gist の権限つき）」が必要です。使わなくても、上のバックアップのファイルで受け渡しできます。</p>
      <p className="hint">キーはこの端末の中だけに保存されます。二人のスマホに、同じキーを入れてください。</p></>}>

    {data.syncProblem==='key'&&<div className="sync-crypt-warn" role="alert">
      <TriangleAlert size={18}/>
      <div><p>{KEY_MISMATCH_JA}</p>
      <p className="hint">キーを新しく作り直して、前のキーがもう無いときだけ、この端末の内容で同期先を上書きできます。相手のスマホの内容は、新しいキーを入れたときに合わせて取り込まれます。</p>
      <Action secondary disabled={busy} onClick={()=>setOverwriteOpen(true)}>この端末の内容で上書きする</Action></div>
    </div>}
    {data.syncProblem==='auth'&&<div className="sync-crypt-warn" role="alert"><TriangleAlert size={18}/><p>このキーでは GitHub に入れませんでした。キーの期限が切れているかもしれません。GitHub で新しいキーを作り、二人のスマホに同じキーを入れてください。</p></div>}
    {data.syncProblem==='target'&&<div className="sync-crypt-warn" role="status"><TriangleAlert size={18}/><p>同期先がまだありません。「今すぐ同期」を押すと作ります（もう一方のスマホでは、同じキーを入れて「今すぐ同期」を押すだけで見つかります）。</p></div>}

    <label className="scope-toggle settings-switch"><Switch checked={enabled} onCheckedChange={v=>{setEnabled(v);persist({enabled:v});}}/><span>自動同期を使う</span></label>
    <p className="hint settings-status-line">状態：{statusLabel} · 最終同期：{last}</p>
    <div className="stack-actions">
      <Action secondary disabled={busy||!token.trim()} onClick={()=>void run(()=>data.syncNow())}>今すぐ同期</Action>
      <Action secondary disabled={busy||!token.trim()} onClick={()=>void run(()=>data.testSync())}>つながるか試す</Action>
    </div>
    {!token.trim()&&<p className="hint">同期するには、下の「キーと同期先」で GitHub のキーを入れてください。</p>}

    <Fold title="キーと同期先" hint="GitHub のキー・暗号化のようす" defaultOpen={keyFoldOpen}>
      {data.syncProblem!=='key'&&<div className={`sync-crypt-box ${encrypted?'is-on':''}`} id="sync-crypt-status">
        {encrypted?<Lock size={18}/>:<LockOpen size={18}/>}
        <p>{encrypted
          ?'暗号化して同期しています。同期先に置かれるのは暗号文だけで、中身を読めるのは、同じキーを入れた二人のスマホだけです。'
          :legacy&&token
            ?'まだ暗号化する前の同期先を使っています。「今すぐ同期」を押すと、暗号化した新しい同期先に移ります（手帳の内容・掲示板のメモ・ふたりの答えはそのまま引き継ぎます）。'
            :'同期の中身は暗号化されます。中身を読めるのは、同じキーを入れた二人のスマホだけです。'}</p>
      </div>}
      <div className="field" style={{width:'100%',marginBottom:12}}>
        <Label htmlFor="gist-pat">アクセス用のキー（GitHub）</Label>
        <Input id="gist-pat" type="password" autoComplete="off" value={token} onChange={e=>setToken(e.target.value)} onBlur={()=>persist()} placeholder="ghp_… または github_pat_…" maxLength={200}/>
      </div>
      <details className="sync-gist-id-fold">
        <summary>同期先を手で指定する（ふつうは不要）</summary>
        <div className="field" style={{width:'100%',margin:'10px 0 4px'}}>
          <Label htmlFor="gist-id">同期先のID</Label>
          <Input id="gist-id" value={gistId} onChange={e=>setGistId(e.target.value.trim())} onBlur={()=>persist()} placeholder="空のままで、自動で見つけます" maxLength={64} autoComplete="off"/>
          
        </div>
      </details>
    </Fold>

    {legacy&&encrypted&&data.syncProblem!=='key'&&<div className="sync-legacy-box" id="sync-legacy">
      <h4>古い同期先の片づけ</h4>
      <p>以前の同期先は暗号化されておらず、URL を知っている人なら読めてしまいます。<strong>二人のスマホが両方とも新しい版になってから</strong>、下のボタンで削除してください。削除するまでは、古い版のスマホで書いた分も、ここに取り込みます。</p>
      <p className="hint">暗号化に切りかえたスマホ：<strong>{devices.length}台</strong>{devices.length>0&&`（${devices.map(d=>who(d.who)).join('・')}）`}{devices.length<2&&' — 2台になったら削除できます'}</p>
      {devices.length<2&&<label className="sync-legacy-ack"><Checkbox checked={singleAck} onCheckedChange={v=>setSingleAck(v===true)}/><span>このアプリは1台だけで使っている</span></label>}
      <Action secondary disabled={busy||!canDelete} onClick={()=>setDeleteOpen(true)}>古い同期先を削除する</Action>
    </div>}

    <AlertDialog open={overwriteOpen} onOpenChange={setOverwriteOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>この端末の内容で上書きしますか？</AlertDialogTitle><AlertDialogDescription>同期先の中身を、この端末の手帳で置きかえます。相手のスマホに残っている内容は、相手が同じキーを入れたときに合わせて取り込まれます。</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>やめる</AlertDialogCancel><AlertDialogAction onClick={()=>void run(()=>data.overwriteRemote())}>上書きする</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>古い同期先を削除しますか？</AlertDialogTitle><AlertDialogDescription>暗号化されていない古い同期先を、過去の履歴ごと GitHub から消します。元には戻せません。手帳の内容は、暗号化した同期先と、このスマホの中に残ります。</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>やめる</AlertDialogCancel><AlertDialogAction onClick={()=>void run(()=>data.deleteLegacy())}>削除する</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </SettingsCard>;
}
