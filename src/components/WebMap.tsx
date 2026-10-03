import { motion } from 'framer-motion'
import { useState } from 'react'
import { useStore } from '../lib/store'
import { leaves, progress, trackerProgress } from '../lib/tree'
import type { Tracker, TrackerNode } from '../lib/types'
import { STATUS_META, subjectColor } from './ui'

type Tip = { x: number; y: number; title: string; sub: string } | null

/**
 * The spider web: every top-level node sits on a spoke; the red web fill is a
 * radar of completion; outer dots are the leaf topics, coloured by status.
 */
export function WebMap({ tracker, size = 560, showTopics = true }: { tracker: Tracker; size?: number; showTopics?: boolean }) {
  const { go, openTopic } = useStore.getState()
  const [tip, setTip] = useState<Tip>(null)
  const [hover, setHover] = useState<string | null>(null)
  const nodes = tracker.nodes
  const N = Math.max(nodes.length, 3)
  const PAD = 110
  const c = size / 2
  const R = size / 2 - 40
  const rSubject = R * 0.6
  const ang = (i: number) => (-Math.PI / 2) + (i * 2 * Math.PI) / N
  const pt = (a: number, r: number) => [c + Math.cos(a) * r, c + Math.sin(a) * r] as const
  const rings = [0.2, 0.36, 0.52, 0.68, 0.84, 1].map((f) => f * R)

  // Web thread between two spokes sags slightly toward the hub.
  const thread = (r: number) =>
    Array.from({ length: N }, (_, i) => {
      const [x1, y1] = pt(ang(i), r)
      const [x2, y2] = pt(ang(i + 1), r)
      const [mx, my] = pt((ang(i) + ang(i + 1)) / 2, r * 0.9)
      return `${i === 0 ? `M${x1},${y1}` : ''} Q${mx},${my} ${x2},${y2}`
    }).join(' ')

  const radar = nodes
    .map((n, i) => {
      const [x, y] = pt(ang(i), Math.max(0.06, progress(n)) * R)
      return `${i ? 'L' : 'M'}${x},${y}`
    })
    .join(' ') + 'Z'

  const overall = trackerProgress(tracker)
  const sector = (2 * Math.PI) / N

  return (
    <div className="relative mx-auto" style={{ width: '100%', maxWidth: size + PAD * 2 }} onMouseLeave={() => setTip(null)}>
      <svg viewBox={`${-PAD} 0 ${size + PAD * 2} ${size}`} width="100%" role="img" aria-label="Web map of progress across all sections">
        <defs>
          <radialGradient id="webfill" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--spidey)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="var(--spidey)" stopOpacity="0.18" />
          </radialGradient>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* spokes */}
        {nodes.map((_, i) => {
          const [x, y] = pt(ang(i), R + 18)
          return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke="var(--ink-3)" strokeOpacity="0.35" strokeWidth="1" />
        })}
        {/* threads */}
        {rings.map((r, k) => (
          <motion.path
            key={r}
            d={thread(r)}
            fill="none"
            stroke="var(--ink-3)"
            strokeOpacity={0.28}
            strokeWidth={1}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.2, delay: k * 0.08, ease: 'easeOut' }}
          />
        ))}
        {/* completion radar */}
        {nodes.length >= 3 && (
          <motion.path
            d={radar}
            fill="url(#webfill)"
            stroke="var(--spidey)"
            strokeWidth="2"
            strokeLinejoin="round"
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ transformOrigin: `${c}px ${c}px` }}
            transition={{ duration: 0.9, delay: 0.3 }}
          />
        )}

        {/* topic dots */}
        {showTopics &&
          nodes.map((n, i) => {
            const ls = leaves(n).filter((l) => l !== n)
            const [sx, sy] = pt(ang(i), rSubject)
            return ls.map((l, j) => {
              const spread = sector * 0.72
              const a = ang(i) - spread / 2 + (ls.length === 1 ? spread / 2 : (j * spread) / (ls.length - 1))
              const r = R * (j % 2 ? 0.86 : 0.97)
              const [x, y] = pt(a, r)
              const m = STATUS_META[l.status]
              const dim = hover && hover !== n.id
              return (
                <g key={l.id} opacity={dim ? 0.25 : 1} style={{ transition: 'opacity .2s' }}>
                  <line x1={sx} y1={sy} x2={x} y2={y} stroke={subjectColor(i)} strokeOpacity="0.25" strokeWidth="1" />
                  <circle
                    cx={x}
                    cy={y}
                    r={l.status === 'todo' ? 4.5 : 5.5}
                    fill={l.status === 'todo' ? 'var(--surface)' : m.color}
                    stroke={l.status === 'todo' ? 'var(--ink-3)' : 'var(--surface)'}
                    strokeWidth={l.status === 'todo' ? 1.2 : 2}
                  />
                  <circle
                    cx={x}
                    cy={y}
                    r={11}
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => setTip({ x, y, title: l.title, sub: `${n.title} · ${m.label}` })}
                    onMouseLeave={() => setTip(null)}
                    onClick={() => {
                      go({ view: 'node', id: n.id })
                      openTopic(l.id)
                    }}
                  />
                </g>
              )
            })
          })}

        {/* subject nodes */}
        {nodes.map((n, i) => {
          const [x, y] = pt(ang(i), rSubject)
          const p = progress(n)
          const rr = 22
          const circ = 2 * Math.PI * rr
          const [lx, ly] = pt(ang(i), R + 22)
          const anchor = Math.abs(Math.cos(ang(i))) < 0.2 ? 'middle' : Math.cos(ang(i)) > 0 ? 'start' : 'end'
          return (
            <g
              key={n.id}
              className="cursor-pointer"
              onClick={() => go({ view: 'node', id: n.id })}
              onMouseEnter={() => {
                setHover(n.id)
                setTip({ x, y: y - 8, title: n.title, sub: `${Math.round(p * 100)}% · ${leaves(n).filter((l) => l.status === 'done').length}/${leaves(n).length} done` })
              }}
              onMouseLeave={() => {
                setHover(null)
                setTip(null)
              }}
            >
              <circle cx={x} cy={y} r={rr + 6} fill="var(--surface)" stroke="var(--line)" />
              <circle cx={x} cy={y} r={rr} fill="none" stroke="var(--surface-3)" strokeWidth="5" />
              <motion.circle
                cx={x}
                cy={y}
                r={rr}
                fill="none"
                stroke={subjectColor(i)}
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={circ}
                transform={`rotate(-90 ${x} ${y})`}
                initial={{ strokeDashoffset: circ }}
                animate={{ strokeDashoffset: circ * (1 - p) }}
                transition={{ duration: 1, delay: 0.4 + i * 0.05 }}
              />
              <text x={x} y={y + 6} textAnchor="middle" fontSize="17">
                {n.icon || '🕸️'}
              </text>
              <text
                x={lx}
                y={ly + 4}
                textAnchor={anchor}
                fontSize="12"
                fontWeight="600"
                fill={hover === n.id ? 'var(--ink)' : 'var(--ink-2)'}
              >
                {n.title.length > 21 ? n.title.slice(0, 20) + '…' : n.title}
              </text>
              <text x={lx} y={ly + 18} textAnchor={anchor} fontSize="11" fill="var(--ink-3)" className="num">
                {Math.round(p * 100)}%
              </text>
            </g>
          )
        })}

        {/* hub */}
        <circle cx={c} cy={c} r={38} fill="var(--surface)" stroke="var(--spidey)" strokeWidth="2" filter="url(#glow)" />
        <text x={c} y={c + 2} textAnchor="middle" fontSize="24" fill="var(--ink)" className="comic">
          {Math.round(overall * 100)}%
        </text>
        <text x={c} y={c + 18} textAnchor="middle" fontSize="9" fill="var(--ink-3)" letterSpacing="1.5">
          OVERALL
        </text>
      </svg>
      {tip && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-xl border border-line bg-surface px-3 py-2 text-xs shadow-xl"
          style={{ left: `${((tip.x + PAD) / (size + PAD * 2)) * 100}%`, top: `calc(${(tip.y / size) * 100}% - 10px)` }}
        >
          <div className="font-semibold text-ink">{tip.title}</div>
          <div className="text-ink-3">{tip.sub}</div>
        </div>
      )}
      <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-[11px] text-ink-3">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-4 rounded-sm border border-spidey bg-[color-mix(in_oklab,var(--spidey)_35%,transparent)]" /> completion web
        </span>
        {(['todo', 'learning', 'done'] as const).map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5">
            <span className="inline-block size-2.5 rounded-full" style={{ background: s === 'todo' ? 'transparent' : STATUS_META[s].color, border: s === 'todo' ? '1px solid var(--ink-3)' : undefined }} />
            {STATUS_META[s].label}
          </span>
        ))}
      </div>
    </div>
  )
}

export type { TrackerNode }
