import { create } from 'zustand'
import { Pause, Play, Square, Timer } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useStore, useTracker } from '../lib/store'
import { findNode } from '../lib/tree'
import { Btn, cx } from './ui'

interface TimerState {
  nodeId: string | null
  running: boolean
  startedAt: number | null // when the current run segment started
  accumulated: number // ms from previous segments
  target: number // minutes
  start: (nodeId: string | null, target?: number) => void
  pause: () => void
  resume: () => void
  stop: (log?: boolean) => void
  setTarget: (m: number) => void
}

const KEY = 'spidey-timer'
const saved = (() => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || 'null')
  } catch {
    return null
  }
})()

export const useTimer = create<TimerState>((set, get) => ({
  nodeId: saved?.nodeId ?? null,
  running: saved?.running ?? false,
  startedAt: saved?.startedAt ?? null,
  accumulated: saved?.accumulated ?? 0,
  target: saved?.target ?? 50,
  start: (nodeId, target) => {
    if (get().running || get().accumulated) get().stop(true)
    set({ nodeId, running: true, startedAt: Date.now(), accumulated: 0, target: target ?? get().target })
  },
  pause: () => {
    const s = get()
    if (!s.running || !s.startedAt) return
    set({ running: false, accumulated: s.accumulated + (Date.now() - s.startedAt), startedAt: null })
  },
  resume: () => set({ running: true, startedAt: Date.now() }),
  stop: (log = true) => {
    const ms = elapsed(get())
    const minutes = Math.round(ms / 60000)
    if (log && minutes >= 1) useStore.getState().logMinutes(get().nodeId, minutes)
    set({ running: false, startedAt: null, accumulated: 0, nodeId: null })
  },
  setTarget: (m) => set({ target: m }),
}))

useTimer.subscribe((s) => {
  try {
    localStorage.setItem(KEY, JSON.stringify({ nodeId: s.nodeId, running: s.running, startedAt: s.startedAt, accumulated: s.accumulated, target: s.target }))
  } catch {
    /* ignore */
  }
})

export const elapsed = (s: Pick<TimerState, 'accumulated' | 'running' | 'startedAt'>) => s.accumulated + (s.running && s.startedAt ? Date.now() - s.startedAt : 0)

const mmss = (ms: number) => {
  const t = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(t / 3600)
  const m = Math.floor((t % 3600) / 60)
  const s = t % 60
  return (h ? `${h}:` : '') + `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function FocusWidget() {
  const t = useTimer()
  const tracker = useTracker()
  const [, tick] = useState(0)
  useEffect(() => {
    if (!t.running) return
    const i = setInterval(() => tick((x) => x + 1), 1000)
    return () => clearInterval(i)
  }, [t.running])

  const ms = elapsed(t)
  const active = t.running || t.accumulated > 0
  const node = t.nodeId && tracker ? findNode(tracker.nodes, t.nodeId) : null
  const frac = Math.min(1, ms / (t.target * 60000))

  // Chime + notification when the target is reached.
  const reached = active && ms >= t.target * 60000
  useEffect(() => {
    if (!reached) return
    try {
      new Notification('Thwip! Session complete 🕷️', { body: `${t.target} minutes${node ? ` on ${node.title}` : ''}. Take a break!` })
    } catch {
      /* notifications unavailable */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reached])

  if (!active)
    return (
      <div className="rounded-2xl border border-line bg-surface-2 p-3">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-ink-2">
          <Timer size={14} className="text-spidey" /> Focus session
        </div>
        <div className="flex gap-1">
          {[25, 50, 90].map((m) => (
            <button
              key={m}
              onClick={() => {
                try {
                  Notification.requestPermission?.()
                } catch {
                  /* ignore */
                }
                t.start(null, m)
              }}
              className="num flex-1 rounded-lg border border-line py-1.5 text-xs text-ink-2 transition hover:border-spidey hover:text-ink"
            >
              {m}m
            </button>
          ))}
        </div>
      </div>
    )

  return (
    <div className={cx('relative overflow-hidden rounded-2xl border p-3', reached ? 'border-good' : 'border-[color-mix(in_oklab,var(--spidey)_45%,transparent)]')}>
      <div className="absolute inset-y-0 left-0 bg-[color-mix(in_oklab,var(--spidey)_12%,transparent)] transition-all" style={{ width: `${frac * 100}%` }} />
      <div className="relative">
        <div className="truncate text-[11px] text-ink-3">{node ? `Focusing · ${node.title}` : 'Focus session'}</div>
        <div className="flex items-center justify-between">
          <div className={cx('num text-2xl font-semibold', reached && 'text-good')}>{mmss(ms)}</div>
          <div className="flex gap-1">
            {t.running ? (
              <Btn className="!p-1.5" onClick={t.pause} title="Pause">
                <Pause size={15} />
              </Btn>
            ) : (
              <Btn className="!p-1.5" onClick={t.resume} title="Resume">
                <Play size={15} />
              </Btn>
            )}
            <Btn className="!p-1.5" onClick={() => t.stop(true)} title="Stop & log time">
              <Square size={14} />
            </Btn>
          </div>
        </div>
        <div className="num text-[11px] text-ink-3">target {t.target}m · logs to today's activity</div>
      </div>
    </div>
  )
}
