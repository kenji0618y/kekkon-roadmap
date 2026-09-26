import {useMemo, useState} from 'react'
import {ChevronLeft, ChevronRight, Plus, Pencil, Trash2, CalendarDays} from 'lucide-react'
import {absoluteDeadlines} from '../data/catalog'
import {deadlineClosedLabel, deadlineVisible} from '../lib/deadline-visibility'
import {
  pairEventWhoLabels,
  type PairEvent,
  type Profile,
} from '../lib/model'
import {
  deadlineText,
  difference,
  monthDay,
  shortDate,
  todayJapan,
  validDate,
} from '../lib/dates'
import {Label} from './ui/label'
import {Input} from './ui/input'
import {Textarea} from './ui/textarea'

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'] as const

function newEventId() {
  return `ev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function ymKey(y: number, m: number) {
  return `${y}-${String(m).padStart(2, '0')}`
}

function daysInMonth(y: number, m: number) {
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

/** Sunday-start week index for YYYY-MM-DD (UTC date). */
function sundayWeekIndex(iso: string) {
  return new Date(iso + 'T00:00:00Z').getUTCDay()
}

type SeedMark = {kind: 'seed'; date: string; title: string; note?: string | null; closed?: string | null}
type DayMark = SeedMark | (PairEvent & {kind: 'custom'})

type Draft = {
  id: string
  title: string
  date: string
  note: string
  who: PairEvent['who']
}

const emptyDraft = (date: string): Draft => ({
  id: '',
  title: '',
  date,
  note: '',
  who: 'both',
})

export function DeadlinesCalendar({
  profile,
  events,
  busy,
  onSave,
  onDelete,
}: {
  profile: Profile
  events: PairEvent[]
  busy?: boolean
  onSave: (event: PairEvent) => Promise<boolean>
  onDelete: (id: string) => Promise<boolean>
}) {
  const today = todayJapan()
  const [ty, tm] = today.split('-').map(Number)
  const [cursor, setCursor] = useState({y: ty, m: tm})
  const [selected, setSelected] = useState(today)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [formError, setFormError] = useState('')

  const whoLabels = useMemo(() => pairEventWhoLabels(profile), [profile.name1, profile.name2])

  const seedMarks = useMemo((): SeedMark[] => {
    return absoluteDeadlines
      .filter(
        (d) =>
          deadlineVisible(d, profile) &&
          validDate(d.date) &&
          difference(d.date, today) >= 0,
      )
      .map((d) => ({kind: 'seed' as const, date: d.date, title: d.title, note: d.note, closed: deadlineClosedLabel(d)}))
  }, [profile.child, profile.home, today])

  const customByDate = useMemo(() => {
    const map = new Map<string, PairEvent[]>()
    for (const e of events) {
      if (!validDate(e.date)) continue
      const list = map.get(e.date) || []
      list.push(e)
      map.set(e.date, list)
    }
    return map
  }, [events])

  const seedByDate = useMemo(() => {
    const map = new Map<string, SeedMark[]>()
    for (const s of seedMarks) {
      const list = map.get(s.date) || []
      list.push(s)
      map.set(s.date, list)
    }
    return map
  }, [seedMarks])

  const comingSoon = useMemo(() => {
    const rows: DayMark[] = [
      ...seedMarks.map((s) => s as DayMark),
      ...events
        .filter((e) => validDate(e.date) && difference(e.date, today) >= 0 && difference(e.date, today) <= 14)
        .map((e) => ({...e, kind: 'custom' as const})),
    ]
    return rows
      .filter((r) => difference(r.date, today) <= 14)
      .sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title))
      .slice(0, 8)
  }, [seedMarks, events, today])

  const cells = useMemo(() => {
    const {y, m} = cursor
    const first = `${ymKey(y, m)}-01`
    const lead = sundayWeekIndex(first)
    const dim = daysInMonth(y, m)
    const out: {iso: string | null; day: number | null}[] = []
    for (let i = 0; i < lead; i++) out.push({iso: null, day: null})
    for (let d = 1; d <= dim; d++) {
      const iso = `${ymKey(y, m)}-${String(d).padStart(2, '0')}`
      out.push({iso, day: d})
    }
    while (out.length % 7 !== 0) out.push({iso: null, day: null})
    return out
  }, [cursor])

  const daySeeds = seedByDate.get(selected) || []
  const dayCustoms = customByDate.get(selected) || []

  const shiftMonth = (delta: number) => {
    setCursor((c) => {
      let m = c.m + delta
      let y = c.y
      if (m < 1) {
        m = 12
        y -= 1
      } else if (m > 12) {
        m = 1
        y += 1
      }
      return {y, m}
    })
  }

  const openAdd = (date = selected) => {
    setFormError('')
    setDraft(emptyDraft(date))
  }

  const openEdit = (e: PairEvent) => {
    setFormError('')
    setDraft({id: e.id, title: e.title, date: e.date, note: e.note || '', who: e.who})
  }

  const submitDraft = async () => {
    if (!draft) return
    const title = draft.title.trim()
    if (!title) {
      setFormError('タイトルを入れてね。')
      return
    }
    if (!validDate(draft.date)) {
      setFormError('日付を確認してね。')
      return
    }
    const event: PairEvent = {
      id: draft.id || newEventId(),
      title: title.slice(0, 100),
      date: draft.date,
      note: (draft.note || '').slice(0, 1000),
      who: draft.who,
      updatedAt: new Date().toISOString(),
    }
    const ok = await onSave(event)
    if (ok) {
      setDraft(null)
      setFormError('')
      setSelected(event.date)
      const [ey, em] = event.date.split('-').map(Number)
      setCursor({y: ey, m: em})
    }
  }

  return (
    <section id="deadline-block-calendar" className="deadline-block cal-block" aria-label="ふたりのカレンダー">
      <h2 className="deadline-block-label">ふたりのカレンダー</h2>
      <p className="deadline-block-intro">
        日付をタップして、{whoLabels.male}・{whoLabels.female}・ふたりの予定を残せます。制度の締切も同じ月に点で出ます。
      </p>

      <div className="cal-month-bar">
        <button type="button" className="cal-nav-btn" onClick={() => shiftMonth(-1)} aria-label="前の月">
          <ChevronLeft size={18} />
        </button>
        <h3 className="cal-month-title">
          {cursor.y}年{cursor.m}月
        </h3>
        <button type="button" className="cal-nav-btn" onClick={() => shiftMonth(1)} aria-label="次の月">
          <ChevronRight size={18} />
        </button>
        <button
          type="button"
          className="cal-today-btn"
          onClick={() => {
            setCursor({y: ty, m: tm})
            setSelected(today)
          }}
        >
          今日
        </button>
      </div>

      <div className="cal-grid" role="grid" aria-label={`${cursor.y}年${cursor.m}月`}>
        <div className="cal-weekdays" role="row">
          {WEEKDAYS.map((w) => (
            <div key={w} className={`cal-weekday${w === '日' ? ' sun' : w === '土' ? ' sat' : ''}`} role="columnheader">
              {w}
            </div>
          ))}
        </div>
        <div className="cal-days" role="rowgroup">
          {cells.map((c, i) => {
            if (!c.iso) return <div key={`pad-${i}`} className="cal-day empty" aria-hidden />
            const seeds = seedByDate.get(c.iso) || []
            const customs = customByDate.get(c.iso) || []
            const isToday = c.iso === today
            const isSelected = c.iso === selected
            const weekend = sundayWeekIndex(c.iso)
            return (
              <button
                key={c.iso}
                type="button"
                role="gridcell"
                className={`cal-day${isToday ? ' today' : ''}${isSelected ? ' selected' : ''}${weekend === 0 ? ' sun' : weekend === 6 ? ' sat' : ''}`}
                aria-label={`${shortDate(c.iso)}${seeds.length || customs.length ? `・予定${seeds.length + customs.length}件` : ''}`}
                aria-pressed={isSelected}
                onClick={() => {
                  setSelected(c.iso!)
                  setDraft(null)
                  setFormError('')
                }}
              >
                <span className="cal-day-num">{c.day}</span>
                <span className="cal-dots" aria-hidden>
                  {seeds.slice(0, 2).map((_, j) => (
                    <i key={`s${j}`} className="cal-dot seed" />
                  ))}
                  {customs.slice(0, 3).map((e) => (
                    <i key={e.id} className={`cal-dot who-${e.who}`} />
                  ))}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="cal-legend" aria-label="凡例">
        <span>
          <i className="cal-dot seed" />
          制度の締切
        </span>
        <span>
          <i className="cal-dot who-male" />
          {whoLabels.male}
        </span>
        <span>
          <i className="cal-dot who-female" />
          {whoLabels.female}
        </span>
        <span>
          <i className="cal-dot who-both" />
          ふたり
        </span>
      </div>

      <div className="cal-day-panel" aria-live="polite">
        <div className="cal-day-panel-head">
          <div>
            <strong>{shortDate(selected)}</strong>
            <span className="hint">{deadlineText(selected, today)}</span>
          </div>
          <button type="button" className="cal-add-btn" onClick={() => openAdd(selected)} disabled={busy}>
            <Plus size={16} />
            予定を入れる
          </button>
        </div>

        {!daySeeds.length && !dayCustoms.length && !draft && (
          <p className="hint cal-day-empty">この日の予定はまだありません。上のボタンから残せます。</p>
        )}

        {daySeeds.length > 0 && (
          <ul className="cal-day-list">
            {daySeeds.map((s) => (
              <li key={`seed-${s.date}-${s.title}`} className="cal-item seed">
                <span className="cal-item-chip seed">制度</span>
                <div className="cal-item-body">
                  <strong>{s.title}</strong>
                  {s.closed ? <span className="cal-closed">{s.closed}</span> : null}
                  {s.note ? <span className="hint">{s.note}</span> : null}
                </div>
              </li>
            ))}
          </ul>
        )}

        {dayCustoms.length > 0 && (
          <ul className="cal-day-list">
            {dayCustoms.map((e) => (
              <li key={e.id} className={`cal-item custom who-${e.who}`}>
                <span className={`cal-item-chip who-${e.who}`}>{whoLabels[e.who]}</span>
                <div className="cal-item-body">
                  <strong>{e.title}</strong>
                  {e.note ? <span className="hint">{e.note}</span> : null}
                </div>
                <div className="cal-item-actions">
                  <button type="button" className="icon-button" aria-label={`${e.title}を編集`} onClick={() => openEdit(e)} disabled={busy}>
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`${e.title}を削除`}
                    disabled={busy}
                    onClick={() => void onDelete(e.id)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {draft && (
          <form
            className="cal-event-form"
            onSubmit={(ev) => {
              ev.preventDefault()
              void submitDraft()
            }}
          >
            <p className="cal-form-title">{draft.id ? '予定を直す' : '新しい予定'}</p>
            <div className="field">
              <Label htmlFor="cal-ev-title">タイトル</Label>
              <Input
                id="cal-ev-title"
                value={draft.title}
                onChange={(e) => setDraft({...draft, title: e.target.value})}
                maxLength={100}
                required
                placeholder="例：区役所へ行く"
                autoComplete="off"
                disabled={busy}
              />
            </div>
            <div className="field-grid cal-form-grid">
              <div className="field">
                <Label htmlFor="cal-ev-date">日付</Label>
                <Input
                  id="cal-ev-date"
                  type="date"
                  value={draft.date}
                  onChange={(e) => setDraft({...draft, date: e.target.value})}
                  required
                  disabled={busy}
                />
              </div>
              <div className="field">
                <Label id="cal-ev-who-label">だれの予定</Label>
                <div className="cal-who-row" role="group" aria-labelledby="cal-ev-who-label">
                  {(['male', 'female', 'both'] as const).map((w) => (
                    <button
                      key={w}
                      type="button"
                      className={`cal-who-btn who-${w}${draft.who === w ? ' on' : ''}`}
                      aria-pressed={draft.who === w}
                      disabled={busy}
                      onClick={() => setDraft({...draft, who: w})}
                    >
                      {whoLabels[w]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="field">
              <Label htmlFor="cal-ev-note">メモ（任意）</Label>
              <Textarea
                id="cal-ev-note"
                value={draft.note}
                onChange={(e) => setDraft({...draft, note: e.target.value})}
                maxLength={1000}
                rows={3}
                placeholder="持ち物や待ち合わせなど"
                disabled={busy}
              />
            </div>
            {formError && (
              <p className="inline-error" role="alert">
                {formError}
              </p>
            )}
            <div className="cal-form-actions">
              <button type="button" className="text-button" onClick={() => setDraft(null)} disabled={busy}>
                やめる
              </button>
              <button type="submit" className="cal-save-btn" disabled={busy}>
                {draft.id ? '更新する' : '手帳に残す'}
              </button>
            </div>
          </form>
        )}
      </div>

      {comingSoon.length > 0 && (
        <div className="cal-soon" aria-label="まもなくの予定">
          <h3>
            <CalendarDays size={15} />
            まもなく（14日以内）
          </h3>
          <ul>
            {comingSoon.map((row) => (
              <li key={row.kind === 'custom' ? row.id : `soon-${row.date}-${row.title}`}>
                <button
                  type="button"
                  onClick={() => {
                    setSelected(row.date)
                    const [ey, em] = row.date.split('-').map(Number)
                    setCursor({y: ey, m: em})
                    setDraft(null)
                  }}
                >
                  <span className="cal-soon-date">{monthDay(row.date)}</span>
                  {row.kind === 'seed' ? (
                    <span className="cal-item-chip seed">制度</span>
                  ) : (
                    <span className={`cal-item-chip who-${row.who}`}>{whoLabels[row.who]}</span>
                  )}
                  <strong>{row.title}</strong>
                  {row.kind === 'seed' && row.closed ? <span className="cal-closed">予約受付は終了</span> : null}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
