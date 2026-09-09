import {CalendarDays,ExternalLink,MessageCircle,AlertTriangle,Hash,Ban,Layers,ChevronRight} from 'lucide-react'
import {formatMoney,monthDay,shortDate,todayJapan,difference,deadlineText} from '../lib/dates'
import {absoluteDeadlines,relativeDeadlines,excludeItems,excludeMeta,homeContent,phasesContent} from '../data/catalog'

function branchVisible(branch: string | null | undefined, child: string, home: string) {
  if (!branch || branch === 'always') return true
  if (branch === 'child') return !['none'].includes(child) // show when unknown/someday/pregnant/born
  if (branch === 'buy') return home !== 'rent'
  return true
}

function seedMoneyLine(d: {
  money?: {amount_yen: number | null; unit?: string | null} | null
  money_in?: {amount_yen: number; unit?: string | null; note?: string} | null
  money_out?: {amount_yen: number; unit?: string | null; note?: string} | null
}): string | null {
  if (d.money && d.money.amount_yen != null) {
    const u = d.money.unit ? `（${d.money.unit}）` : ''
    return `${formatMoney(d.money.amount_yen)}円${u}`
  }
  if (d.money_in && d.money_in.amount_yen != null) {
    const u = d.money_in.unit ? `（${d.money_in.unit}）` : ''
    return `入：${formatMoney(d.money_in.amount_yen)}円${u}`
  }
  if (d.money_out && d.money_out.amount_yen != null) {
    const u = d.money_out.unit ? `（${d.money_out.unit}）` : ''
    const note = d.money_out.note ? ` · ${d.money_out.note}` : ''
    return `出：${formatMoney(d.money_out.amount_yen)}円${u}${note}`
  }
  return null
}

