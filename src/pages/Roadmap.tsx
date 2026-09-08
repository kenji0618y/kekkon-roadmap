import { useMemo, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import home from '../data/home.json';
import meta from '../data/meta.json';
import phasesData from '../data/phases.json';
import sugorokuData from '../data/sugoroku.json';
import { ProfileLocks } from '../components/ProfileLocks';
import { StampActions } from '../components/StampActions';
import { StampCard } from '../components/StampCard';
import { StampPad } from '../components/StampPad';
import { Toggles } from '../components/Toggles';
import type { AppState } from '../hooks/useAppState';
import { squareProgress } from '../lib/askTips';
import { isCompanyRuleStamp } from '../lib/editorStorage';
import { formatYen } from '../lib/money';
import { recommendStamps } from '../lib/stampContent';
import type { AppSettings, Stamp, StampStatus, SugorokuSquare } from '../types';
import { Deadlines } from './Deadlines';
import { Know } from './Know';

type Props = { state: AppState };

type Phase = {
  id: string;
  title: string;
  range: string;
  branch?: string;
};

type MapTab = 'map' | 'deadlines' | 'know';

function branchDimmed(branch: SugorokuSquare['branch'], settings: AppSettings): boolean {
  if (branch === 'child' && !settings.hasChild) return true;
  if (branch === 'buy' && !settings.buyingHome) return true;
  return false;
}

function branchBadge(branch: SugorokuSquare['branch']): string | null {
  if (branch === 'child') return '子あり';
  if (branch === 'buy') return '買う予定';
  return null;
}

function phaseRange(square: SugorokuSquare, phases: Phase[]): string {
  const phase = phases.find((p) => p.id === square.phaseId);
  return phase?.range ?? '';
}

function tabFromPath(pathname: string): MapTab {
  if (pathname.includes('/deadlines')) return 'deadlines';
  if (pathname.includes('/know')) return 'know';
  return 'map';
}

export function Roadmap({ state }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const tab = tabFromPath(location.pathname);
  const phases = phasesData.phases as Phase[];
  const squares = sugorokuData.squares as SugorokuSquare[];
  const [sheetStampId, setSheetStampId] = useState<string | null>(null);

  const next = recommendStamps(state.visible, state.statuses, 3);
  const progress = state.visible.length
    ? Math.round((state.doneCount / state.visible.length) * 100)
    : 0;
  const ho = state.homeOverrides;
  const headline =
    ho.headline?.trim() || home.headline || '式は切る。届出は出す。現金は会社規程とNISA二人枠だけ見ろ。';
  const banner = ho.anti_lie_banner?.trim() || home.anti_lie_banner;

  const stampById = useMemo(() => {
    const m = new Map<string, Stamp>();
    for (const s of state.allStamps) m.set(s.id, s);
    return m;
  }, [state.allStamps]);

  const sheetStamp = sheetStampId ? stampById.get(sheetStampId) ?? null : null;
  const sheetStatus: StampStatus = sheetStamp
    ? state.statuses[sheetStamp.id] || 'todo'
    : 'todo';

  const pathSquares = squares.filter((s) => !s.sideStep);

  function stampsForSquare(sq: SugorokuSquare): Stamp[] {
    const ids = [...(sq.stampIds || [])];
    for (const [stampId, squareId] of Object.entries(state.customStampSquares)) {
      if (squareId === sq.id && !ids.includes(stampId)) ids.push(stampId);
    }
    return ids.map((id) => stampById.get(id)).filter((s): s is Stamp => !!s);
  }

  function renderSquare(sq: SugorokuSquare, opts: { zig: 'left' | 'right' }) {
    const dimmed = branchDimmed(sq.branch, state.settings);
    const badge = branchBadge(sq.branch);
    const stamps = stampsForSquare(sq);
    const prog = squareProgress(
      stamps.map((s) => s.id),
      state.statuses,
    );

    return (
      <div
        className={[
          'sugoroku-square glass-card enter-stagger',
          opts.zig === 'left' ? 'align-left' : 'align-right',
          sq.optional ? 'is-optional' : '',
          sq.quiet ? 'is-quiet' : '',
          dimmed ? 'is-dimmed' : '',
          sq.branch === 'child' ? 'branch-child' : '',
          sq.branch === 'buy' ? 'branch-buy' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        style={{ ['--enter-i' as string]: sq.n ?? 0 }}
      >
        <div className="sugoroku-square-num" aria-hidden>
          {sq.n ?? '·'}
        </div>
        <div className="sugoroku-illust-wrap compact-header">
          <img
            className="sugoroku-illust"
            src={sq.image}
            alt=""
            loading="lazy"
            decoding="async"
          />
          {badge && (
            <span className={`sugoroku-badge ${dimmed ? 'off' : 'on'}`}>
              {badge}
              {dimmed ? '（オフ）' : ''}
            </span>
          )}
          {sq.optional && !badge && <span className="sugoroku-badge optional">任意</span>}
          {sq.quiet && <span className="sugoroku-badge quiet">期限の地図のみ</span>}
        </div>
        <div className="stamp-pad-below" role="group" aria-label={`${sq.title}のスタンプ台`}>
          <div className="stamp-pad-grid">
            {stamps.map((st) => (
              <StampPad
                key={st.id}
                stamp={st}
                status={state.statuses[st.id] || 'todo'}
                dimmed={dimmed}
                onPress={() => setSheetStampId(st.id)}
              />
            ))}
            {stamps.length === 0 && (
              <span className="stamp-pad-empty muted micro">スタンプなし</span>
            )}
          </div>
        </div>
        <div className="sugoroku-square-body">
          <div className="sugoroku-head-row">
            <h3 className="sugoroku-title">{sq.title}</h3>
            {prog.total > 0 && (
              <span className="sugoroku-progress" title={prog.label}>
                {prog.label}
              </span>
            )}
          </div>
          <div className="sugoroku-range">{phaseRange(sq, phases)}</div>
          {sq.subtitle && <div className="sugoroku-sub">{sq.subtitle}</div>}
          <div className="sugoroku-chips">
            {sq.chips.slice(0, 4).map((c) => (
              <span className="sugoroku-chip" key={c}>
                {c}
              </span>
            ))}
          </div>
          <span className="sugoroku-tap">スタンプ台を押して進める</span>
        </div>
      </div>
    );
  }

  return (
    <div className="page roadmap-main">
      <header className="home-head enter-stagger" style={{ ['--enter-i' as string]: 0 }}>
        <div className="home-head-top">
          <p className="kicker home-kicker">広島 · データ{meta.data_year}</p>
          <Link className="text-link home-edit" to="/edit" aria-label="編集">
            編集
          </Link>
        </div>
        <h1 className="home-title">結婚ロードマップ</h1>
        <p className="home-headline-quiet" title={headline}>
          {headline}
        </p>
        <ProfileLocks />
      </header>

      <section
        className="home-metrics enter-stagger"
        style={{ ['--enter-i' as string]: 1 }}
        aria-label="進捗"
      >
        <div className="streak-card home-streak glass-streak" aria-label="連続日数">
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
          <div className="stat-card glass-card">
            <div className="stat-label">実現した円</div>
            <div className="stat-val ok">{formatYen(state.realized)}</div>
          </div>
          <div className="stat-card glass-card">
            <div className="stat-label">回避した損</div>
            <div className="stat-val warn">{formatYen(state.avoided)}</div>
          </div>
          <div className="stat-card glass-card">
            <div className="stat-label">完了スタンプ</div>
            <div className="stat-val">
              {state.doneCount}
              <span className="stat-sub"> / {state.visible.length}</span>
            </div>
          </div>
          <div className="stat-card glass-card">
            <div className="stat-label">わからない</div>
            <div className="stat-val warn">{state.unknownCount}</div>
          </div>
        </div>

        <div className="heroes soft" aria-label="注目数字">
          {home.hero_numbers.map((h) => (
            <div key={h.id} className="hero glass-card">
              <div className="n">{h.value}</div>
              <div className="l">{h.label}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="banner compact warn-zero glass-card" role="note">
        <strong>結婚新生活 = 0円</strong>
        <span>{banner}</span>
      </div>

      <nav className="map-subnav glass-subnav" aria-label="ロードマップ内">
        <NavLink to="/" end className={({ isActive }) => (isActive ? 'on' : undefined)}>
          マップ
        </NavLink>
        <NavLink
          to="/deadlines"
          className={({ isActive }) => (isActive ? 'on' : undefined)}
        >
          期限
        </NavLink>
        <NavLink to="/know" className={({ isActive }) => (isActive ? 'on' : undefined)}>
          知る
        </NavLink>
      </nav>

      {tab === 'deadlines' && <Deadlines state={state} embedded />}
      {tab === 'know' && <Know state={state} embedded />}

      {tab === 'map' && (
        <>
          <Toggles settings={state.settings} onChange={state.setToggle} compact />

          <p className="sugoroku-legend quiet-legend" role="note">
            {sugorokuData.legend}
          </p>
          <p className="muted micro sugoroku-hint">
            子あり／買う予定オフでもマスは見られます（薄く表示）。スタンプ台は押せます。 · M0＝
            {phasesData.m0_definition}
          </p>

          <div className="pad-legend" aria-label="スタンプ台の見方">
            <span className="pad-leg st-todo">未</span>
            <span className="pad-leg st-checked">
              <span className="check-blue inline" aria-hidden />
              確認済
            </span>
            <span className="pad-leg st-done">完了</span>
            <span className="pad-leg st-unknown">？</span>
            <span className="pad-leg st-na">対象外</span>
          </div>

          <ol className="sugoroku-board" aria-label="結婚ロードマップ盤">
            {pathSquares.map((sq, idx) => {
              const zig = idx % 2 === 0 ? 'left' : 'right';
              return (
                <li key={sq.id} className={`sugoroku-row zig-${zig}`}>
                  {idx > 0 && (
                    <div className={`sugoroku-path sugoroku-path-${zig}`} aria-hidden>
                      <span className="sugoroku-path-line" />
                    </div>
                  )}
                  {renderSquare(sq, { zig })}
                </li>
              );
            })}
          </ol>
        </>
      )}

      <section className="home-recommend enter-stagger" aria-label="おすすめ">
        <div className="section-row">
          <h2 className="home-recommend-title">おすすめ</h2>
        </div>
        {next.length === 0 ? (
          <div className="empty glass-card">推奨は全部完了。すごい。</div>
        ) : (
          next.map((s, i) => (
            <div key={s.id} className="enter-stagger" style={{ ['--enter-i' as string]: i }}>
              <StampCard
                stamp={s}
                status={state.statuses[s.id] || 'todo'}
                onToggle={() => state.toggleDone(s.id)}
                compact
                showWhyPreview
              />
            </div>
          ))
        )}
      </section>

      <details className="secondary-panel glass-card">
        <summary>分岐トグル・対象外</summary>
        <Toggles settings={state.settings} onChange={state.setToggle} compact />
        <p className="muted micro">子・買う予定で表示スタンプが変わります。</p>
        <Link className="text-link danger" to="/know?tab=exclude">
          対象外リスト（賞品にしない）
        </Link>
      </details>

      {sheetStamp && tab === 'map' && (
        <div
          className="sugoroku-sheet-backdrop"
          role="presentation"
          onClick={() => setSheetStampId(null)}
        >
          <div
            className="sugoroku-sheet stamp-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="stamp-sheet-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sugoroku-sheet-handle" aria-hidden />
            <div className="sugoroku-sheet-head">
              <div>
                <p className="kicker" style={{ marginBottom: 2 }}>
                  {sheetStamp.track} · {sheetStamp.id}
                </p>
                <h2 id="stamp-sheet-title">{sheetStamp.title}</h2>
                <p className="muted micro">
                  {sheetStamp.who} · {sheetStamp.window}
                </p>
              </div>
              <button
                type="button"
                className="sugoroku-sheet-close"
                onClick={() => setSheetStampId(null)}
                aria-label="閉じる"
              >
                ×
              </button>
            </div>
            <div className="sugoroku-sheet-list">
              <StampActions
                stamp={sheetStamp}
                status={sheetStatus}
                messages={state.chats[sheetStamp.id] || []}
                onStatus={(s) => state.setStatus(sheetStamp.id, s)}
                onChat={(msgs) => state.setChat(sheetStamp.id, msgs)}
              />
              {isCompanyRuleStamp(sheetStamp) && (
                <div className="reg-shortcut card-soft">
                  <p className="muted micro">会社規程スタンプ</p>
                  {state.regsForStamp(sheetStamp.id).length > 0 ? (
                    <ul className="reg-shortcut-list">
                      {state.regsForStamp(sheetStamp.id).map((r) => (
                        <li key={r.id}>
                          <Link
                            className="text-link"
                            to={`/edit?tab=regs&stamp=${encodeURIComponent(sheetStamp.id)}`}
                            onClick={() => setSheetStampId(null)}
                          >
                            この規程を開く：{r.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <Link
                      className="btn ghost wide"
                      to={`/edit?tab=regs&stamp=${encodeURIComponent(sheetStamp.id)}`}
                      onClick={() => setSheetStampId(null)}
                    >
                      この規程を開く／貼る
                    </Link>
                  )}
                </div>
              )}
              <button
                type="button"
                className="btn ghost wide"
                onClick={() => {
                  const id = sheetStamp.id;
                  setSheetStampId(null);
                  navigate(`/stamp/${encodeURIComponent(id)}`);
                }}
              >
                詳細ページを開く →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
