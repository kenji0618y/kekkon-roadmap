import type {Status, Group, Task} from '../lib/model'
import {statusNames} from '../lib/model'
import {phaseImage} from '../data/catalog'

/** Max stamps per card (4 corners + mid-left/mid-right). Overflow → sub-mass split */
const MAX_CORNER_PADS = 6

/** Prefer bottom corners when few stamps so the scene stays open; 5–6 use edge mids */
function cornerSlot(count: number, index: number) {
  const map: Record<number, number[]> = {
    1: [3],
    2: [2, 3],
    3: [0, 2, 3],
    4: [0, 1, 2, 3],
    5: [0, 1, 2, 3, 4],
    6: [0, 1, 2, 3, 4, 5],
  }
  return (map[count] || map[6])[index] ?? index
}

function tinyLabel(title: string) {
  const t = title.replace(/（.*?）/g, '').replace(/\(.*?\)/g, '').trim()
  return t.length > 4 ? `${t.slice(0, 4)}` : t
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
  if (st === 'na') return '—'
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
  if (ts.length === 0) return [[]]
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
                  className="illust-pads"
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
                          <span className="stamp-pad-label">{tinyLabel(t.title)}</span>
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
                <strong>{captionTitle}</strong>
                <span className="illust-progress">
                  {chunk.length ? `${checked}/${chunk.length}` : '—'}
                  {complete ? ' 済' : ''}
                </span>
              </button>
            </article>
          )
        })
      })}
    </div>
  )
}
