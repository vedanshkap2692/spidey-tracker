import { useMemo, useState } from 'react'
import type { Tracker } from '../lib/types'
import { addDays, fmtMinutes, todayKey } from '../lib/util'

const level = (minutes: number, actions: number) => {
  if (minutes >= 240) return 4
  if (minutes >= 120) return 3
  if (minutes >= 45) return 2
  if (minutes > 0 || actions > 0) return 1
  return 0
}

/** GitHub-style activity heatmap — one sequential red ramp, darker = more focused time. */
export function Heatmap({ tracker, weeks = 52 }: { tracker: Tracker; weeks?: number }) {
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null)
  const map = useMemo(() => new Map(tracker.activity.map((a) => [a.date, a])), [tracker.activity])
  const today = new Date()
  const start = addDays(today, -(weeks * 7 - 1) - today.getDay())
  const cells: { key: string; d: Date; w: number; dow: number }[] = []
  for (let i = 0; ; i++) {
    const d = addDays(start, i)
    if (d > today) break
    cells.push({ key: todayKey(d), d, w: Math.floor(i / 7), dow: d.getDay() })
  }
  const cs = 13
  const gap = 3
  const W = (weeks + 1) * (cs + gap) + 28
  const H = 7 * (cs + gap) + 20
  const months: { x: number; label: string }[] = []
  cells.forEach((c) => {
    if (c.d.getDate() <= 7 && c.dow === 0) months.push({ x: c.w, label: c.d.toLocaleString(undefined, { month: 'short' }) })
  })

  return (
    <div className="relative mx-auto" style={{ maxWidth: W * 1.25 }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: W * 1.25 }} role="img" aria-label="Study activity heatmap">
        {months.map((m) => (
          <text key={m.x} x={28 + m.x * (cs + gap)} y={10} fontSize="10" fill="var(--ink-3)">
            {m.label}
          </text>
        ))}
        {['Mon', 'Wed', 'Fri'].map((d, i) => (
          <text key={d} x={0} y={20 + (i * 2 + 1) * (cs + gap) + 10} fontSize="9" fill="var(--ink-3)">
            {d}
          </text>
        ))}
        {cells.map((c) => {
          const a = map.get(c.key)
          const lv = level(a?.minutes || 0, a?.actions || 0)
          const x = 28 + c.w * (cs + gap)
          const y = 16 + c.dow * (cs + gap)
          return (
            <rect
              key={c.key}
              x={x}
              y={y}
              width={cs}
              height={cs}
              rx={3}
              fill={`var(--heat-${lv})`}
              stroke={c.key === todayKey() ? 'var(--ink)' : 'none'}
              strokeWidth={1.2}
              onMouseEnter={() =>
                setTip({
                  x: x + cs / 2,
                  y,
                  text: `${c.d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })} — ${a ? `${fmtMinutes(a.minutes)} focused · ${a.actions} updates` : 'no activity'}`,
                })
              }
              onMouseLeave={() => setTip(null)}
            />
          )
        })}
      </svg>
      {tip && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs shadow-xl"
          style={{ left: `${(tip.x / W) * 100}%`, top: `calc(${(tip.y / H) * 100}% - 6px)` }}
        >
          {tip.text}
        </div>
      )}
      <div className="mt-1 flex items-center justify-end gap-1.5 text-[10px] text-ink-3">
        Less
        {[0, 1, 2, 3, 4].map((l) => (
          <span key={l} className="inline-block size-2.5 rounded-[3px]" style={{ background: `var(--heat-${l})` }} />
        ))}
        More <span className="ml-2">(1 = any update, 4 = 4h+ focus)</span>
      </div>
    </div>
  )
}
