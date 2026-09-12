import {CalendarDays,ExternalLink,MessageCircle,AlertTriangle,Hash,Ban,Layers,ChevronRight} from 'lucide-react'
import {formatMoney,monthDay,shortDate,todayJapan,difference,deadlineText} from '../lib/dates'
import {absoluteDeadlines,relativeDeadlines,excludeItems,excludeMeta,homeContent,phasesContent} from '../data/catalog'
import type {Profile} from '../lib/model'

function branchVisible(branch: string | null | undefined, child: string, home: string) {
  if (!branch || branch === 'always') return true
  if (branch === 'child') return !['none'].includes(child)
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
    <section id="institutional-deadlines" className="seed-block institutional-deadlines" aria-label="制度・カレンダー締切">
      <div className="seed-block-head">
        <h3>制度・カレンダー締切</h3>
        <p className="hint">日付が決まっている締切です。金額は収録した案内にあるものだけ。最新は公式ページで確かめてください。</p>
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
        <details className="seed-fold seed-fold-relative">
          <summary>
            <span>届出・イベントの相対期限（{rel.length}）· 必要なときだけ</span>
          </summary>
          <div className="seed-relative seed-fold-body">
            <ul>
              {rel.map((d) => {
                const money = seedMoneyLine(d)
                return (
                  <li key={`${d.offset}-${d.title}`}>
                    <strong>{d.title}</strong>
                    <span>{d.offset}</span>
                    {'miss' in d && d.miss ? <em>見落とし：{d.miss}</em> : null}
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

export type DeskFillNext = {
  id: string
  title: string
  sub?: string
  closed?: boolean
}

const NEXT_TARGET = 5

export function HomeInsightPanels({
  onOpenTask,
  fillNext = [],
  isStampOpen,
  profile: _profile,
}: {
  onOpenTask?: (id: string) => void
  fillNext?: DeskFillNext[]
  isStampOpen?: (id: string) => boolean
  profile?: Profile | null
} = {}) {
  const {tomorrow_3_actions} = homeContent
  type NextRow = {
    key: string
    title: string
    detail?: string
    ids: string[]
    primary?: string
    source: 'seed' | 'dynamic'
    sub?: string
  }
  const nextRows: NextRow[] = []
  const used = new Set<string>()
  const stampOpen = (id: string) => (isStampOpen ? isStampOpen(id) : true)

  for (const a of tomorrow_3_actions || []) {
    const ids = a.stamp_ids?.length ? a.stamp_ids : (a.stamp_id ? [a.stamp_id] : [])
    const primary = ids.find((id) => stampOpen(id)) || ids[0]
    if (ids.length > 0 && ids.every((id) => !stampOpen(id))) {
      ids.forEach((id) => used.add(id))
      continue
    }
    ids.forEach((id) => used.add(id))
    nextRows.push({
      key: a.id,
      title: a.title,
      detail: a.detail,
      ids,
      primary,
      source: 'seed',
    })
    if (nextRows.length >= NEXT_TARGET) break
  }

  for (const t of fillNext) {
    if (nextRows.length >= NEXT_TARGET) break
    if (used.has(t.id) || t.closed) continue
    used.add(t.id)
    nextRows.push({
      key: `dyn-${t.id}`,
      title: t.title,
      ids: [t.id],
      primary: t.id,
      source: 'dynamic',
      sub: t.sub,
    })
  }

  return (
    <div className="seed-home-stack">
      <section className="seed-block tomorrow" aria-label="次のアクション">
        <div className="seed-block-head">
          <h3>次のアクション</h3>
          <p className="hint">まず取りかかる5つ。埋まらないぶんは、期限の近い項目で補っています。</p>
        </div>
        {nextRows.length > 0 ? (
          <ol className="seed-tomorrow-list">
            {nextRows.map((a, i) => {
              const openable = !!(a.primary && onOpenTask)
              const body = (
                <>
                  <span className="seed-tomorrow-num">{i + 1}</span>
                  <div>
                    <strong>{a.title}</strong>
                    {a.detail && <p>{a.detail}</p>}
                    {a.source === 'dynamic' && a.sub && <small>{a.sub}</small>}
                  </div>
                  {openable && <ChevronRight size={16} />}
                </>
              )
              return (
                <li key={a.key}>
                  {openable ? (
                    <button type="button" className="seed-tomorrow-btn" onClick={() => onOpenTask!(a.primary!)}>
                      {body}
                    </button>
                  ) : (
                    <div className="seed-tomorrow-btn static">{body}</div>
                  )}
                </li>
              )
            })}
          </ol>
        ) : (
          <p className="hint seed-next-empty">今の候補はひと通り確認できました。結果待ちや、次の楽しみを手帳で確かめましょう。</p>
        )}
      </section>
    </div>
  )
}

export function ExcludeAndLiesPanel() {
  const {lies_not_to_buy, anti_lie_banner} = homeContent
  const lieCount = lies_not_to_buy.length
  const excludeCount = excludeItems.length
  return (
    <div className="seed-home-stack find-exclude-stack">
      <details className="seed-block warn seed-fold seed-fold-heavy" aria-label="思い込みで損しやすいこと">
        <summary className="seed-fold-summary">
          <AlertTriangle size={16} />
          <span>
            <strong>思い込みで損しやすいこと（{lieCount}）</strong>
            <small>よく言われる話と、この二人での事実</small>
          </span>
        </summary>
        <div className="seed-fold-body">
          <div className="seed-banner warn-zero" role="note">
            <strong>結婚新生活支援は広島市では受けられません</strong>
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
            <small>{excludeMeta.description}</small>
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
    </div>
  )
}

export function TalkStartersPanel() {
  const {talk_lines} = homeContent
  const talkCount = talk_lines.length
  return (
    <details className="seed-block talk seed-fold seed-fold-heavy pair-talk-starters-fold" aria-label="制度の話のきっかけ">
      <summary className="seed-fold-summary">
        <MessageCircle size={16} />
        <span>
          <strong>制度の話のきっかけ（{talkCount}）</strong>
          <small>届出・お金・暮らしの前提を、そのまま読んでもよい文</small>
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
  )
}

export function HeroNumbersPanel({profile}: {profile?: Profile | null} = {}) {
  const {hero_numbers} = homeContent
  const heroOrdered = [...hero_numbers].sort((a, b) => {
    const rank = (id: string) => {
      const dual = !profile || profile.work === 'dual' || profile.work === 'unknown'
      const hasW = !!(profile && profile.wdate)
      if (dual && id === 'nisa_dual') return 0
      if (!hasW && id === 'filing_0') return 1
      if (hasW && id === 'inheritance_spouse') return 1
      if (id === 'inheritance_spouse') return 2
      if (id === 'filing_0') return 3
      return 4
    }
    return rank(a.id) - rank(b.id)
  })
  return (
    <section className="seed-block" aria-label="覚えておきたい数字">
      <div className="seed-block-head">
        <h3>覚えておきたい数字</h3>
        <p className="hint">いまの二人の前提に合わせて並べています。公式の案内は各項目でも確認できます。</p>
      </div>
      <div className="seed-hero-grid">
        {heroOrdered.map((h) => (
          <div key={h.id} className="seed-hero-card">
            <Hash size={16} />
            <strong>{h.value}</strong>
            <span>{h.label}</span>
            {h.note && <p>{h.note}</p>}
          </div>
        ))}
      </div>
    </section>
  )
}

export function PhasesPanel() {
  const {phases, m0_definition, as_of} = phasesContent
  const eventTotal = phases.reduce((n, p) => n + p.events.length, 0)
  return (
    <section className="seed-block phases" aria-label="時期の区切りと出来事">
      <div className="seed-block-head">
        <h3>時期の区切りと出来事</h3>
        <p className="hint">
          婚姻日 = {m0_definition} · 基準日 {as_of} · {phases.length}の区切り / {eventTotal}の出来事
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
