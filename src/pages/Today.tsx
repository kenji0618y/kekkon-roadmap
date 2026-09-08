import { Link } from 'react-router-dom';
import home from '../data/home.json';
import meta from '../data/meta.json';
import { ProfileLocks } from '../components/ProfileLocks';
import { StampCard } from '../components/StampCard';
import { Toggles } from '../components/Toggles';
import type { AppState } from '../hooks/useAppState';
import { formatYen } from '../lib/money';
import { recommendStamps } from '../lib/stampContent';

type Props = { state: AppState };

export function Today({ state }: Props) {
  const next = recommendStamps(state.visible, state.statuses, 3);
  const progress = state.visible.length
    ? Math.round((state.doneCount / state.visible.length) * 100)
    : 0;
  const ho = state.homeOverrides;
  const headline =
    ho.headline?.trim() || home.headline || '式は切る。届出は出す。現金は会社規程とNISA二人枠だけ見ろ。';
  const banner = ho.anti_lie_banner?.trim() || home.anti_lie_banner;
  const softLead =
    home.talk_lines?.[0]?.line ||
    '結婚は式じゃなくて届出。届出そのものは0円。';

  return (
    <div className="page today today-home">
      <header className="home-head">
        <div className="home-head-top">
          <p className="kicker home-kicker">広島 · データ{meta.data_year}</p>
          <Link className="text-link home-edit" to="/edit" aria-label="編集">
            編集
          </Link>
        </div>
        <h1 className="home-title">結婚の損得ガイド</h1>
        <p className="home-soft-lead">{softLead}</p>
        <p className="home-headline-quiet" title={headline}>
          {headline}
        </p>
        <ProfileLocks />
      </header>

      <section className="home-recommend" aria-label="おすすめ">
        <div className="section-row">
          <h2 className="home-recommend-title">おすすめ</h2>
          <Link className="text-link" to="/map">
            ロードマップ
          </Link>
        </div>
        {next.length === 0 ? (
          <div className="empty">推奨は全部完了。すごい。</div>
        ) : (
          next.map((s) => (
            <StampCard
              key={s.id}
              stamp={s}
              status={state.statuses[s.id] || 'todo'}
              onToggle={() => state.toggleDone(s.id)}
              compact
              showWhyPreview
            />
          ))
        )}
      </section>

      <section className="home-metrics" aria-label="進捗">
        <div className="streak-card home-streak" aria-label="連続日数">
          <div className="streak-n">{state.streak}</div>
          <div className="streak-l">
            <strong>日連続</strong>
            <span>開いただけでカウント。小さく進もう。</span>
          </div>
          <div className="streak-ring" style={{ ['--p' as string]: `${progress}%` }}>
            <span>{progress}%</span>
          </div>
        </div>

        <div className="stat-grid" aria-label="進捗カウンター">
          <div className="stat-card">
            <div className="stat-label">実現した円</div>
            <div className="stat-val ok">{formatYen(state.realized)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">回避した損</div>
            <div className="stat-val warn">{formatYen(state.avoided)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">完了スタンプ</div>
            <div className="stat-val">
              {state.doneCount}
              <span className="stat-sub"> / {state.visible.length}</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">わからない</div>
            <div className="stat-val warn">{state.unknownCount}</div>
          </div>
        </div>

        <div className="heroes soft" aria-label="注目数字">
          {home.hero_numbers.map((h) => (
            <div key={h.id} className="hero">
              <div className="n">{h.value}</div>
              <div className="l">{h.label}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="banner compact warn-zero" role="note">
        <strong>結婚新生活 = 0円</strong>
        <span>{banner}</span>
      </div>

      <div className="home-cta">
        <Link className="btn primary wide" to="/map">
          ロードマップを進める
        </Link>
        <Link className="text-link" to="/map/deadlines">
          期限を確認
        </Link>
      </div>

      <details className="secondary-panel">
        <summary>分岐トグル・対象外</summary>
        <Toggles settings={state.settings} onChange={state.setToggle} compact />
        <p className="muted micro">子・買う予定で表示スタンプが変わります。</p>
        <Link className="text-link danger" to="/map/know?tab=exclude">
          対象外リスト（賞品にしない）
        </Link>
      </details>
    </div>
  );
}
