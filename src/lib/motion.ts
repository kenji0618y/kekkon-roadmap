/**
 * 動き（2026-09-26 採用・見本 /preview-motion/ の #3 #4 #7）。ライブラリは使わない。
 * - #3 カードが順番にふわっと出る：画面の下にあるカードだけ、見えたときに 0.45秒・0.06秒ずらしで一度だけ。
 *      最初から見えているカードは待たずにそのまま出す。
 * - #4 ロードマップの水彩の絵：枠の内側からひらき、少し寄った状態から全体の絵に落ち着く（絵だけ。スタンプは切らない）。
 * - #7 スタンプを押す：「済」になった瞬間だけ朱の印が押しつけられ、紙が少し沈む（0.34秒）。戻すときは動かない。
 * 端末の「動きを減らす」がオンなら、どれも最終の形だけを出す。どの動きも操作を待たせない。
 */

const CARD_SELECTOR = [
  '.paper-card', '.fu-card', '.fu-mini', '.desk-card', '.desk-roles', '.desk-metric', '.amity-brief', '.desk-start', '.money-card',
  '.seed-tomorrow-list>li', '.deadline-block', '.task-row', '.timeline-item', '.next-action', '.seed-hero-card', '.seed-exclude-card',
  '.milestone', '.pair-stamp-card',
].join(',')
const FRAME_SELECTOR = '.illust-frame[data-reveal-key]' // ロードマップの章の絵だけ
const SKIP_INSIDE = '[role=dialog],[data-slot=sheet-content],.desk-chat,.print-book'

const reducedQuery = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null
export const prefersReducedMotion = () => !!reducedQuery?.matches

let started = false

