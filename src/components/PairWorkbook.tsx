import {useMemo,useState,type Dispatch,type SetStateAction} from 'react';
import {ArrowUpRight,BookOpen,ShieldCheck,Sparkles} from 'lucide-react';
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

/** UI-only short labels (2–8字). Seed には pad を足さない。 */
const PRACTICE_PAD: Record<string, string> = {
  A01: '行動感謝', A02: '尊重を表す', A03: 'ほめ方', A04: '感謝と改善',
  A05: '呼びかけ', A06: '相手の世界', A07: '助け方', A08: '理解確認', A09: '嬉しい話', A10: '話しやすさ',
  A11: '新体験', A12: '楽しさ好み', A13: '気軽な楽しみ', A14: '感想を聞く',
  A15: '個人の目標', A16: '外のつながり', A17: '希望の変化',
  A18: '出来事扱い', A19: '気持ち具体', A20: '話題をしぼる',
  A21: '一旦休止', A22: '落ち着く', A23: '疲労も条件', A24: '自分も直す',
  A25: '具体的に謝る', A26: '感じたこと', A27: '離れて考える', A28: '次の行動',
  A29: '目的と方法', A30: '小さな案',
  A31: '見えない家事', A32: '担当の範囲', A33: '完了基準', A34: '予定の負担',
  A35: 'お金の希望', A36: '収入差', A37: '仕事の変化', A38: '支え合い',
  A39: '親族の支援', A40: '付き合い方', A41: '共有の範囲',
  A42: 'その都度', A43: '断れる関係', A44: '愛情の型',
  A45: '親になる前', A46: '産後の備え', A47: '育児段取り', A48: '小さな関心', A49: '希望と同意',
  A50: '手順を変える', A51: '支援を使う', A52: '安全に話す',
};
const TALK_PAD: Record<string, string> = {
  C01: '小さな感謝', C02: '嬉しい話', C03: '疲れた相手', C04: '家事の不満',
  C05: '段取り負担', C06: '声が大きく', C07: '言いすぎた後', C08: '受け止め方',
  C09: '休日の希望', C10: 'お金の使い方', C11: '一人の時間', C12: '親族の訪問',
  C13: '性の希望', C14: '産後の余裕', C15: '同じ不満', C16: '相談を利用',
};
const AGREE_PAD: Record<string, string> = {
  G01: '大切なし', G02: '短い会話', G03: '楽しい時間', G04: '一人の時間',
  G05: '食事・買物', G06: '掃除・洗濯', G07: '予定手続き', G08: '忙しい日',
  G09: '生活費', G10: '働き方変化', G11: 'けんか休止', G12: '仲直り',
  G13: '親族・帰省', G14: '写真・SNS', G15: '親密さ', G16: '妊娠・育児',
  G17: '産後の分担', G18: '頼る先',
};

/** Fallback: strip punctuation, prefer 2–8 graphemes (UI-only). */
function padShort(text: string, max = 8) {
  const t = text.replace(/[。．、，「」『』（）()\s：:]/g, '').trim();
  const chars = [...t];
  if (chars.length <= max) return t || '…';
  return chars.slice(0, max).join('');
}

function practicePadLabel(p: Practice) {
  return PRACTICE_PAD[p.id] || padShort(p.idea);
}
function talkPadLabel(t: Talk) {
  return TALK_PAD[t.id] || padShort(t.scene);
}
function agreePadLabel(a: Agreement) {
  return AGREE_PAD[a.id] || padShort(a.topic);
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
  // Relative to Vite base `./` (GitHub Pages /kekkon-roadmap/). Leading `/` 404s.
  return THEME_ART[themeIndex % THEME_ART.length];
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
            <nav className="pair-mini-nav" aria-label="ふたりタブ内の節">
        <a href="#pair-stamp-practices">行動</a>
        <a href="#pair-stamp-talks">会話</a>
        <a href="#pair-stamp-agreements">合意</a>
        <a href="#pair-talk-starters">きっかけ</a>
      </nav>
      <details className="paper-card pair-top-fold">
        <summary><strong>使い方・安全・いまの選び</strong><span className="hint">スタンプから始めて大丈夫</span></summary>
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

            </details>

<div className="section-heading pair-heading" id="pair-stamp-practices">
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
            const keptAll = chunk.length > 0 && chunk.every((p) => book.practices[p.id]?.status === 'kept');
            const cardKey = partTotal > 1 ? `${theme}__p${partIdx}` : theme;
            const openHere = chunk.some((p) => p.id === openPractice);
            return (
              <article key={cardKey} role="listitem" className={`illust-square pair-stamp-card${openHere ? ' selected' : ''}${keptAll ? ' complete' : ''}`}>
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
                          <span className="stamp-pad-label">{practicePadLabel(p)}</span>
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
                    key={openPracticeObj.id}
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

      <section className="pair-stamp-section pair-talk-starters" aria-label="制度の話のきっかけ">
        <div className="section-heading pair-heading" id="pair-talk-starters">
          <div>
            <p className="eyebrow">話すきっかけ</p>
            <h2>制度の話の糸口</h2>
            <p className="hint">届出・お金・暮らしの前提を、そのまま読んでもよい文。閉じておいて大丈夫です。</p>
          </div>
        </div>
        <TalkStartersPanel />
      </section>

      <div className="section-heading pair-heading" id="pair-stamp-talks">
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
  const [note, setNote] = useState(rec.note || '');
  const noteDirty = note !== (rec.note || '');
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
      <div className="pair-status pair-status-lg" role="group" aria-label={`${practice.idea} の状態`}>
        {STATUS.map((s) => (
          <button
            key={s.id}
            type="button"
            disabled={busy}
            className={rec.status === s.id ? 'active' : ''}
            aria-pressed={rec.status === s.id}
            onClick={() => onSave(practice.id, {...rec, status: s.id, note})}
          >
            {s.label}
          </button>
        ))}
      </div>
      <div className="field pair-note-field">
        <Label htmlFor={`practice-note-${practice.id}`}>メモ（任意）</Label>
        <Textarea
          id={`practice-note-${practice.id}`}
          rows={2}
          maxLength={1000}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="試したこと・合わなかったことなど"
        />
      </div>
      <div className="pair-agree-actions">
        <Action
          disabled={busy || !noteDirty}
          onClick={() => onSave(practice.id, {...rec, note})}
        >
          メモを保存する
        </Action>
        {noteDirty && (
          <button type="button" className="text-button" onClick={() => setNote(rec.note || '')}>
            書きかけを戻す
          </button>
        )}
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
              <img className="illust-art" src={TALK_ART} alt="" loading="lazy" decoding="async" />
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
                      <span className="stamp-pad-mark">話</span>
                      <span className="stamp-pad-label">{talkPadLabel(t)}</span>
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
        const allDone = chunk.length > 0 && doneCount === chunk.length;
        return (
          <article key={`agree-${partIdx}`} role="listitem" className={`illust-square pair-stamp-card${openHere ? ' selected' : ''}${allDone ? ' complete' : ''}`}>
            <div className="illust-frame">
              <img className="illust-art" src={AGREE_ART} alt="" loading="lazy" decoding="async" />
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
                      <span className="stamp-pad-mark">{done ? '合' : '題'}</span>
                      <span className="stamp-pad-label">{agreePadLabel(a)}</span>
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
