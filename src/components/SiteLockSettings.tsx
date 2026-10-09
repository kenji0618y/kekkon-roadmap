import {useEffect,useState} from 'react';
import {KeyRound} from 'lucide-react';
import {toast} from 'sonner';
import {Action} from './book-controls';
import {forgetSiteKey,hasSiteKey} from '../lib/site-lock';

/**
 * 設定 →「詳細」→「この端末の合言葉」。公開ページは合言葉で開く。一度入れた端末は覚えているので、
 * 人に貸す・手放すときなどにここで消す。手帳のデータ（この端末の記録）は消えない。
 */
export function SiteLockSettings(){
  const [saved,setSaved]=useState<boolean|null>(null);
  const [confirm,setConfirm]=useState(false);
  const [busy,setBusy]=useState(false);
  useEffect(()=>{void hasSiteKey().then(setSaved);},[]);
  const forget=async()=>{
    setBusy(true);
    try{
      await forgetSiteKey();
      toast.success('この端末の合言葉を消しました');
      setTimeout(()=>location.reload(),600);
    }catch{
      toast.error('消せませんでした');
      setBusy(false);
    }
  };
  return <div id="settings-site-lock" className="settings-sub">
    <h3><KeyRound size={17}/>この端末の合言葉</h3>
    <p>一度入れた端末では次から入れなくても開けます。</p>
    <p className="hint">{saved===null?'確かめています…':saved?'この端末は合言葉を覚えています。':'この端末には合言葉が保存されていません。'}消しても、手帳の記録は消えません。次に開くときに合言葉を入れ直します。</p>
    {!confirm
      ?<div className="stack-actions" style={{marginTop:10}}><Action secondary disabled={!saved||busy} onClick={()=>setConfirm(true)}><KeyRound size={16}/>この端末の合言葉を消す</Action></div>
      :<div className="stack-actions" style={{marginTop:10}}>
        <Action disabled={busy} onClick={()=>void forget()}>消して閉じる</Action>
        <Action secondary disabled={busy} onClick={()=>setConfirm(false)}>やめる</Action>
      </div>}
  </div>;
}
