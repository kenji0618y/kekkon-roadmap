import type {Status, Group, Task} from '../lib/model'
import {statusNames} from '../lib/model'
import {phaseImage} from '../data/catalog'

/** Max pads drawn on the art — overflow opens via square caption → detail list */
const MAX_CORNER_PADS = 4

/** Prefer bottom corners when few stamps so the scene stays open */
function cornerSlot(count: number, index: number) {
  const map: Record<number, number[]> = {
    1: [3],
    2: [2, 3],
    3: [0, 2, 3],
    4: [0, 1, 2, 3],
  }
  return (map[count] || map[4])[index] ?? index
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

/** Prefer incomplete stamps in the four corners so progress stays visible */
function pickCornerTasks(ts: Task[], recordStatus: (id: string) => Status | undefined) {
  if (ts.length <= MAX_CORNER_PADS) return {visible: ts, overflow: 0}
  const open = ts.filter((t) => {
    const s = recordStatus(t.id)
    return s !== 'done' && s !== 'learned' && s !== 'na'
  })
  const rest = ts.filter((t) => !open.includes(t))
  const visible = [...open, ...rest].slice(0, MAX_CORNER_PADS)
  return {visible, overflow: ts.length - visible.length}
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
  return (
    <div className="stamp-rally" role="list">
      {groups.map((g, i) => {
        const ts = tasksFor(g)
        const done = ts.filter((t) => recordStatus(t.id) === 'done').length
        const checked = ts.filter((t) => {
          const s = recordStatus(t.id)
          return s === 'done' || s === 'learned'
        }).length
        const complete = ts.length > 0 && done === ts.length
        const image = phaseImage(g.id)
        const selected = activeId === g.id
        const {visible, overflow} = pickCornerTasks(ts, recordStatus)
        const no = String(i + 1).padStart(2, '0')

        return (
          <article
            key={g.id}
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
                aria-label={`${g.title}のスタンプ台`}
              >
                {ts.length === 0 ? (
                  <span className="stamp-pad-empty corner-empty">この設定では対象項目なし</span>
                ) : (
                  visible.map((t, idx) => {
                    const st = recordStatus(t.id)
                    return (
                      <button
                        key={t.id}
                        type="button"
                        className={`stamp-pad corner c${cornerSlot(visible.length, idx)} ${padClass(st)}`}
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
              <strong>{g.short}</strong>
              <span className="illust-progress">
                {ts.length ? `${checked}/${ts.length}` : '—'}
                {complete ? ' 済' : ''}
                {overflow > 0 ? ' · 一覧' : ''}
              </span>
            </button>
          </article>
        )
      })}
    </div>
  )
}
