import type {CSSProperties} from 'react'
import type {Group, Status, Task} from '../lib/model'
import {statusNames} from '../lib/model'
import {phaseImage} from '../data/catalog'

function shortLabel(title: string) {
  const t = title.replace(/（.*?）/g, '').replace(/\(.*?\)/g, '').trim()
  return t.length > 8 ? `${t.slice(0, 7)}…` : t
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
        const cols = ts.length <= 1 ? 1 : 2
        const gridStyle = {'--pad-cols': String(cols)} as CSSProperties

        return (
          <article
            key={g.id}
            role="listitem"
            className={`illust-square ${selected ? 'selected' : ''} ${complete ? 'complete' : ''}`}
          >
            <button
              type="button"
              className="illust-square-head"
              onClick={() => onSelectGroup(g.id)}
              aria-pressed={selected}
            >
              <span className="illust-no">{String(i + 1).padStart(2, '0')}</span>
              <strong>{g.short}</strong>
              <span className="illust-progress">
                {ts.length ? `${checked} / ${ts.length}` : '対象なし'}
                {complete ? ' · 済' : ''}
              </span>
            </button>

            <div className="illust-frame stamp-chrome">
              <div className="stamp-chrome-mat" aria-hidden />
              <img
                className="illust-art"
                src={image}
                alt=""
                loading="lazy"
                decoding="async"
              />
              <div className="stamp-chrome-oval" aria-hidden />
              <div className="stamp-chrome-corners" aria-hidden>
                <i /><i /><i /><i />
              </div>
              <div
                className="illust-pads-scroll"
                role="group"
                aria-label={`${g.title}のスタンプ台`}
              >
                {ts.length === 0 ? (
                  <span className="stamp-pad-empty">この設定では対象項目なし</span>
                ) : (
                  <div className="illust-pads-grid" style={gridStyle}>
                    {ts.map((t) => {
                      const st = recordStatus(t.id)
                      return (
                        <button
                          key={t.id}
                          type="button"
                          className={`stamp-pad in-frame ${padClass(st)}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            onSelectGroup(g.id)
                            onPressStamp(t.id)
                          }}
                          aria-label={`${t.title}（${statusAria(st)}）`}
                        >
                          <span className="stamp-pad-mark">{padMark(st)}</span>
                          <span className="stamp-pad-label">{shortLabel(t.title)}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            <p className="illust-hint">マスの白い枠を押して、スタンプを押す</p>
          </article>
        )
      })}
    </div>
  )
}