export function startMotion() {
  if (started || typeof window === 'undefined' || typeof document === 'undefined') return
  started = true
  if (!('IntersectionObserver' in window) || !('MutationObserver' in window)) return

  const seen = new WeakSet<Element>()
  const revealedFrames = new Set<string>()

  /* ---------- #3 カード ---------- */
  const clearFx = (el: HTMLElement) => {
    el.classList.remove('fx-wait', 'fx-in')
    el.style.removeProperty('--fx-d')
  }
  const cardIO = new IntersectionObserver((entries) => {
    let batch = 0
    for (const e of entries) {
      const el = e.target as HTMLElement
      if (!el.classList.contains('fx-wait')) {
        cardIO.unobserve(el)
        continue
      }
      if (!e.isIntersecting) continue
      cardIO.unobserve(el)
      if (prefersReducedMotion()) {
        clearFx(el)
        continue
      }
      el.style.setProperty('--fx-d', `${Math.min(batch * 0.06, 0.3)}s`)
      batch += 1
      el.classList.add('fx-in')
      const done = (ev: TransitionEvent) => {
        if (ev.target !== el || ev.propertyName !== 'opacity') return
        el.removeEventListener('transitionend', done)
        clearFx(el)
      }
      el.addEventListener('transitionend', done)
      // transitionend が来ない場合（非表示になった等）の保険
      window.setTimeout(() => clearFx(el), 1200)
    }
  }, {rootMargin: '0px 0px -8% 0px', threshold: 0.12})

  const armCard = (el: HTMLElement) => {
    if (seen.has(el)) return
    seen.add(el)
    if (prefersReducedMotion()) return
    if (el.closest(SKIP_INSIDE)) return
    // 親もカードなら、親だけ動かす
    const parent = el.parentElement?.closest(CARD_SELECTOR)
    if (parent) return
    const r = el.getBoundingClientRect()
    const vh = window.innerHeight || document.documentElement.clientHeight
    // 非表示（大きさ0）や、いま画面に見えているものはそのまま出す
    if (r.width === 0 || r.height === 0) return
    if (r.top < vh * 0.96) return
    el.classList.add('fx-wait')
    cardIO.observe(el)
  }

  /* ---------- #4 水彩の絵 ---------- */
  const frameIO = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue
      const frame = e.target as HTMLElement
      frameIO.unobserve(frame)
      const img = frame.querySelector('img')
      const go = () => {
        if (prefersReducedMotion()) {
          frame.classList.remove('reveal-wait')
          return
        }
        requestAnimationFrame(() => frame.classList.add('reveal-in'))
        const key = frame.dataset.revealKey
        if (key) revealedFrames.add(key)
        window.setTimeout(() => frame.classList.remove('reveal-wait', 'reveal-in'), 1300)
      }
      if (!img || (img.complete && img.naturalWidth > 0)) go()
      else {
        const once = () => {
          img.removeEventListener('load', once)
          img.removeEventListener('error', once)
          go()
        }
        img.addEventListener('load', once)
        img.addEventListener('error', once)
      }
    }
  }, {rootMargin: '0px 0px -6% 0px', threshold: 0.15})

  const armFrame = (frame: HTMLElement) => {
    if (seen.has(frame)) return
    seen.add(frame)
    if (prefersReducedMotion()) return
    const key = frame.dataset.revealKey
    if (key && revealedFrames.has(key)) return // 同じ絵は一度ひらいたら、次からはそのまま
    frame.classList.add('reveal-wait')
    frameIO.observe(frame)
  }

  /* ---------- 新しく出た要素を拾う ---------- */
  let queued: Element[] = []
  let scheduled = false
  const flush = () => {
    scheduled = false
    const roots = queued
    queued = []
    for (const root of roots) {
      if (!root.isConnected) continue
      if (root.matches(FRAME_SELECTOR)) armFrame(root as HTMLElement)
      root.querySelectorAll<HTMLElement>(FRAME_SELECTOR).forEach(armFrame)
      if (root.matches(CARD_SELECTOR)) armCard(root as HTMLElement)
      root.querySelectorAll<HTMLElement>(CARD_SELECTOR).forEach(armCard)
    }
  }
  const queue = (el: Element) => {
    queued.push(el)
    if (!scheduled) {
      scheduled = true
      requestAnimationFrame(flush)
    }
  }

  /* ---------- #7 スタンプ ---------- */
  const sheetOpen = () => !!document.querySelector('[data-slot=sheet-overlay],[data-slot=dialog-overlay]')
  const pressStamp = (pad: HTMLElement) => {
    if (prefersReducedMotion()) return
    const t0 = performance.now()
    const play = () => {
      if (!pad.isConnected) return
      // 項目の画面を閉じている途中なら、閉じ終わってから押す（最大0.9秒）
      if (sheetOpen() && performance.now() - t0 < 900) {
        requestAnimationFrame(play)
        return
      }
      const frame = pad.closest<HTMLElement>('.illust-frame')
      pad.classList.remove('stamp-press')
      frame?.classList.remove('paper-thud')
      void pad.offsetWidth
      pad.classList.add('stamp-press')
      frame?.classList.add('paper-thud')
      window.setTimeout(() => {
        pad.classList.remove('stamp-press')
        frame?.classList.remove('paper-thud')
      }, 480)
      try {
        navigator.vibrate?.(8)
      } catch {
        /* ignore */
      }
    }
    requestAnimationFrame(play)
  }

  const mo = new MutationObserver((records) => {
    for (const r of records) {
      if (r.type === 'childList') {
        r.addedNodes.forEach((n) => {
          if (n.nodeType === 1) queue(n as Element)
        })
      } else if (r.type === 'attributes' && r.attributeName === 'class') {
        const el = r.target as HTMLElement
        if (!el.classList.contains('stamp-pad')) continue
        const was = ` ${r.oldValue || ''} `.includes(' st-done ')
        if (!was && el.classList.contains('st-done')) pressStamp(el)
      }
    }
  })
  mo.observe(document.body, {childList: true, subtree: true, attributes: true, attributeOldValue: true, attributeFilter: ['class']})
  queue(document.body)
}
