import {useMemo} from 'react';
import {ArrowRight,MessageCircle} from 'lucide-react';
import {DeskChatPanel} from './DeskChatPanel';
import type {Book,Profile,Task} from '../lib/model';
import {formatMoney,moneyTotals,validDate} from '../lib/dates';

export type MarriageDeskProps={
  book:Book;
  profile:Profile;
  scoped:Task[];
  actionable:Task[];
  done:Task[];
  soonCount:number;
  today:string;
  hasBook:boolean;
  syncStatus?:'off'|'ok'|'error'|'syncing';
  onOpenTask:(id:string)=>void;
  onOpenProfile:()=>void;
  onGoJourney:()=>void;
  onOpenSettings?:()=>void;
  onGoFind?:(keyword?:string)=>void;
};

export function MarriageDesk({book,profile:p,actionable,done,soonCount,hasBook,syncStatus='off',onOpenTask,onOpenProfile,onGoJourney,onOpenSettings,onGoFind}:MarriageDeskProps){
  const totals=useMemo(()=>moneyTotals(book),[book]);
  const hasReceived=useMemo(()=>Object.values(book.records).some(r=>r.moneyKind==='received'&&r.amount!==null&&r.status!=='na'),[book.records]);
  const hasAvoided=useMemo(()=>Object.values(book.records).some(r=>(r.moneyKind==='monthlySaving'||r.moneyKind==='taxEstimate')&&r.amount!==null&&r.status!=='na'),[book.records]);
  const avoidedTotal=totals.monthlySaving+totals.taxEstimate;
  const progressPct=actionable.length?Math.round(done.length/actionable.length*100):0;
  const names=p.name1&&p.name2?`${p.name1} × ${p.name2}`:p.name1||p.name2||'ふたり';

  return (
    <div className="desk-root desk-chat-only">
      <header className="desk-titlebar">
        <div className="desk-title-left">
          <MessageCircle size={18} aria-hidden/>
          <h1>Amityちゃんにきく</h1>
          <span className="desk-subtitle">{names}</span>
        </div>
        <div className="desk-title-right">
          {syncStatus!=='off'&&(
            <span className={`desk-sync-pill sync-${syncStatus}`} title="Gist同期" aria-label={`同期 ${syncStatus}`}>
              {syncStatus==='syncing'?'SYNC…':syncStatus==='ok'?'SYNC':syncStatus==='error'?'SYNC!':'SYNC'}
            </span>
          )}
          <button type="button" className="desk-mini-link" onClick={onGoJourney}>ロードマップ</button>
          {onOpenSettings&&<button type="button" className="desk-mini-link" onClick={onOpenSettings}>設定</button>}
        </div>
      </header>

      <section className="desk-money-strip" aria-label="得と損回避（入力のみ）">
        <div className="desk-money-chip">
          <span>得した記録</span>
          <strong>{hasReceived?`${formatMoney(totals.received)}円`:'—'}</strong>
        </div>
        <div className="desk-money-chip">
          <span>損回避・節約</span>
          <strong>{hasAvoided?`${formatMoney(avoidedTotal)}円`:'—'}</strong>
        </div>
        <div className="desk-money-chip muted">
          <span>進捗</span>
          <strong>{actionable.length?`${progressPct}%`:'—'}</strong>
          <small>{done.length}/{actionable.length}</small>
        </div>
        {soonCount>0&&(
          <div className="desk-money-chip warn">
            <span>近い期限</span>
            <strong>{soonCount}件</strong>
          </div>
        )}
      </section>
      <p className="desk-money-note">金額は二人が入力した記録のみ。未入力は —。結婚新生活支援は賞品扱いしません。</p>

      {!hasBook&&(
        <div className="desk-start">
          <div>
            <strong>まずは手帳を整えよう</strong>
            <p>呼び名や婚姻日を入れると、ロードマップが二人向けに整います。聞くのはこのままどうぞ。</p>
          </div>
          <button type="button" className="desk-cta" onClick={onOpenProfile}>手帳を整える <ArrowRight size={15}/></button>
        </div>
      )}

      <div className="desk-chat-stage">
        <div className="desk-chat-mascot-rail" aria-hidden="true">
          <img src="./desk-mascot.png" alt="" width={88} height={88} decoding="async"/>
          <p>なんでも聞いてね</p>
        </div>
        <DeskChatPanel
          embedded
          open
          onClose={()=>{}}
          onOpenTask={onOpenTask}
          onGoFind={onGoFind}
        />
      </div>

      <div className="desk-footer-actions">
        <button type="button" className="desk-cta secondary" onClick={onGoJourney}>ロードマップを開く <ArrowRight size={15}/></button>
        {validDate(p.wdate)?<p className="desk-footnote">婚姻日基準 {p.wdate}</p>:<p className="desk-footnote">婚姻日は設定から入れられます。</p>}
      </div>
    </div>
  );
}

export default MarriageDesk;
