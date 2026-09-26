import {useEffect, useMemo, useRef, useState} from 'react'
import type {Status, Group, Task, Profile} from '../lib/model'
import {pairEventWhoLabels, statusNames} from '../lib/model'
import {phaseImage} from '../data/catalog'

/** Max stamps per illustration card. Overflow → sub-mass split */
const MAX_CORNER_PADS = 12
const SHOW_DONE_KEY = 'amity-stamp-show-done'

/** Slot order: keep the scene open when few stamps (prefer bottom), then fill the rim up to 12. */
const FILL_ORDER = [3, 2, 0, 1, 4, 5, 6, 7, 8, 9, 10, 11]

function cornerSlot(count: number, index: number) {
  const n = Math.min(Math.max(count, 1), MAX_CORNER_PADS)
  const slots = FILL_ORDER.slice(0, n)
  return slots[index] ?? index
}

/** Short name for the stamp face. tasks.json carries a hand-written `pad`
 *  for all 137 items; the title fallback is only for data without one. */
function tinyLabel(task: Task) {
  if (task.pad && task.pad.trim()) return task.pad.trim()
  const t = task.title.replace(/（.*?）/g, '').replace(/\(.*?\)/g, '').trim()
  return t.length > 6 ? `${t.slice(0, 6)}…` : t
}

function padClass(status: Status | undefined) {
  const st = status || 'todo'
  if (st === 'done') return 'st-done'
  if (st === 'learned') return 'st-checked'
  if (st === 'na') return 'st-na'
  if (st === 'preparing' || st === 'applied' || st === 'waiting') return 'st-progress'
  return 'st-todo'
}

function padMark(status: Status | undefined) {
  const st = status || 'todo'
  if (st === 'done') return '済'
  if (st === 'learned') return <span className="check-blue" aria-hidden />
  if (st === 'na') return 'ス'
  if (st === 'preparing') return '準'
  if (st === 'applied') return '申'
  if (st === 'waiting') return '待'
  return ''
}

function statusAria(status: Status | undefined) {
  return statusNames[status || 'todo']
}

/** Split a group's tasks into cards of ≤MAX pads (sub-mass split). */
export function chunkTasksForCards(ts: Task[], maxPads = MAX_CORNER_PADS): Task[][] {
  // Lean / inScope may hide every stamp in a group (e.g. 挙式 when ceremony==='no').
  // Do not emit an empty illustration card.
  if (ts.length === 0) return []
  if (ts.length <= maxPads) return [ts]
  const chunks: Task[][] = []
  for (let i = 0; i < ts.length; i += maxPads) {
    chunks.push(ts.slice(i, i + maxPads))
  }
  return chunks
}

type Props = {
  groups: Group[]
  tasksFor: (g: Group) => Task[]
  recordStatus: (id: string) => Status | undefined
  recordPair?: (id: string) => {male: boolean; female: boolean}
  /** For half-check button labels (name1 / name2). */
  profile: Pick<Profile, 'name1' | 'name2'>
  activeId?: string
  /** When set, only the chunk containing this task is selected (split groups). */
  activeTaskId?: string
  onSelectGroup: (id: string) => void
  onPressStamp: (taskId: string) => void
  onTogglePair?: (taskId: string, who: 'male' | 'female') => void
}

type CardModel = {
  g: Group
  chunk: Task[]
  partIdx: number
  partTotal: number
  cardKey: string
  complete: boolean
  doneCount: number
  checkedCount: number
  image: string
}

function loadShowDone() {
  try {
    return localStorage.getItem(SHOW_DONE_KEY) === '1'
  } catch {
    return false
  }
}

