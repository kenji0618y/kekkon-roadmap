import {useMemo,useState,type Dispatch,type SetStateAction} from 'react';
import {ArrowUpRight,BookOpen,Handshake,MessageSquareQuote,ShieldCheck,Sparkles} from 'lucide-react';
import {agreements,practices,practiceThemes,refById,talks,type Practice,type Ref,type Talk,type Agreement} from '../data/catalog';
import type {AgreementRecord,Book,PracticeRecord} from '../lib/model';
import {Textarea} from './ui/textarea';
import {Input} from './ui/input';
import {Label} from './ui/label';
import {Action} from './book-controls';
import {TalkStartersPanel} from './SeedContentPanels';

const STATUS: {id: PracticeRecord['status']; label: string}[] = [
  {id: 'none', label: 'まだ'},
  {id: 'try', label: '試したい'},
  {id: 'doing', label: '試している'},
  {id: 'kept', label: '続いている'},
];

const EMPTY_PRACTICE: PracticeRecord = {status: 'none', note: ''};
const EMPTY_AGREEMENT: AgreementRecord = {mine: '', theirs: '', agreed: '', review: ''};

/** Round-robin art for practice themes (reuse journey phase images). */
const THEME_ART = [
  'phases/gen-filing.png',
  'phases/lux-cohabit.png',
  'phases/gen-money-family.png',
  'phases/lux-home.png',
  'phases/gen-pregnant.png',
  'phases/lux-birth.png',
  'phases/rm-company.png',
  'phases/phase1-prep.png',
  'phases/gen-daycare.png',
  'phases/lux-money.png',
  'phases/phase6-home.png',
  'phases/rm-namechange.png',
  'phases/gen-stamp-board.png',
  'phases/phase7-hedge.png',
];

const TALK_ART = 'phases/gen-stamp-grid.png';
const AGREE_ART = 'phases/lux-filing.png';

const FILL_ORDER = [3, 2, 0, 1, 4, 5, 6, 7, 8, 9, 10, 11];
const MAX_PADS = 12;

function cornerSlot(count: number, index: number) {
  const n = Math.min(Math.max(count, 1), MAX_PADS);
  return FILL_ORDER.slice(0, n)[index] ?? index;
}

function padShort(text: string) {
  const t = text.replace(/[。．、，「」『』（）()]/g, '').trim();
  return t.length > 6 ? `${t.slice(0, 6)}` : t;
}

function practicePadClass(status: PracticeRecord['status'] | undefined) {
  if (status === 'kept') return 'st-done';
  if (status === 'doing') return 'st-progress';
  if (status === 'try') return 'st-checked';
  return 'st-todo';
}

function practicePadMark(status: PracticeRecord['status'] | undefined) {
  if (status === 'kept') return '続';
  if (status === 'doing') return '試';
  if (status === 'try') return '気';
  return '';
}

function chunkPads<T>(items: T[], max = MAX_PADS): T[][] {
  if (!items.length) return [];
  if (items.length <= max) return [items];
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += max) out.push(items.slice(i, i + max));
  return out;
}

function themeImage(themeIndex: number) {
  return `/${THEME_ART[themeIndex % THEME_ART.length]}`;
}

function RefChips({ids}: {ids: string[]}) {
  const list = ids.map((id) => refById[id]).filter(Boolean) as Ref[];
  if (!list.length) return null;
  return (
    <span className="pair-refs">
      {list.map((r) => (
        <a key={r.id} href={r.url} target="_blank" rel="noopener noreferrer" title={`${r.kind}／${r.by}`}>
          {r.kind}
          <ArrowUpRight size={11} aria-hidden />
        </a>
      ))}
    </span>
  );
}

export type PairWorkbookProps = {
  book: Book;
  busy: boolean;
  onSavePractice: (id: string, record: PracticeRecord) => void;
  onSaveAgreement: (id: string, record: AgreementRecord) => void;
};

