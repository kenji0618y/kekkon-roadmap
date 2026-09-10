import {useMemo,useState} from 'react';
import {ArrowUpRight,BookOpen,Handshake,MessageSquareQuote,ShieldCheck,Sparkles} from 'lucide-react';
import {agreements,practices,practiceThemes,refById,talks,type Ref} from '../data/catalog';
import type {AgreementRecord,Book,PracticeRecord} from '../lib/model';
import {Accordion,AccordionContent,AccordionItem,AccordionTrigger} from './ui/accordion';
import {Textarea} from './ui/textarea';
import {Input} from './ui/input';
import {Label} from './ui/label';
import {Action} from './book-controls';

const STATUS: {id: PracticeRecord['status']; label: string}[] = [
  {id: 'none', label: 'まだ'},
  {id: 'try', label: '試したい'},
  {id: 'doing', label: '試している'},
  {id: 'kept', label: '続いている'},
];

const EMPTY_PRACTICE: PracticeRecord = {status: 'none', note: ''};
const EMPTY_AGREEMENT: AgreementRecord = {mine: '', theirs: '', agreed: '', review: ''};

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
  const [theme, setTheme] = useState('all');
  const [draft, setDraft] = useState<Record<string, AgreementRecord>>({});

  const chosen = useMemo(
    () => practices.filter((p) => {
      const st = book.practices[p.id]?.status;
      return st === 'try' || st === 'doing' || st === 'kept';
    }),
    [book.practices],
  );
  const shown = theme === 'all' ? practices : practices.filter((p) => p.theme === theme);
  const agreedCount = agreements.filter((a) => (book.agreements[a.id]?.agreed || '').trim()).length;

  const recordOf = (id: string) => book.agreements[id] || EMPTY_AGREEMENT;
  const draftOf = (id: string) => draft[id] || recordOf(id);
  const edit = (id: string, patch: Partial<AgreementRecord>) =>
    setDraft((d) => ({...d, [id]: {...draftOf(id), ...patch}}));
  const dirty = (id: string) => {
    const a = draftOf(id), b = recordOf(id);
    return a.mine !== b.mine || a.theirs !== b.theirs || a.agreed !== b.agreed || a.review !== b.review;
  };

  return (
    <div className="pair-book">
      <section className="paper-card pair-intro">
        <span className="eyebrow">HOW TO USE</span>
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
        <p className="hint">
          いま選んでいるのは {chosen.length} 個、合意を書いた話題は {agreedCount} 件です。
          これは操作の目安で、うまくいっているかどうかの点数ではありません。
        </p>
      </section>

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
          <p className="eyebrow">THINGS TO TRY</p>
          <h2>考え方と、試してみる行動</h2>
          <p className="hint">{practices.length}項目。気になるものだけ選んでください。</p>
        </div>
      </div>
      <div className="filter-pills pair-themes" role="group" aria-label="テーマで絞る">
        <button className={theme === 'all' ? 'active' : ''} aria-pressed={theme === 'all'} onClick={() => setTheme('all')}>
          すべて
        </button>
        {practiceThemes.map((t) => (
          <button key={t} className={theme === t ? 'active' : ''} aria-pressed={theme === t} onClick={() => setTheme(t)}>
            {t}
          </button>
        ))}
      </div>

      <div className="pair-grid">
        {shown.map((p) => {
          const rec = book.practices[p.id] || EMPTY_PRACTICE;
          return (
            <article key={p.id} className={`pair-card st-${rec.status}`}>
              <div className="pair-card-top">
                <span className="pair-theme">{p.theme}</span>
                <RefChips ids={p.refs} />
              </div>
              <strong>{p.idea}</strong>
              <p className="pair-action">{p.action}</p>
              <p className="pair-when"><Sparkles size={13} aria-hidden />{p.when}</p>
              <p className="pair-caution">{p.caution}</p>
              <div className="pair-status" role="group" aria-label={`${p.idea} の状態`}>
                {STATUS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    disabled={busy}
                    className={rec.status === s.id ? 'active' : ''}
                    aria-pressed={rec.status === s.id}
                    onClick={() => onSavePractice(p.id, {...rec, status: s.id})}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </article>
          );
        })}
      </div>

      <div className="section-heading pair-heading">
        <div>
          <p className="eyebrow">WHAT TO SAY</p>
          <h2>言葉にしにくい場面の、言い方</h2>
          <p className="hint">{talks.length}場面。そのまま使う文ではなく、二人の言葉に変えるための下書きです。</p>
        </div>
      </div>
      <Accordion type="multiple" className="pair-talks">
        {talks.map((t) => (
          <AccordionItem key={t.id} value={t.id}>
            <AccordionTrigger>
              <span className="pair-talk-title"><MessageSquareQuote size={15} aria-hidden />{t.scene}</span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="pair-talk-body">
                <p className="pair-say"><span>話す</span>{t.say}</p>
                <p className="pair-listen"><span>聞く</span>{t.listen}</p>
                <p className="pair-next"><strong>次に決める小さなこと</strong>{t.next}</p>
                <p className="pair-caution">{t.caution}</p>
                <RefChips ids={t.refs} />
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <div className="section-heading pair-heading">
        <div>
          <p className="eyebrow">WHAT WE AGREED</p>
          <h2>二人の合意</h2>
          <p className="hint">{agreements.length}の話題。先にそれぞれの希望を書いて、合意できたところだけ残します。</p>
        </div>
      </div>
      <Accordion type="multiple" className="pair-agreements">
        {agreements.map((a) => {
          const d = draftOf(a.id);
          const saved = recordOf(a.id);
          const done = (saved.agreed || '').trim().length > 0;
          return (
            <AccordionItem key={a.id} value={a.id}>
              <AccordionTrigger>
                <span className="pair-agree-title">
                  <Handshake size={15} aria-hidden />
                  {a.topic}
                  {done && <em>合意ずみ</em>}
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="pair-agree-body">
                  <p className="pair-question">{a.question}</p>
                  <div className="field">
                    <Label htmlFor={`mine-${a.id}`}>一人目の希望</Label>
                    <Textarea id={`mine-${a.id}`} rows={2} maxLength={2000} value={d.mine} onChange={(e) => edit(a.id, {mine: e.target.value})} />
                  </div>
                  <div className="field">
                    <Label htmlFor={`theirs-${a.id}`}>二人目の希望</Label>
                    <Textarea id={`theirs-${a.id}`} rows={2} maxLength={2000} value={d.theirs} onChange={(e) => edit(a.id, {theirs: e.target.value})} />
                  </div>
                  <div className="field">
                    <Label htmlFor={`agreed-${a.id}`}>二人の合意・担当</Label>
                    <Textarea id={`agreed-${a.id}`} rows={2} maxLength={2000} value={d.agreed} onChange={(e) => edit(a.id, {agreed: e.target.value})} />
                  </div>
                  <div className="field">
                    <Label htmlFor={`review-${a.id}`}>見直す日</Label>
                    <Input id={`review-${a.id}`} type="date" value={d.review} onChange={(e) => edit(a.id, {review: e.target.value})} />
                  </div>
                  <RefChips ids={a.refs} />
                  <div className="pair-agree-actions">
                    <Action
                      disabled={busy || !dirty(a.id)}
                      onClick={() => {
                        onSaveAgreement(a.id, d);
                        setDraft((x) => {
                          const next = {...x};
                          delete next[a.id];
                          return next;
                        });
                      }}
                    >
                      この話題を保存する
                    </Action>
                    {dirty(a.id) && (
                      <button type="button" className="text-button" onClick={() => setDraft((x) => {
                        const next = {...x};
                        delete next[a.id];
                        return next;
                      })}>
                        書きかけを戻す
                      </button>
                    )}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      <section className="paper-card pair-refs-card">
        <span className="eyebrow">WHERE THIS COMES FROM</span>
        <h2><BookOpen size={19} aria-hidden />根拠の読み方</h2>
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
      </section>
    </div>
  );
}
