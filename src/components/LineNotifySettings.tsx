import {useEffect,useState} from 'react';
import {MessageCircle} from 'lucide-react';
import {toast} from 'sonner';
import {Input} from './ui/input';
import {Label} from './ui/label';
import {Switch} from './ui/switch';
import {Action} from './book-controls';
import {pairEventWhoLabels,type Book,type LineNotifySettings as LineNotifyPrefs} from '../lib/model';
import {LINE_SECRET_MIN,isRelayUrl,linePrepText,readSecretOverride,statusResultText,writeSecretOverride} from '../lib/line-notify';
import type {LineNotify} from '../lib/use-line-notify';

/**
 * 設定 → 詳細設定 →「LINE通知」（端末どうしの自動同期のすぐ下）。
 * 中継先の URL とオン/オフは手帳に入れて同期（ふたりで共通）。合言葉は同期のキーからこの端末の中で作る（保存しない）。
 */
export function LineNotifySettings({book,line,save,onOpenSync}:{book:Book,line:LineNotify,save:(patch:Partial<LineNotifyPrefs>,message:string)=>Promise<boolean>,onOpenSync:()=>void}){
  const w=pairEventWhoLabels(book.profile);
  const names={n1:w.male,n2:w.female};
  const saved=book.lineNotify?.url||'';
  const [url,setUrl]=useState(saved);
  useEffect(()=>setUrl(saved),[saved]);
  const urlBad=!!url.trim()&&!isRelayUrl(url);
  const [testing,setTesting]=useState(false);
  const [result,setResult]=useState<{text:string,warn:boolean}|null>(null);
  const [manual,setManual]=useState('');
  const [hasManual,setHasManual]=useState(()=>readSecretOverride().length>=LINE_SECRET_MIN);

  const saveUrl=async()=>{
    const v=url.trim();
    if(v===saved.trim())return;
    if(v&&!isRelayUrl(v)){toast.error('「https://script.google.com/macros/s/」で始まり「/exec」で終わるURLを貼ってください');return;}
    await save({url:v},v?'中継先のURLを保存しました':'中継先のURLを消しました');
  };
  const copy=async()=>{
    if(await line.copySecret())toast.success('合言葉をコピーしました。Googleのスクリプトの「スクリプト プロパティ」にだけ貼ってください');
    else toast.error('コピーできませんでした');
  };
  const test=async()=>{
    setTesting(true);setResult(null);
    try{
      if(line.missing==='sync-off'||line.missing==='no-key'){setResult({text:'準備中：'+linePrepText(line.missing).fix,warn:true});return;}
      setResult(statusResultText(await line.status(),names));
    }catch{setResult(statusResultText({ok:false,error:'network'},names));}
    finally{setTesting(false);}
  };
  const saveManual=()=>{
    const v=manual.trim();
    if(v.length<LINE_SECRET_MIN){toast.error(`合言葉は${LINE_SECRET_MIN}文字以上です`);return;}
    writeSecretOverride(v);setManual('');setHasManual(true);line.refresh();
    toast.success('この端末に合言葉を保存しました');
  };
  const clearManual=()=>{writeSecretOverride('');setHasManual(false);line.refresh();toast.success('手で入れた合言葉を消しました');};

  const stateText=line.state==='on'?'オン（この端末から送れます）'
    :line.state==='off'?'オフ'
    :linePrepText(line.missing).state;

  return <div id="settings-line-notify" className="settings-sub">
    <h3><MessageCircle size={17}/>LINE通知</h3>
    <p>掲示板にメモを書くと、相手のLINEに「名前：メモ」が届きます。アプリを閉じていても届きます。使うには、LINE公式アカウントとGoogleのスクリプトを先に用意します。</p>
    <p className={`line-state${line.state==='on'?' is-on':line.state==='preparing'?' is-wait':''}`} role="status">いまの状態：{stateText}</p>

    <div className="field" style={{width:'100%',marginBottom:12}}>
      <Label htmlFor="line-relay-url">お知らせの中継先（GoogleのスクリプトのURL）</Label>
      <Input id="line-relay-url" inputMode="url" autoComplete="off" spellCheck={false} value={url} onChange={e=>setUrl(e.target.value)} onBlur={()=>void saveUrl()} placeholder="https://script.google.com/macros/s/…/exec" maxLength={300} aria-invalid={urlBad||undefined}/>
      {urlBad?<p className="hint warn" style={{marginTop:6}}>「https://script.google.com/macros/s/」で始まり「/exec」で終わるURLだけ使えます。</p>
        :<p className="hint" style={{marginTop:6}}>このURLは手帳と一緒に、ふたりの端末にそろいます。</p>}
    </div>

    <label className="scope-toggle" style={{marginBottom:14}}><Switch checked={!!book.lineNotify?.on} onCheckedChange={v=>void save({on:v},v?'LINE通知をオンにしました':'LINE通知をオフにしました')}/><span>LINE通知を使う（ふたりの端末で共通）</span></label>

    <p className="hint">合言葉は、端末どうしの自動同期のキーから、この端末の中で作ります。同じキーを入れたふたりの端末では、同じ合言葉になります。合言葉は手帳には保存されず、同期もされません。</p>
    {(line.missing==='sync-off'||line.missing==='no-key')&&<p className="hint warn">準備中：{linePrepText(line.missing).fix} <button type="button" className="desk-board-link" onClick={onOpenSync}>端末どうしの自動同期を開く</button></p>}
    <div className="line-secret-actions">
      <Action secondary disabled={!line.hasSecret} onClick={()=>void copy()}>合言葉をコピー</Action>
      <Action secondary disabled={testing} onClick={()=>void test()}>{testing?'確かめています…':'つながるか試す'}</Action>
    </div>
    <p className="hint">コピーした合言葉は、Googleのスクリプトの「スクリプト プロパティ」（BOARD_SECRET）にだけ貼ってください。チャットやメモには貼らないでください。「つながるか試す」では、LINEには何も送りません。</p>
    {result&&<p className={`line-test-result${result.warn?' warn':''}`} role="status">{result.text}</p>}

    <details className="line-secret-manual">
      <summary>合言葉を手で入れる（ふたりの端末で自動同期のキーが違うとき）</summary>
      <p className="hint" style={{marginTop:6}}>スクリプトに貼ったのと同じ合言葉を、ふたりの端末それぞれに入れます。この端末の中だけに保存されます。{hasManual?'いまは手で入れた合言葉を使っています。':''}</p>
      <Input type="password" autoComplete="off" value={manual} onChange={e=>setManual(e.target.value)} placeholder={`${LINE_SECRET_MIN}文字以上`} maxLength={200} aria-label="合言葉を手で入れる"/>
      <div className="line-secret-actions">
        <Action secondary disabled={manual.trim().length<LINE_SECRET_MIN} onClick={saveManual}>この端末に保存</Action>
        {hasManual&&<Action secondary onClick={clearManual}>手で入れた合言葉を消す</Action>}
      </div>
    </details>

    <p className="hint">公式アカウントには、{names.n1}さんのLINEから「登録 1」、{names.n2}さんのLINEから「登録 2」と送ります。</p>
  </div>;
}
