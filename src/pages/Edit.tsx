import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import sugorokuData from '../data/sugoroku.json';
import homeSeed from '../data/home.json';
import type { AppState } from '../hooks/useAppState';
import { applyStampOverride, type RegDoc, type RegSide, type StampOverride } from '../lib/editorStorage';
import type { Stamp, StampFaq, SugorokuSquare } from '../types';

type Props = { state: AppState };

type TabId = 'regs' | 'stamps' | 'home' | 'wish' | 'backup';

const TABS: { id: TabId; label: string }[] = [
  { id: 'regs', label: '規程' },
  { id: 'stamps', label: 'スタンプ' },
  { id: 'home', label: 'ホーム' },
  { id: 'wish', label: 'やりたい' },
  { id: 'backup', label: 'バックアップ' },
];

export function Edit({ state }: Props) {
  const [params, setParams] = useSearchParams();
  const tabParam = params.get('tab') as TabId | null;
  const tab: TabId = TABS.some((t) => t.id === tabParam) ? (tabParam as TabId) : 'regs';
  const focusStamp = params.get('stamp') || '';
  const ed = state.editor;
  const pinSet = !!ed.editor.pin;
  const [unlocked, setUnlocked] = useState(() => !ed.editor.pin);
  const [pinTry, setPinTry] = useState('');
  const [pinError, setPinError] = useState(false);
  const gateOpen = !pinSet || unlocked;

  function setTab(id: TabId) {
    const next = new URLSearchParams(params);
    next.set('tab', id);
    if (id !== 'regs') next.delete('stamp');
    setParams(next);
  }

  if (!gateOpen) {
    return (
      <div className="page edit-page">
        <p className="kicker">編集</p>
        <h1>PINを入力</h1>
        <p className="muted">編集画面は4桁PINで守られています。</p>
        <div className="edit-pin-gate card-soft">
          <input
            inputMode="numeric"
            maxLength={4}
            value={pinTry}
            onChange={(e) => {
              setPinTry(e.target.value.replace(/\D/g, '').slice(0, 4));
              setPinError(false);
            }}
            placeholder="••••"
            aria-label="PIN"
            className="edit-pin-input"
          />
          <button
            type="button"
            className="btn primary"
            onClick={() => {
              if (pinTry === ed.editor.pin) {
                setUnlocked(true);
                setPinError(false);
              } else setPinError(true);
            }}
          >
            開く
          </button>
          {pinError && <p className="edit-err">PINが違います</p>}
        </div>
        <Link className="text-link" to="/">
          ← 今日へ戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="page edit-page">
      <div className="edit-top">
        <div>
          <p className="kicker">編集 · 端末に保存</p>
          <h1>自分で直す</h1>
        </div>
        <Link className="btn ghost edit-back" to="/">
          閉じる
        </Link>
      </div>
      <p className="muted micro edit-hint">
        変更はすべてこの端末のLocalStorageに保存。円の金額は自分で入れた数字だけ使います。
      </p>

      <div className="edit-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`edit-tab${tab === t.id ? ' on' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'regs' && <RegsPanel state={state} focusStamp={focusStamp} />}
      {tab === 'stamps' && <StampsPanel state={state} />}
      {tab === 'home' && <HomePanel state={state} />}
      {tab === 'wish' && <WishPanel state={state} />}
      {tab === 'backup' && <BackupPanel state={state} />}
    </div>
  );
}

function RegsPanel({ state, focusStamp }: { state: AppState; focusStamp: string }) {
  const ed = state.editor;
  const [q, setQ] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<RegDoc | null>(null);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return ed.editor.regs.filter((r) => {
      if (focusStamp && !r.linkedStampIds.includes(focusStamp) && !needle) {
        // still show all if searching; when focusStamp without search, prefer linked
      }
      if (!needle) return true;
      const hay = [r.title, r.side, r.text, ...r.checklist, ...r.linkedStampIds]
        .join(' ')
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [ed.editor.regs, q, focusStamp]);

  const sorted = useMemo(() => {
    if (!focusStamp) return list;
    return [...list].sort((a, b) => {
      const al = a.linkedStampIds.includes(focusStamp) ? 0 : 1;
      const bl = b.linkedStampIds.includes(focusStamp) ? 0 : 1;
      return al - bl;
    });
  }, [list, focusStamp]);

  function startNew() {
    const doc = ed.newReg({
      linkedStampIds: focusStamp ? [focusStamp] : [],
      title: focusStamp ? `${focusStamp}の規程メモ` : '新しい規程',
    });
    setDraft(doc);
    setEditingId(doc.id);
  }

  function startEdit(r: RegDoc) {
    setDraft({ ...r, checklist: [...r.checklist], linkedStampIds: [...r.linkedStampIds] });
    setEditingId(r.id);
  }

  function saveDraft() {
    if (!draft) return;
    ed.upsertReg({
      ...draft,
      title: draft.title.trim() || '無題の規程',
      checklist: draft.checklist.map((c) => c.trim()).filter(Boolean),
      linkedStampIds: draft.linkedStampIds.map((s) => s.trim()).filter(Boolean),
    });
    setEditingId(null);
    setDraft(null);
  }

  const stampOptions = state.seedStamps
    .concat(ed.editor.customStamps)
    .map((s) => s.id)
    .sort();

  return (
    <div className="edit-panel">
      <div className="edit-toolbar">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="規程を検索"
          aria-label="規程検索"
        />
        <button type="button" className="btn primary" onClick={startNew}>
          追加
        </button>
      </div>
      {focusStamp && (
        <div className="banner compact lux-warn">
          <strong>{focusStamp} 向け</strong>
          <span>このスタンプに紐づく規程を優先表示。下でリンクできます。</span>
        </div>
      )}

      {draft && editingId === draft.id && (
        <div className="edit-form card-soft">
          <label className="edit-label">
            タイトル
            <input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
          </label>
          <label className="edit-label">
            会社／側
            <select
              value={draft.side}
              onChange={(e) => setDraft({ ...draft, side: e.target.value as RegSide })}
            >
              <option value="夫側">夫側</option>
              <option value="妻側">妻側</option>
              <option value="共通">共通</option>
            </select>
          </label>
          <label className="edit-label">
            本文・メモ（貼り付けOK）
            <textarea
              rows={8}
              value={draft.text}
              onChange={(e) => setDraft({ ...draft, text: e.target.value })}
              placeholder="就業規則・慶弔規程の抜粋を貼る"
            />
          </label>
          <label className="edit-label">
            要点チェック（1行ずつ）
            <textarea
              rows={4}
              value={draft.checklist.join('\n')}
              onChange={(e) =>
                setDraft({ ...draft, checklist: e.target.value.split('\n') })
              }
              placeholder={'祝金起算：入籍\n休暇日数：3日\n申請期限：30日以内'}
            />
          </label>
          <label className="edit-label">
            紐づくスタンプID（カンマ区切り）
            <input
              value={draft.linkedStampIds.join(',')}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  linkedStampIds: e.target.value
                    .split(/[,、\s]+/)
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
              list="stamp-id-list"
              placeholder="A必1, D1"
            />
            <datalist id="stamp-id-list">
              {stampOptions.map((id) => (
                <option key={id} value={id} />
              ))}
            </datalist>
          </label>
          <div className="edit-form-actions">
            <button type="button" className="btn primary" onClick={saveDraft}>
              保存
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                setDraft(null);
                setEditingId(null);
              }}
            >
              やめる
            </button>
          </div>
        </div>
      )}

      {sorted.length === 0 && !draft ? (
        <div className="empty card-soft">まだ規程がありません。「追加」でコピー庫を始めましょう。</div>
      ) : (
        sorted.map((r) =>
          editingId === r.id && draft ? null : (
            <article key={r.id} className="reg-card card-soft">
              <div className="reg-card-head">
                <span className={`reg-side side-${r.side}`}>{r.side}</span>
                <strong>{r.title}</strong>
              </div>
              {r.linkedStampIds.length > 0 && (
                <div className="reg-links">
                  {r.linkedStampIds.map((id) => (
                    <span key={id} className="reg-chip">
                      {id}
                    </span>
                  ))}
                </div>
              )}
              {r.checklist.length > 0 && (
                <ul className="reg-check">
                  {r.checklist.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              )}
              {r.text && <pre className="reg-text">{r.text.slice(0, 280)}{r.text.length > 280 ? '…' : ''}</pre>}
              <div className="edit-form-actions">
                <button type="button" className="btn ghost" onClick={() => startEdit(r)}>
                  編集
                </button>
                <button
                  type="button"
                  className="btn ghost danger-text"
                  onClick={() => {
                    if (confirm(`「${r.title}」を削除しますか？`)) ed.deleteReg(r.id);
                  }}
                >
                  削除
                </button>
              </div>
            </article>
          ),
        )
      )}
    </div>
  );
}

function StampsPanel({ state }: { state: AppState }) {
  const ed = state.editor;
  const squares = sugorokuData.squares as SugorokuSquare[];
  const [q, setQ] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const hidden = new Set(ed.editor.hiddenStampIds);
    const customIds = new Set(ed.editor.customStamps.map((s) => s.id));
    const seedVisible = state.seedStamps;
    const all: Stamp[] = [
      ...seedVisible,
      ...ed.editor.customStamps.filter((c) => !seedVisible.some((s) => s.id === c.id)),
    ];
    return all
      .map((s) => {
        const isCustom = customIds.has(s.id);
        const base = isCustom
          ? ed.editor.customStamps.find((c) => c.id === s.id)!
          : state.seedStamps.find((x) => x.id === s.id)!;
        const display = applyStampOverride(base, ed.editor.contentOverrides[s.id]);
        return { base, display, isCustom, isHidden: hidden.has(s.id) };
      })
      .filter(({ display, isHidden }) => {
        if (!needle) return true;
        const hay = [display.id, display.title, display.why || '', display.window, display.who]
          .join(' ')
          .toLowerCase();
        return hay.includes(needle) || (isHidden && needle.includes('非表示'));
      });
  }, [state.seedStamps, ed.editor, q]);

  const editing = editId
    ? rows.find((r) => r.display.id === editId) || null
    : null;

  return (
    <div className="edit-panel">
      <div className="edit-toolbar">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="スタンプを検索"
          aria-label="スタンプ検索"
        />
        <button
          type="button"
          className="btn primary"
          onClick={() => {
            const id = ed.addCustomStamp(squares[0]?.id);
            setEditId(id);
          }}
        >
          カスタム追加
        </button>
      </div>
      <p className="muted micro">
        シードは上書きせず、変更レイヤーで合成。非表示はソフト隠し（削除しない）。
      </p>

      {editing && (
        <StampEditForm
          stamp={editing.display}
          isCustom={editing.isCustom}
          isHidden={editing.isHidden}
          override={ed.editor.contentOverrides[editing.display.id]}
          squareId={ed.editor.customStampSquares[editing.display.id] || ''}
          squares={squares}
          onClose={() => setEditId(null)}
          onSaveOverride={(patch) => {
            ed.setOverride(editing.display.id, patch);
          }}
          onClearOverride={() => ed.clearOverride(editing.display.id)}
          onHide={(h) => ed.softHideStamp(editing.display.id, h)}
          onAssignSquare={(sq) => ed.assignCustomSquare(editing.display.id, sq)}
          onSaveCustom={(stamp) => {
            ed.updateCustomStamp(stamp);
          }}
          onDeleteCustom={() => {
            if (confirm(`カスタム「${editing.display.id}」を削除しますか？`)) {
              ed.deleteCustomStamp(editing.display.id);
              setEditId(null);
            }
          }}
        />
      )}

      <ul className="stamp-edit-list">
        {rows.map(({ display, isCustom, isHidden }) => (
          <li key={display.id} className={`stamp-edit-row${isHidden ? ' is-hidden' : ''}`}>
            <button type="button" className="stamp-edit-open" onClick={() => setEditId(display.id)}>
              <span className="stamp-id">{display.id}</span>
              <span className="stamp-edit-title">{display.title}</span>
              {isCustom && <span className="reg-chip">カスタム</span>}
              {isHidden && <span className="reg-chip muted-chip">非表示</span>}
              {ed.editor.contentOverrides[display.id] && (
                <span className="reg-chip on-chip">変更あり</span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StampEditForm({
  stamp,
  isCustom,
  isHidden,
  override,
  squareId,
  squares,
  onClose,
  onSaveOverride,
  onClearOverride,
  onHide,
  onAssignSquare,
  onSaveCustom,
  onDeleteCustom,
}: {
  stamp: Stamp;
  isCustom: boolean;
  isHidden: boolean;
  override?: StampOverride;
  squareId: string;
  squares: SugorokuSquare[];
  onClose: () => void;
  onSaveOverride: (p: StampOverride) => void;
  onClearOverride: () => void;
  onHide: (h: boolean) => void;
  onAssignSquare: (sq: string) => void;
  onSaveCustom: (s: Stamp) => void;
  onDeleteCustom: () => void;
}) {
  const [title, setTitle] = useState(stamp.title);
  const [why, setWhy] = useState(stamp.why || '');
  const [stepsText, setStepsText] = useState((stamp.steps || []).join('\n'));
  const [faqText, setFaqText] = useState(
    (stamp.faq || []).map((f) => `${f.q}\t${f.a}`).join('\n'),
  );
  const [miss, setMiss] = useState(stamp.miss || '');
  const [windowVal, setWindowVal] = useState(stamp.window);
  const [who, setWho] = useState(stamp.who);
  const [track, setTrack] = useState(stamp.track);
  const [inYen, setInYen] = useState(
    override?.money_in_yen != null
      ? String(override.money_in_yen)
      : stamp.money_in?.amount_yen != null
        ? String(stamp.money_in.amount_yen)
        : '',
  );
  const [inNote, setInNote] = useState(
    override?.money_in_note ?? stamp.money_in?.note ?? '',
  );
  const [outYen, setOutYen] = useState(
    override?.money_out_yen != null
      ? String(override.money_out_yen)
      : stamp.money_out?.amount_yen != null
        ? String(stamp.money_out.amount_yen)
        : '',
  );
  const [outNote, setOutNote] = useState(
    override?.money_out_note ?? stamp.money_out?.note ?? '',
  );
  const [sq, setSq] = useState(squareId);

  function parseFaq(text: string): StampFaq[] {
    return text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [q, ...rest] = line.split('\t');
        return { q: (q || '').trim(), a: rest.join('\t').trim() };
      })
      .filter((f) => f.q || f.a);
  }

  function parseYenField(raw: string): number | null | undefined {
    const t = raw.trim();
    if (!t) return null;
    const n = Number(t.replace(/,/g, ''));
    if (!Number.isFinite(n)) return undefined;
    return n;
  }

  function save() {
    const steps = stepsText.split('\n').map((s) => s.trim()).filter(Boolean);
    const faq = parseFaq(faqText);
    const yenIn = parseYenField(inYen);
    const yenOut = parseYenField(outYen);

    if (isCustom) {
      onSaveCustom({
        ...stamp,
        title: title.trim() || stamp.title,
        why,
        steps,
        faq,
        miss: miss.trim() || null,
        window: windowVal,
        who,
        track,
        money_in: {
          amount_yen: yenIn === undefined ? stamp.money_in?.amount_yen ?? null : yenIn,
          note: inNote || undefined,
        },
        money_out: {
          amount_yen: yenOut === undefined ? stamp.money_out?.amount_yen ?? null : yenOut,
          note: outNote || undefined,
        },
      });
      onAssignSquare(sq);
    } else {
      const patch: StampOverride = {
        title: title.trim(),
        why,
        steps,
        faq,
        miss: miss.trim() || null,
        window: windowVal,
        who,
        track,
        money_in_note: inNote,
        money_out_note: outNote,
      };
      if (yenIn !== undefined) patch.money_in_yen = yenIn;
      if (yenOut !== undefined) patch.money_out_yen = yenOut;
      onSaveOverride(patch);
    }
    onClose();
  }

  return (
    <div className="edit-form card-soft stamp-edit-form">
      <div className="edit-form-head">
        <strong>{stamp.id}</strong>
        <button type="button" className="btn ghost" onClick={onClose}>
          ×
        </button>
      </div>
      <label className="edit-label">
        タイトル
        <input value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label className="edit-label">
        なぜやる
        <textarea rows={3} value={why} onChange={(e) => setWhy(e.target.value)} />
      </label>
      <label className="edit-label">
        手順（1行＝1ステップ）
        <textarea rows={4} value={stepsText} onChange={(e) => setStepsText(e.target.value)} />
      </label>
      <label className="edit-label">
        FAQ（質問[Tab]答え）
        <textarea rows={4} value={faqText} onChange={(e) => setFaqText(e.target.value)} />
      </label>
      <label className="edit-label">
        取りこぼし
        <input value={miss} onChange={(e) => setMiss(e.target.value)} />
      </label>
      <div className="edit-grid-2">
        <label className="edit-label">
          誰が
          <input value={who} onChange={(e) => setWho(e.target.value)} />
        </label>
        <label className="edit-label">
          窓
          <input value={windowVal} onChange={(e) => setWindowVal(e.target.value)} />
        </label>
      </div>
      <label className="edit-label">
        トラック
        <input value={track} onChange={(e) => setTrack(e.target.value)} />
      </label>
      <div className="edit-grid-2">
        <label className="edit-label">
          入・円（自分で入力）
          <input
            inputMode="numeric"
            value={inYen}
            onChange={(e) => setInYen(e.target.value)}
            placeholder="空＝金額なし"
          />
        </label>
        <label className="edit-label">
          入・メモ
          <input value={inNote} onChange={(e) => setInNote(e.target.value)} />
        </label>
      </div>
      <div className="edit-grid-2">
        <label className="edit-label">
          出・円（自分で入力）
          <input
            inputMode="numeric"
            value={outYen}
            onChange={(e) => setOutYen(e.target.value)}
            placeholder="空＝金額なし"
          />
        </label>
        <label className="edit-label">
          出・メモ
          <input value={outNote} onChange={(e) => setOutNote(e.target.value)} />
        </label>
      </div>
      {isCustom && (
        <label className="edit-label">
          すごろくマス
          <select value={sq} onChange={(e) => setSq(e.target.value)}>
            <option value="">（未割当）</option>
            {squares.map((s) => (
              <option key={s.id} value={s.id}>
                {s.n != null ? `${s.n}. ` : ''}
                {s.title}（{s.id}）
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="filter-check">
        <input
          type="checkbox"
          checked={isHidden}
          onChange={(e) => onHide(e.target.checked)}
          disabled={isCustom}
        />
        <span>ソフト非表示（シードは消さない）</span>
      </label>
      <div className="edit-form-actions">
        <button type="button" className="btn primary" onClick={save}>
          保存
        </button>
        {!isCustom && (
          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              if (confirm('このスタンプの変更レイヤーを消してシードに戻しますか？')) {
                onClearOverride();
                onClose();
              }
            }}
          >
            変更を消す
          </button>
        )}
        {isCustom && (
          <button type="button" className="btn ghost danger-text" onClick={onDeleteCustom}>
            カスタム削除
          </button>
        )}
      </div>
    </div>
  );
}

function HomePanel({ state }: { state: AppState }) {
  const ed = state.editor;
  const h = ed.editor.homeOverrides;
  const [headline, setHeadline] = useState(h.headline ?? homeSeed.headline ?? '式は切る。届出は出す。現金は会社規程とNISA二人枠だけ見ろ。');
  const [banner, setBanner] = useState(h.anti_lie_banner ?? homeSeed.anti_lie_banner);
  const [kicker, setKicker] = useState(h.kicker ?? '');

  return (
    <div className="edit-panel">
      <div className="edit-form card-soft">
        <p className="muted micro">空欄のキッカーはデータ年の既定文言に戻ります。</p>
        <label className="edit-label">
          ヒーロー見出し
          <input value={headline} onChange={(e) => setHeadline(e.target.value)} />
        </label>
        <label className="edit-label">
          キッカー（任意）
          <input
            value={kicker}
            onChange={(e) => setKicker(e.target.value)}
            placeholder="例：今日の一手 · 私たち版"
          />
        </label>
        <label className="edit-label">
          アンチウソ・バナー
          <textarea rows={3} value={banner} onChange={(e) => setBanner(e.target.value)} />
        </label>
        <div className="edit-form-actions">
          <button
            type="button"
            className="btn primary"
            onClick={() =>
              ed.setHomeOverrides({
                headline: headline.trim() || undefined,
                anti_lie_banner: banner.trim() || undefined,
                kicker: kicker.trim() || undefined,
              })
            }
          >
            保存
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              ed.setHomeOverrides({
                headline: undefined,
                anti_lie_banner: undefined,
                kicker: undefined,
              });
              setHeadline(homeSeed.headline ?? '式は切る。届出は出す。現金は会社規程とNISA二人枠だけ見ろ。');
              setBanner(homeSeed.anti_lie_banner);
              setKicker('');
            }}
          >
            シードに戻す
          </button>
        </div>
      </div>
    </div>
  );
}

function WishPanel({ state }: { state: AppState }) {
  const ed = state.editor;
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');

  return (
    <div className="edit-panel">
      <div className="edit-form card-soft">
        <label className="edit-label">
          タイトル
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例：会社規程のPDFを両方そろえる"
          />
        </label>
        <label className="edit-label">
          メモ
          <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <button
          type="button"
          className="btn primary"
          onClick={() => {
            if (!title.trim()) return;
            const item = ed.newWish();
            ed.upsertWish({ ...item, title: title.trim(), note: note.trim() });
            setTitle('');
            setNote('');
          }}
        >
          追加
        </button>
      </div>
      {ed.editor.wishlist.length === 0 ? (
        <div className="empty card-soft">やりたいことがまだありません。</div>
      ) : (
        ed.editor.wishlist.map((w) => (
          <article key={w.id} className="wish-card card-soft">
            <div className="wish-head">
              <strong>{w.title}</strong>
              <select
                value={w.status}
                onChange={(e) =>
                  ed.setWishStatus(w.id, e.target.value as 'idea' | 'doing' | 'done')
                }
                aria-label="状態"
              >
                <option value="idea">idea</option>
                <option value="doing">doing</option>
                <option value="done">done</option>
              </select>
            </div>
            {w.note && <p className="muted micro">{w.note}</p>}
            <button
              type="button"
              className="btn ghost danger-text"
              onClick={() => {
                if (confirm('削除しますか？')) ed.deleteWish(w.id);
              }}
            >
              削除
            </button>
          </article>
        ))
      )}
    </div>
  );
}

function BackupPanel({ state }: { state: AppState }) {
  const ed = state.editor;
  const [pin, setPin] = useState(ed.editor.pin);

  return (
    <div className="edit-panel">
      <div className="edit-form card-soft">
        <h2>バックアップ</h2>
        <p className="muted micro">編集データ一式（規程・スタンプ変更・ホーム・やりたいこと）をJSONで書き出し／読み込み。</p>
        <div className="edit-form-actions">
          <button type="button" className="btn primary" onClick={() => ed.exportJson()}>
            ダウンロード
          </button>
          <label className="btn ghost file-btn">
            読み込む
            <input
              type="file"
              accept="application/json,.json"
              hidden
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (!file) return;
                try {
                  const text = await file.text();
                  const json = JSON.parse(text) as unknown;
                  const mode = confirm(
                    'OK＝マージ（足す）／キャンセル＝置き換え（全部入れ替え）',
                  )
                    ? 'merge'
                    : 'replace';
                  if (mode === 'replace' && !confirm('本当に置き換えますか？今の編集は上書きされます。'))
                    return;
                  ed.importJson(json, mode);
                  alert('読み込みました');
                } catch {
                  alert('JSONを読めませんでした');
                }
              }}
            />
          </label>
        </div>
        <button
          type="button"
          className="btn ghost danger-text"
          onClick={() => {
            if (confirm('編集レイヤーをすべて消してシードに戻しますか？（進捗スタンプは残ります）')) {
              if (confirm('最終確認：編集データをリセットします。')) ed.resetToSeed();
            }
          }}
        >
          編集をシードにリセット
        </button>
      </div>

      <div className="edit-form card-soft">
        <h2>かんたんPIN（任意）</h2>
        <p className="muted micro">4桁。空欄＝ロックなし。端末内のみ。</p>
        <label className="edit-label">
          PIN
          <input
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="未設定"
          />
        </label>
        <button type="button" className="btn primary" onClick={() => ed.setPin(pin)}>
          PINを保存
        </button>
      </div>
    </div>
  );
}