export function StampIllustBoard({
  groups,
  tasksFor,
  recordStatus,
  recordPair,
  profile,
  activeId,
  activeTaskId,
  onSelectGroup,
  onPressStamp,
  onTogglePair,
}: Props) {
  const [showDone, setShowDone] = useState(loadShowDone)
  const [foldOpen, setFoldOpen] = useState(false)
  const whoLabels = useMemo(() => pairEventWhoLabels(profile), [profile.name1, profile.name2])

  useEffect(() => {
    try {
      localStorage.setItem(SHOW_DONE_KEY, showDone ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [showDone])

  // Opening a completed stamp from elsewhere should reveal done pads once.
  useEffect(() => {
    if (!activeTaskId) return
    if (recordStatus(activeTaskId) === 'done') {
      setShowDone(true)
      setFoldOpen(true)
    }
    // recordStatus is an inline lambda from the parent; depend only on activeTaskId.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTaskId])

  // この画面を開いている間に「完了」にしたスタンプは、すぐ消さずに済みの印で残す（タブを離れる／開き直すと畳む）。
  const prevStatusRef = useRef<Map<string, string> | null>(null)
  const justDoneRef = useRef<Set<string>>(new Set())
  {
    const now = new Map<string, string>()
    for (const g of groups) for (const t of tasksFor(g)) now.set(t.id, recordStatus(t.id) ?? "")
    const prev = prevStatusRef.current
    if (prev) {
      for (const [id, st] of now) {
        if (st === 'done' && prev.has(id) && prev.get(id) !== 'done') justDoneRef.current.add(id)
      }
    }
    prevStatusRef.current = now
  }
  const justDoneKey = [...justDoneRef.current].join(',')
  const hiddenAsDone = (id: string) => recordStatus(id) === 'done' && !justDoneRef.current.has(id)

  const {activeCards, foldedCards, hiddenDonePads} = useMemo(() => {
    const active: CardModel[] = []
    const folded: CardModel[] = []
    let hiddenDonePads = 0

    for (const g of groups) {
      const ts = tasksFor(g)
      const chunks = chunkTasksForCards(ts)
      const image = phaseImage(g.id)
      const partTotal = chunks.length

      chunks.forEach((chunk, partIdx) => {
        const doneCount = chunk.filter((t) => recordStatus(t.id) === 'done').length
        const checkedCount = chunk.filter((t) => {
          const s = recordStatus(t.id)
          return s === 'done' || s === 'learned'
        }).length
        const complete = chunk.length > 0 && doneCount === chunk.length
        const cardKey = partTotal > 1 ? `${g.id}__p${partIdx}` : g.id
        const model: CardModel = {
          g,
          chunk,
          partIdx,
          partTotal,
          cardKey,
          complete,
          doneCount,
          checkedCount,
          image,
        }

        if (showDone) {
          active.push(model)
          return
        }

        // Hide completed pads; fully-done cards go to the fold tray.
        if (complete && chunk.every((t) => hiddenAsDone(t.id))) {
          hiddenDonePads += doneCount
          folded.push(model)
          return
        }

        const visible = chunk.filter((t) => !hiddenAsDone(t.id))
        hiddenDonePads += chunk.length - visible.length
        if (visible.length === 0) {
          folded.push({...model, complete: true})
          return
        }
        active.push({
          ...model,
          chunk: visible,
          // progress still reflects full chunk intent via doneCount/checked on original
          doneCount,
          checkedCount,
          complete: false,
        })
      })
    }

    return {activeCards: active, foldedCards: folded, hiddenDonePads}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, tasksFor, recordStatus, showDone, justDoneKey])

  let cardNo = 0

  const renderCard = (model: CardModel, muted = false) => {
    cardNo += 1
    const no = String(cardNo).padStart(2, '0')
    const {g, chunk, partIdx, partTotal, cardKey, complete, checkedCount, image} = model
    const fullLen = chunkTasksForCards(tasksFor(g))[partIdx]?.length ?? chunk.length
    const captionTitle = partTotal > 1 ? `${g.short} ${partIdx + 1}/${partTotal}` : g.short
    const selected =
      activeId === g.id &&
      (!activeTaskId || chunk.some((t) => t.id === activeTaskId))

    return (
      <article
        key={cardKey}
        role="listitem"
        className={`illust-square ${selected ? 'selected' : ''} ${complete ? 'complete' : ''} ${muted ? 'illust-folded' : ''}`}
      >
        <div className="illust-frame" data-reveal-key={`${cardKey}|${image}`}>
          <img className="illust-art" src={image} alt="" loading="lazy" decoding="async" />
          <div
            className={`illust-pads${chunk.length > 6 ? ' pads-dense' : ''}`}
            role="group"
            aria-label={`${captionTitle}のスタンプ台`}
          >
            {chunk.length === 0 ? (
              <span className="stamp-pad-empty corner-empty">この設定では対象項目なし</span>
            ) : (
              chunk.map((t, idx) => {
                const st = recordStatus(t.id)
                const pair = recordPair ? recordPair(t.id) : {male: st === 'done', female: st === 'done'}
                const halfClass = pair.male && pair.female ? '' : pair.male || pair.female ? 'st-half' : ''
                return (
                  <div
                    key={t.id}
                    className={`stamp-pad corner c${cornerSlot(chunk.length, idx)} ${padClass(st)} ${halfClass}${pair.male ? ' male-on' : ''}${pair.female ? ' female-on' : ''}`}
                    title={t.title}
                  >
                    <button
                      type="button"
                      className="stamp-pad-body"
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelectGroup(g.id)
                        onPressStamp(t.id)
                      }}
                      aria-label={`${t.title}（${statusAria(st)}）詳細`}
                    >
                      <span className="stamp-pad-mark">{padMark(st)}</span>
                      <span className="stamp-pad-label">{tinyLabel(t)}</span>
                    </button>
                    <div className="stamp-half-row" role="group" aria-label={`${t.title}の${whoLabels.male}・${whoLabels.female}チェック`}>
                      <button
                        type="button"
                        className={`stamp-half left ${pair.male ? 'on' : ''}`}
                        aria-label={`${t.title}・${whoLabels.male}（${pair.male ? 'チェック済' : '未チェック'}）`}
                        aria-pressed={pair.male}
                        onClick={(e) => {
                          e.stopPropagation()
                          onSelectGroup(g.id)
                          if (onTogglePair) onTogglePair(t.id, 'male')
                          else onPressStamp(t.id)
                        }}
                      >
                        {whoLabels.male}
                      </button>
                      <button
                        type="button"
                        className={`stamp-half right ${pair.female ? 'on' : ''}`}
                        aria-label={`${t.title}・${whoLabels.female}（${pair.female ? 'チェック済' : '未チェック'}）`}
                        aria-pressed={pair.female}
                        onClick={(e) => {
                          e.stopPropagation()
                          onSelectGroup(g.id)
                          if (onTogglePair) onTogglePair(t.id, 'female')
                          else onPressStamp(t.id)
                        }}
                      >
                        {whoLabels.female}
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
        <button
          type="button"
          className="illust-caption"
          onClick={() => onSelectGroup(g.id)}
          aria-pressed={selected}
        >
          <span className="illust-no">{no}</span>
          <span className="illust-caption-text">
            <strong>{captionTitle}</strong>
            {partIdx === 0 && g.subtitle ? <span className="illust-sub">{g.subtitle}</span> : null}
          </span>
          <span className="illust-progress">
            {fullLen ? `${checkedCount}/${fullLen}` : '—'}
            {complete ? ' 済' : ''}
          </span>
        </button>
        {partIdx === 0 && g.chips && g.chips.length > 0 ? (
          <div className="illust-chips" aria-label={`${g.short}のチップ`}>
            {g.chips.slice(0, 4).map((c) => (
              <span key={c} className="illust-chip">
                {c}
              </span>
            ))}
          </div>
        ) : null}
      </article>
    )
  }

  return (
    <div className="stamp-rally-wrap">
      <div className="stamp-done-bar" role="group" aria-label="完了スタンプの表示">
        <button
          type="button"
          className={`stamp-done-toggle ${showDone ? 'is-on' : ''}`}
          aria-pressed={showDone}
          onClick={() => {
            setShowDone((v) => !v)
            if (showDone) setFoldOpen(false)
          }}
        >
          {showDone ? '完了スタンプを畳む' : `完了を非表示中${hiddenDonePads ? `（${hiddenDonePads}）` : ''}`}
        </button>
        {!showDone && foldedCards.length > 0 ? (
          <button
            type="button"
            className={`stamp-done-fold ${foldOpen ? 'is-open' : ''}`}
            aria-expanded={foldOpen}
            onClick={() => setFoldOpen((v) => !v)}
          >
            {foldOpen ? '完了したまとまりを閉じる' : `完了したまとまり ${foldedCards.length}`}
          </button>
        ) : null}
      </div>

      <div className="stamp-rally" role="list">
        {activeCards.map((m) => renderCard(m))}
      </div>

      {!showDone && foldOpen && foldedCards.length > 0 ? (
        <div className="stamp-folded-tray" aria-label="完了したまとまり">
          <p className="hint">すべて完了したイラスト台です。スタンプを押すと詳細を開けます。</p>
          <div className="stamp-rally" role="list">
            {foldedCards.map((m) => renderCard(m, true))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