function DeadlineCard({
  d,
  today,
}: {
  d: (typeof absoluteDeadlines)[number]
  today: string
}) {
  const money = seedMoneyLine(d)
  const near = difference(d.date, today) <= 14
  return (
    <article className={`seed-deadline-card ${near ? 'near' : ''}`}>
      <div className="seed-deadline-when">
        <CalendarDays size={15} />
        <strong>{shortDate(d.date)}</strong>
        <span>{monthDay(d.date)}</span>
        <small>{deadlineText(d.date, today)}</small>
      </div>
      <h4>{d.title}</h4>
      {d.note && <p className="seed-note">{d.note}</p>}
      {money && <p className="seed-money">{money}</p>}
      {d.urls && d.urls.length > 0 && (
        <ul className="seed-urls">
          {d.urls.map((u) => (
            <li key={u}>
              <a href={u} target="_blank" rel="noreferrer">
                公式案内 <ExternalLink size={12} />
              </a>
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}

/** Upcoming / near / recently overdue stay visible; farther ones fold under 「すべて見る」. */
function isProminentDeadline(date: string, today: string) {
  const days = difference(date, today)
  return days <= 60 && days >= -30
}

export function InstitutionalDeadlines({child, home}: {child: string; home: string}) {
  const today = todayJapan()
  const abs = [...absoluteDeadlines]
    .filter((d) => branchVisible(d.branch, child, home))
    .sort((a, b) => a.date.localeCompare(b.date))
  const rel = relativeDeadlines.filter((d) => branchVisible(d.branch, child, home))
  const featured = abs.filter((d) => isProminentDeadline(d.date, today))
  const rest = abs.filter((d) => !isProminentDeadline(d.date, today))

  return (
    <section className="seed-block institutional-deadlines" aria-label="制度・カレンダー締切">
      <div className="seed-block-head">
        <span className="eyebrow">INSTITUTIONAL CALENDAR</span>
        <h3>制度・カレンダー締切</h3>
        <p className="hint">絶対日付の締切（シード基準）。円はシード記載のみ。公式URLで最新を確認。</p>
      </div>
      <div className="seed-deadline-list">
        {featured.map((d) => (
          <DeadlineCard key={`${d.date}-${d.title}`} d={d} today={today} />
        ))}
      </div>
      {rest.length > 0 && (
        <details className="seed-fold seed-fold-deadlines">
          <summary>
            <span>すべて見る（あと{rest.length}件 · 全{abs.length}件）</span>
          </summary>
          <div className="seed-deadline-list seed-fold-body">
            {rest.map((d) => (
              <DeadlineCard key={`${d.date}-${d.title}`} d={d} today={today} />
            ))}
          </div>
        </details>
      )}
      {rel.length > 0 && (
        <details className="seed-fold seed-fold-relative" open>
          <summary>
            <span>届出・イベント相対（いつも · {rel.length}）</span>
          </summary>
          <div className="seed-relative seed-fold-body">
            <ul>
              {rel.map((d) => {
                const money = seedMoneyLine(d)
                return (
                  <li key={`${d.offset}-${d.title}`}>
                    <strong>{d.title}</strong>
                    <span>{d.offset}</span>
                    {'miss' in d && d.miss ? <em>MISS: {d.miss}</em> : null}
                    {money ? <span className="seed-money">{money}</span> : null}
                  </li>
                )
              })}
            </ul>
          </div>
        </details>
      )}
    </section>
  )
}

export function HomeInsightPanels({onOpenTask}: {onOpenTask?: (id: string) => void} = {}) {
  const {hero_numbers, lies_not_to_buy, talk_lines, anti_lie_banner, headline, tomorrow_3_actions} = homeContent
  const lieCount = lies_not_to_buy.length
  const talkCount = talk_lines.length
  const excludeCount = excludeItems.length

  return (
    <div className="seed-home-stack">
      {headline && (
        <section className="seed-block seed-headline" aria-label="見出し">
          <div className="seed-block-head">
            <span className="eyebrow">HEADLINE</span>
            <h3 className="seed-headline-text">{headline}</h3>
          </div>
        </section>
      )}

      <section className="seed-block" aria-label="大きな数字">
        <div className="seed-block-head">
          <span className="eyebrow">BIG NUMBERS</span>
          <h3>大きな数字</h3>
        </div>
        <div className="seed-hero-grid">
          {hero_numbers.map((h) => (
            <div key={h.id} className="seed-hero-card">
              <Hash size={16} />
              <strong>{h.value}</strong>
              <span>{h.label}</span>
              {h.note && <p>{h.note}</p>}
            </div>
          ))}
        </div>
      </section>

      {tomorrow_3_actions && tomorrow_3_actions.length > 0 && (
        <section className="seed-block tomorrow" aria-label="明日の3アクション">
          <div className="seed-block-head">
            <span className="eyebrow">TOMORROW · 3 ACTIONS</span>
            <h3>明日の3アクション</h3>
            <p className="hint">シード記載の次の一手。押すと該当スタンプを開きます。</p>
          </div>
          <ol className="seed-tomorrow-list">
            {tomorrow_3_actions.map((a, i) => {
              const ids = a.stamp_ids?.length ? a.stamp_ids : (a.stamp_id ? [a.stamp_id] : [])
              const primary = ids[0]
              const openable = !!(primary && onOpenTask)
              const body = (
                <>
                  <span className="seed-tomorrow-num">{i + 1}</span>
                  <div>
                    <strong>{a.title}</strong>
                    {a.detail && <p>{a.detail}</p>}
                    {ids.length > 0 && <small>{ids.join(' · ')}</small>}
                  </div>
                  {openable && <ChevronRight size={16} />}
                </>
              )
              return (
                <li key={a.id}>
                  {openable ? (
                    <button type="button" className="seed-tomorrow-btn" onClick={() => onOpenTask!(primary!)}>
                      {body}
                    </button>
                  ) : (
                    <div className="seed-tomorrow-btn static">{body}</div>
                  )}
                </li>
              )
            })}
          </ol>
        </section>
      )}

      <details className="seed-block warn seed-fold seed-fold-heavy" aria-label="思い込みで損しやすいこと">
        <summary className="seed-fold-summary">
          <AlertTriangle size={16} />
          <span>
            <strong>思い込みで損しやすいこと（{lieCount}）</strong>
            <small>DON&apos;T BUY THESE LIES</small>
          </span>
        </summary>
        <div className="seed-fold-body">
          <div className="seed-banner warn-zero" role="note">
            <strong>結婚新生活 = 0円（賞品にしない）</strong>
            <span>{anti_lie_banner}</span>
          </div>
          <ul className="seed-lie-list">
            {lies_not_to_buy.map((lie) => (
              <li key={lie.id}>
                <AlertTriangle size={16} />
                <div>
                  <strong>{lie.title}</strong>
                  <p>{lie.truth}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </details>

      <details className="seed-block exclude seed-fold seed-fold-heavy" aria-label="もらえない制度と理由">
        <summary className="seed-fold-summary">
          <Ban size={16} />
          <span>
            <strong>もらえない制度と理由（{excludeCount}）</strong>
            <small>NOT PRIZES · EXCLUDE · {excludeMeta.description}</small>
          </span>
        </summary>
        <div className="seed-fold-body">
          <div className="seed-exclude-list">
            {excludeItems.map((it) => (
              <article key={it.id} className="seed-exclude-card">
                <span className="seed-badge"><Ban size={12} />対象外</span>
                <strong>{it.title}</strong>
                <p>{it.why}</p>
                {it.source && <small>出典: {it.source}</small>}
              </article>
            ))}
          </div>
        </div>
      </details>

      <details className="seed-block talk seed-fold seed-fold-heavy" aria-label="ふたりの会話のきっかけ">
        <summary className="seed-fold-summary">
          <MessageCircle size={16} />
          <span>
            <strong>ふたりの会話のきっかけ（{talkCount}）</strong>
            <small>TALK LINES</small>
          </span>
        </summary>
        <div className="seed-fold-body">
          <ul className="seed-talk-list">
            {talk_lines.map((t) => (
              <li key={t.id}>
                <MessageCircle size={16} />
                <p>{t.line}</p>
              </li>
            ))}
          </ul>
        </div>
      </details>
    </div>
  )
}

export function PhasesPanel() {
  const {phases, m0_definition, as_of} = phasesContent
  const eventTotal = phases.reduce((n, p) => n + p.events.length, 0)
  return (
    <section className="seed-block phases" aria-label="時期の区切りと出来事">
      <div className="seed-block-head">
        <span className="eyebrow">PHASES & EVENTS</span>
        <h3>時期の区切りと出来事</h3>
        <p className="hint">
          M0 = {m0_definition} · 基準 {as_of} · {phases.length}区切り / {eventTotal}出来事
        </p>
      </div>
      <div className="seed-phase-list">
        {phases.map((ph, idx) => (
          <details key={ph.id} className="seed-phase" open={ph.id === 'phase0' || (idx === 0 && !phases.some((p) => p.id === 'phase0'))}>
            <summary>
              <Layers size={16} />
              <span>
                <strong>{ph.title}</strong>
                <small>{ph.range} · {ph.events.length}件</small>
              </span>
            </summary>
            <ul>
              {ph.events.map((ev) => (
                <li key={`${ph.id}-${ev.title}`}>
                  <div className="seed-event-top">
                    <strong>{ev.title}</strong>
                    <span>{ev.when}</span>
                  </div>
                  {ev.money && <p className="seed-money">{ev.money}</p>}
                  {ev.offset && <p className="seed-note">{ev.offset}</p>}
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>
    </section>
  )
}
