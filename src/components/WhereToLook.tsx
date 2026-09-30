import {ExternalLink} from 'lucide-react';
import {homeContent,sources} from '../data/catalog';

/**
 * 「どこを見るか」（市の窓口／未導入の支援／このサイト）と「最短パス：届出週」。
 * 2026-09-30 にデスク（ホーム）から探すタブへ移動。文言・リンクは移動前と同一。
 */

const CITY_MARRY = sources.marry;
const CITY_GRAFFER = sources.graffer;
const CITY_NOGRANT = sources.nogrant;

export function DeskRoleLabels(){
  return (
    <section className="desk-roles" aria-label="役割の分け方">
      <header className="desk-roles-head">
        <strong>どこを見るか</strong>
        <span>市の窓口／未導入の支援／このサイト</span>
      </header>
      <ul className="desk-roles-list">
        <li>
          <span className="desk-roles-label" id="desk-role-city">市の窓口・持ち物</span>
          <span className="desk-roles-body" role="group" aria-labelledby="desk-role-city">
            <a href={CITY_MARRY.url} target="_blank" rel="noopener noreferrer" aria-label="広島市・婚姻届と必要書類（公式・別タブ）">
              広島市・婚姻届と必要書類 <ExternalLink size={11} aria-hidden/>
            </a>
            <a href={CITY_GRAFFER.url} target="_blank" rel="noopener noreferrer" aria-label="オンライン手続き Graffer（公式・別タブ）">
              オンライン手続き（Graffer） <ExternalLink size={11} aria-hidden/>
            </a>
          </span>
        </li>
        <li>
          <span className="desk-roles-label" id="desk-role-nogrant">結婚新生活支援</span>
          <span className="desk-roles-body" role="group" aria-labelledby="desk-role-nogrant">
            <span className="desk-roles-note">広島市は未導入（もらえる前提にしない）</span>
            <a href={CITY_NOGRANT.url} target="_blank" rel="noopener noreferrer" aria-label="市FAQ：結婚新生活支援の実施について（公式・別タブ）">
              市FAQ：実施について <ExternalLink size={11} aria-hidden/>
            </a>
          </span>
        </li>
        <li>
          <span className="desk-roles-label">民間・税・除外・二人の進捗</span>
          <span className="desk-roles-body">
            <span className="desk-roles-here">このサイト</span>
          </span>
        </li>
      </ul>
    </section>
  );
}

export function FilingWeekPath({onOpenTask}:{onOpenTask:(id:string)=>void}){
  const path = homeContent.filing_week_path;
  const steps = path?.steps || [];
  if(!steps.length)return null;
  return (
    <details className="desk-filing-path">
      <summary>
        <strong>最短パス：届出週</strong>
        <span>式なし・広島市 · 届出そのものは0円 · 開くと手順</span>
      </summary>
      {path?.blurb && <p className="desk-filing-blurb">{path.blurb}</p>}
      <ol className="desk-filing-steps">
        {steps.map((s,i)=>(
          <li key={s.id}>
            <button type="button" className="desk-filing-step" onClick={()=>onOpenTask(s.stamp_id)}>
              <em>{i+1}</em>
              <span>
                <strong>{s.title}</strong>
                {s.detail && <small>{s.detail}</small>}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </details>
  );
}
