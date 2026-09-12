import type {Status, Group, Task} from '../lib/model'
import {statusNames} from '../lib/model'
import {phaseImage} from '../data/catalog'

/** Max stamps per illustration card. Overflow → sub-mass split */
const MAX_CORNER_PADS = 12

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
  activeId?: string
  onSelectGroup: (id: string) => void
  onPressStamp: (taskId: string) => void
}

export function StampIllustBoard({
  groups,
  tasksFor,
  recordStatus,
  activeId,
  onSelectGroup,
  onPressStamp,
}: Props) {
  let cardNo = 0

  return (
    <div className="stamp-rally" role="list">
      {groups.flatMap((g) => {
        const ts = tasksFor(g)
        const chunks = chunkTasksForCards(ts)
        const image = phaseImage(g.id)
        const partTotal = chunks.length

        return chunks.map((chunk, partIdx) => {
          cardNo += 1
          const no = String(cardNo).padStart(2, '0')
          const done = chunk.filter((t) => recordStatus(t.id) === 'done').length
          const checked = chunk.filter((t) => {
            const s = recordStatus(t.id)
            return s === 'done' || s === 'learned'
          }).length
          const complete = chunk.length > 0 && done === chunk.length
          const selected = activeId === g.id
          const captionTitle =
            partTotal > 1 ? `${g.short} ${partIdx + 1}/${partTotal}` : g.short
          const cardKey = partTotal > 1 ? `${g.id}__p${partIdx}` : g.id

          return (
            <article
              key={cardKey}
              role="listitem"
              className={`illust-square ${selected ? 'selected' : ''} ${complete ? 'complete' : ''}`}
            >
              <div className="illust-frame">
                <img
                  className="illust-art"
                  src={image}
                  alt=""
                  loading="lazy"
                  decoding="async"
                />

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
                      return (
                        <button
                          key={t.id}
                          type="button"
                          className={`stamp-pad corner c${cornerSlot(chunk.length, idx)} ${padClass(st)}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            onSelectGroup(g.id)
                            onPressStamp(t.id)
                          }}
                          aria-label={`${t.title}（${statusAria(st)}）`}
                          title={t.title}
                        >
                          <span className="stamp-pad-mark">{padMark(st)}</span>
                          <span className="stamp-pad-label">{tinyLabel(t)}</span>
                        </button>
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
                  {partIdx === 0 && g.subtitle ? (
                    <span className="illust-sub">{g.subtitle}</span>
                  ) : null}
                </span>
                <span className="illust-progress">
                  {chunk.length ? `${checked}/${chunk.length}` : '—'}
                  {complete ? ' 済' : ''}
                </span>
              </button>
              {partIdx === 0 && g.chips && g.chips.length > 0 ? (
                <div className="illust-chips" aria-label={`${g.short}のチップ`}>
                  {g.chips.slice(0, 4).map((c) => (
                    <span key={c} className="illust-chip">{c}</span>
                  ))}
                </div>
              ) : null}
            </article>
          )
        })
      })}
    </div>
  )
}