export function PairWorkbook({book, busy, onSavePractice, onSaveAgreement}: PairWorkbookProps) {
  const [draft, setDraft] = useState<Record<string, AgreementRecord>>({});
  const [openPractice, setOpenPractice] = useState('');
  const [openTalk, setOpenTalk] = useState('');
  const [openAgree, setOpenAgree] = useState('');

  const chosen = useMemo(
    () => practices.filter((p) => {
      const st = book.practices[p.id]?.status;
      return st === 'try' || st === 'doing' || st === 'kept';
    }),
    [book.practices],
  );
  const agreedCount = agreements.filter((a) => (book.agreements[a.id]?.agreed || '').trim()).length;

  const recordOf = (id: string) => book.agreements[id] || EMPTY_AGREEMENT;
  const draftOf = (id: string) => draft[id] || recordOf(id);
  const edit = (id: string, patch: Partial<AgreementRecord>) =>
    setDraft((d) => ({...d, [id]: {...draftOf(id), ...patch}}));
  const dirty = (id: string) => {
    const a = draftOf(id), b = recordOf(id);
    return a.mine !== b.mine || a.theirs !== b.theirs || a.agreed !== b.agreed || a.review !== b.review;
  };

  const openPracticeObj = practices.find((p) => p.id === openPractice);
  const openTalkObj = talks.find((t) => t.id === openTalk);
  const openAgreeObj = agreements.find((a) => a.id === openAgree);

  return (
    <div className="pair-book">
      <section className="paper-card pair-summary" aria-label="選んだもののまとめ">
        <p className="hint" style={{margin: 0}}>
          いま選んでいる行動は <strong>{chosen.length}</strong> 個、合意を書いた話題は <strong>{agreedCount}</strong> 件です。点数ではありません。
        </p>
        {chosen.length > 0 && (
          <ul className="pair-chosen-list">
            {chosen.slice(0, 8).map((p) => {
              const st = book.practices[p.id]?.status || 'none';
              const label = STATUS.find((s) => s.id === st)?.label || '';
              return <li key={p.id}><span>{label}</span>{p.idea}</li>;
            })}
            {chosen.length > 8 && <li className="hint">ほか {chosen.length - 8} 個</li>}
          </ul>
        )}
      </section>

      <details className="paper-card pair-intro pair-intro-fold">
        <summary>
          <strong>使い方（閉じておいて大丈夫）</strong>
          <span className="hint">相手の採点表ではありません</span>
        </summary>
        <h2>相手の採点表ではありません。</h2>
        <p>
          気になる行動を各自が選んで、無理のない範囲で試してみて、合わなければやめる。
          それだけの表です。全部やる必要はありませんし、選んだ数は二人の点数でもありません。
        </p>
        <ol className="pair-steps">
          <li><strong>別々に選ぶ</strong>「考え方と行動」から、各自が気になるものを選びます。まずは1〜3個から。</li>
          <li><strong>一緒に決める</strong>相手への要求だけでなく、自分が試したいことも話します。</li>
          <li><strong>具体的にする</strong>いつ・誰が・どの場面でやるかを決めます。</li>
          <li><strong>確かめて変える</strong>合わなければ、やめる・小さくする・別の方法を試す。</li>
        </ol>
      </details>

      <section className="paper-card pair-safety" role="note">
        <ShieldCheck size={19} aria-hidden />
        <div>
          <strong>安心して断れることが先です。</strong>
          <p>
            触れ合いや性的なことは、夫婦でもその都度の気持ちが尊重されます。
            怖くて断れない、暴力や威圧があるというときは、この表で二人の話し合いを無理に進めないでください。
            一人でも相談できる窓口があります。
          </p>
          <span className="pair-refs">
            <a href={refById.R16?.url} target="_blank" rel="noopener noreferrer">内閣府：DV相談<ArrowUpRight size={11} aria-hidden /></a>
            <a href={refById.R15?.url} target="_blank" rel="noopener noreferrer">内閣府：性犯罪・性暴力<ArrowUpRight size={11} aria-hidden /></a>
          </span>
        </div>
      </section>

      <div className="section-heading pair-heading">
        <div>
          <p className="eyebrow">スタンプで選ぶ</p>
          <h2>試してみる行動</h2>
          <p className="hint">テーマごとにスタンプ台。気になるマスを押すと下に詳しく出ます（全{practices.length}項目）。</p>
        </div>
      </div>

      <div className="pair-stamp stamp-rally" role="list">
        {practiceThemes.map((theme, themeIdx) => {
          const items = practices.filter((p) => p.theme === theme);
          const chunks = chunkPads(items);
          const image = themeImage(themeIdx);
          return chunks.map((chunk, partIdx) => {
            const partTotal = chunks.length;
            const caption = partTotal > 1 ? `${theme} ${partIdx + 1}/${partTotal}` : theme;
            const checked = chunk.filter((p) => {
              const s = book.practices[p.id]?.status;
              return s === 'try' || s === 'doing' || s === 'kept';
            }).length;
            const cardKey = partTotal > 1 ? `${theme}__p${partIdx}` : theme;
            const openHere = chunk.some((p) => p.id === openPractice);
            return (
              <article key={cardKey} role="listitem" className={`illust-square pair-stamp-card${openHere ? ' selected' : ''}`}>
                <div className="illust-frame">
                  <img className="illust-art" src={image} alt="" loading="lazy" decoding="async" />
                  <div className={`illust-pads${chunk.length > 6 ? ' pads-dense' : ''}`} role="group" aria-label={`${caption}のスタンプ台`}>
                    {chunk.map((p, idx) => {
                      const st = book.practices[p.id]?.status || 'none';
                      const active = openPractice === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          className={`stamp-pad corner c${cornerSlot(chunk.length, idx)} ${practicePadClass(st)}${active ? ' pair-pad-active' : ''}`}
                          onClick={() => setOpenPractice((cur) => (cur === p.id ? '' : p.id))}
                          aria-pressed={active}
                          aria-label={`${p.idea}（${STATUS.find((s) => s.id === st)?.label || 'まだ'}）`}
                          title={p.idea}
                        >
                          <span className="stamp-pad-mark">{practicePadMark(st)}</span>
                          <span className="stamp-pad-label">{padShort(p.idea)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="illust-caption pair-stamp-caption">
                  <span className="illust-no">{String(themeIdx + 1).padStart(2, '0')}</span>
                  <span className="illust-caption-text">
                    <strong>{caption}</strong>
                    <span className="illust-sub">{chunk.length}マス</span>
                  </span>
                  <span className="illust-progress">{checked}/{chunk.length}</span>
                </div>
                {openHere && openPracticeObj ? (
                  <PracticeDetail
                    practice={openPracticeObj}
                    rec={book.practices[openPracticeObj.id] || EMPTY_PRACTICE}
                    busy={busy}
                    onSave={onSavePractice}
                    onClose={() => setOpenPractice('')}
                  />
                ) : null}
              </article>
            );
          });
        })}
      </div>

      <div className="pair-stamp-section">
        <TalkStartersPanel />
      </div>

      <div className="section-heading pair-heading">
        <div>
          <p className="eyebrow">言い方の下書き</p>
          <h2>言葉にしにくい場面</h2>
          <p className="hint">{talks.length}場面。スタンプを押すと下書きが出ます。</p>
        </div>
      </div>
      <TalkStampBoard
        items={talks}
        openId={openTalk}
        onToggle={(id) => setOpenTalk((cur) => (cur === id ? '' : id))}
        openObj={openTalkObj}
      />

      <div className="section-heading pair-heading">
        <div>
          <p className="eyebrow">二人の合意</p>
          <h2>話題ごとに書く</h2>
          <p className="hint">{agreements.length}の話題。スタンプから開いて、合意できたところだけ残します。</p>
        </div>
      </div>
      <AgreeStampBoard
        items={agreements}
        book={book}
        openId={openAgree}
        onToggle={(id) => setOpenAgree((cur) => (cur === id ? '' : id))}
        openObj={openAgreeObj}
        draftOf={draftOf}
        edit={edit}
        dirty={dirty}
        busy={busy}
        onSaveAgreement={onSaveAgreement}
        setDraft={setDraft}
      />

      <details className="paper-card pair-refs-card">
        <summary>
          <strong><BookOpen size={16} aria-hidden /> 根拠の読み方</strong>
          <span className="hint">閉じたまま使えます</span>
        </summary>
        <p>
          研究で分かったことと、専門家がすすめていることは別のものです。ここでは分けて書いてあります。
          研究の多くは海外のもので、日本の共働き夫婦でこの表全体の効果が確かめられたわけではありません。
          どれだけ幸せになるか、離婚の確率がどう変わるか、最適な回数は何回かは、出せないので書いていません。
        </p>
        <ul className="pair-ref-list">
          {Object.values(refById).map((r) => (
            <li key={r.id}>
              <span className="pair-ref-kind">{r.kind}</span>
              <div>
                <a href={r.url} target="_blank" rel="noopener noreferrer">{r.title}<ArrowUpRight size={12} aria-hidden /></a>
                <small>{r.by}</small>
                <p>{r.summary}</p>
                <p className="pair-ref-limit">{r.limits}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="hint">
          確認日 2026年9月10日。学術誌のページは自動チェックでは開けないことがありますが、ブラウザからは読めます。
          日本語版の有無、図書館の所蔵、価格は確認していません。
        </p>
      </details>
    </div>
  );
}

function PracticeDetail({
  practice,
  rec,
  busy,
  onSave,
  onClose,
}: {
  practice: Practice;
  rec: PracticeRecord;
  busy: boolean;
  onSave: (id: string, record: PracticeRecord) => void;
  onClose: () => void;
}) {
  return (
    <div className="pair-stamp-detail paper-card">
      <div className="pair-stamp-detail-head">
        <span className="pair-theme">{practice.theme}</span>
        <button type="button" className="text-button" onClick={onClose}>閉じる</button>
      </div>
      <strong className="pair-stamp-detail-title">{practice.idea}</strong>
      <div className="pair-card-top">
        <RefChips ids={practice.refs} />
      </div>
      <p className="pair-action">{practice.action}</p>
      <p className="pair-when"><Sparkles size={13} aria-hidden />{practice.when}</p>
      <p className="pair-caution">{practice.caution}</p>
      <div className="pair-status" role="group" aria-label={`${practice.idea} の状態`}>
        {STATUS.map((s) => (
          <button
            key={s.id}
            type="button"
            disabled={busy}
            className={rec.status === s.id ? 'active' : ''}
            aria-pressed={rec.status === s.id}
            onClick={() => onSave(practice.id, {...rec, status: s.id})}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function TalkStampBoard({
  items,
  openId,
  onToggle,
  openObj,
}: {
  items: Talk[];
  openId: string;
  onToggle: (id: string) => void;
  openObj: Talk | undefined;
}) {
  const chunks = chunkPads(items);
  return (
    <div className="pair-stamp stamp-rally" role="list">
      {chunks.map((chunk, partIdx) => {
        const partTotal = chunks.length;
        const caption = partTotal > 1 ? `場面 ${partIdx + 1}/${partTotal}` : '言葉の場面';
        const openHere = chunk.some((t) => t.id === openId);
        return (
          <article key={`talk-${partIdx}`} role="listitem" className={`illust-square pair-stamp-card${openHere ? ' selected' : ''}`}>
            <div className="illust-frame">
              <img className="illust-art" src={`/${TALK_ART}`} alt="" loading="lazy" decoding="async" />
              <div className={`illust-pads${chunk.length > 6 ? ' pads-dense' : ''}`} role="group" aria-label={`${caption}のスタンプ台`}>
                {chunk.map((t, idx) => {
                  const active = openId === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      className={`stamp-pad corner c${cornerSlot(chunk.length, idx)} ${active ? 'st-checked pair-pad-active' : 'st-todo'}`}
                      onClick={() => onToggle(t.id)}
                      aria-pressed={active}
                      aria-label={t.scene}
                      title={t.scene}
                    >
                      <span className="stamp-pad-mark"><MessageSquareQuote size={12} aria-hidden /></span>
                      <span className="stamp-pad-label">{padShort(t.scene)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="illust-caption pair-stamp-caption">
              <span className="illust-no">話</span>
              <span className="illust-caption-text"><strong>{caption}</strong></span>
              <span className="illust-progress">{chunk.length}</span>
            </div>
            {openHere && openObj ? (
              <div className="pair-stamp-detail paper-card">
                <div className="pair-stamp-detail-head">
                  <strong>{openObj.scene}</strong>
                  <button type="button" className="text-button" onClick={() => onToggle(openObj.id)}>閉じる</button>
                </div>
                <div className="pair-talk-body">
                  <p className="pair-say"><span>話す</span>{openObj.say}</p>
                  <p className="pair-listen"><span>聞く</span>{openObj.listen}</p>
                  <p className="pair-next"><strong>次に決める小さなこと</strong>{openObj.next}</p>
                  <p className="pair-caution">{openObj.caution}</p>
                  <RefChips ids={openObj.refs} />
                </div>
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

function AgreeStampBoard({
  items,
  book,
  openId,
  onToggle,
  openObj,
  draftOf,
  edit,
  dirty,
  busy,
  onSaveAgreement,
  setDraft,
}: {
  items: Agreement[];
  book: Book;
  openId: string;
  onToggle: (id: string) => void;
  openObj: Agreement | undefined;
  draftOf: (id: string) => AgreementRecord;
  edit: (id: string, patch: Partial<AgreementRecord>) => void;
  dirty: (id: string) => boolean;
  busy: boolean;
  onSaveAgreement: (id: string, record: AgreementRecord) => void;
  setDraft: Dispatch<SetStateAction<Record<string, AgreementRecord>>>;
}) {
  const chunks = chunkPads(items);
  return (
    <div className="pair-stamp stamp-rally" role="list">
      {chunks.map((chunk, partIdx) => {
        const partTotal = chunks.length;
        const caption = partTotal > 1 ? `合意 ${partIdx + 1}/${partTotal}` : '二人の合意';
        const openHere = chunk.some((a) => a.id === openId);
        const doneCount = chunk.filter((a) => (book.agreements[a.id]?.agreed || '').trim()).length;
        return (
          <article key={`agree-${partIdx}`} role="listitem" className={`illust-square pair-stamp-card${openHere ? ' selected' : ''}`}>
            <div className="illust-frame">
              <img className="illust-art" src={`/${AGREE_ART}`} alt="" loading="lazy" decoding="async" />
              <div className={`illust-pads${chunk.length > 6 ? ' pads-dense' : ''}`} role="group" aria-label={`${caption}のスタンプ台`}>
                {chunk.map((a, idx) => {
                  const done = !!(book.agreements[a.id]?.agreed || '').trim();
                  const active = openId === a.id;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      className={`stamp-pad corner c${cornerSlot(chunk.length, idx)} ${done ? 'st-done' : active ? 'st-checked pair-pad-active' : 'st-todo'}`}
                      onClick={() => onToggle(a.id)}
                      aria-pressed={active}
                      aria-label={a.topic}
                      title={a.topic}
                    >
                      <span className="stamp-pad-mark">{done ? '合' : <Handshake size={12} aria-hidden />}</span>
                      <span className="stamp-pad-label">{padShort(a.topic)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="illust-caption pair-stamp-caption">
              <span className="illust-no">合</span>
              <span className="illust-caption-text"><strong>{caption}</strong></span>
              <span className="illust-progress">{doneCount}/{chunk.length}</span>
            </div>
            {openHere && openObj ? (() => {
              const d = draftOf(openObj.id);
              return (
                <div className="pair-stamp-detail paper-card">
                  <div className="pair-stamp-detail-head">
                    <strong>{openObj.topic}</strong>
                    <button type="button" className="text-button" onClick={() => onToggle(openObj.id)}>閉じる</button>
                  </div>
                  <div className="pair-agree-body">
                    <p className="pair-question">{openObj.question}</p>
                    <div className="field">
                      <Label htmlFor={`mine-${openObj.id}`}>一人目の希望</Label>
                      <Textarea id={`mine-${openObj.id}`} rows={2} maxLength={2000} value={d.mine} onChange={(e) => edit(openObj.id, {mine: e.target.value})} />
                    </div>
                    <div className="field">
                      <Label htmlFor={`theirs-${openObj.id}`}>二人目の希望</Label>
                      <Textarea id={`theirs-${openObj.id}`} rows={2} maxLength={2000} value={d.theirs} onChange={(e) => edit(openObj.id, {theirs: e.target.value})} />
                    </div>
                    <div className="field">
                      <Label htmlFor={`agreed-${openObj.id}`}>二人の合意・担当</Label>
                      <Textarea id={`agreed-${openObj.id}`} rows={2} maxLength={2000} value={d.agreed} onChange={(e) => edit(openObj.id, {agreed: e.target.value})} />
                    </div>
                    <div className="field">
                      <Label htmlFor={`review-${openObj.id}`}>見直す日</Label>
                      <Input id={`review-${openObj.id}`} type="date" value={d.review} onChange={(e) => edit(openObj.id, {review: e.target.value})} />
                    </div>
                    <RefChips ids={openObj.refs} />
                    <div className="pair-agree-actions">
                      <Action
                        disabled={busy || !dirty(openObj.id)}
                        onClick={() => {
                          onSaveAgreement(openObj.id, d);
                          setDraft((x) => {
                            const next = {...x};
                            delete next[openObj.id];
                            return next;
                          });
                        }}
                      >
                        この話題を保存する
                      </Action>
                      {dirty(openObj.id) && (
                        <button type="button" className="text-button" onClick={() => setDraft((x) => {
                          const next = {...x};
                          delete next[openObj.id];
                          return next;
                        })}>
                          書きかけを戻す
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })() : null}
          </article>
        );
      })}
    </div>
  );
}
