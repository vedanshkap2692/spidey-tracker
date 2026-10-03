import { Ban, CircleAlert, ExternalLink, FileText, Info, Swords, Trophy, Wrench } from 'lucide-react'
import { useState } from 'react'
import { openUrl, TYPE_META } from '../components/Resources'
import { Empty, subjectColor } from '../components/ui'
import type { LinkItem, Tracker } from '../lib/types'
import { daysBetween, hostOf, parseDay } from '../lib/util'
import { CalendarDays } from 'lucide-react'

/** Exam facts, weightage, strategy, full papers, mocks, and the syllabus boundary. */
export function Plan({ tracker }: { tracker: Tracker }) {
  const m = tracker.meta
  const hasAny = m.examInfo?.length || m.strategy?.length || m.papers?.length || m.weightage?.length
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5 p-6 pt-2">
      <div>
        <h1 className="comic text-4xl tracking-wide">Battle Plan</h1>
        <p className="text-sm text-ink-3">{m.examName || tracker.name}</p>
      </div>
      {!hasAny && <Empty title="No plan info for this tracker" hint="Templates can include exam info, strategy and links — import one from Settings." />}

      {!!m.examInfo?.length && (
        <div className="card grid grid-cols-1 gap-x-8 gap-y-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
          {m.examInfo.map((x) => (
            <div key={x.label}>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">{x.label}</div>
              <div className="mt-0.5 text-sm leading-relaxed">{linkify(x.value)}</div>
            </div>
          ))}
        </div>
      )}

      {!!m.milestones?.length && <Milestones items={m.milestones} />}

      {!!m.weightage?.length && <Weightage tracker={tracker} />}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {!!m.strategy?.length && (
          <div className="card p-5">
            <h2 className="mb-3 flex items-center gap-2 font-semibold">
              <Trophy size={16} className="text-warn" /> Strategy
            </h2>
            <ol className="flex flex-col gap-2.5">
              {m.strategy.map((s, i) => (
                <li key={i} className="flex gap-3 text-sm leading-relaxed text-ink-2">
                  <span className="comic mt-0.5 grid size-6 shrink-0 place-items-center rounded-lg bg-spidey text-sm text-white">{i + 1}</span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
        <div className="flex flex-col gap-5">
          {!!m.papers?.length && <LinkCard title="Full papers & answer keys" icon={<FileText size={16} style={{ color: "var(--s2)" }} />} items={m.papers} />}
          {!!m.mockTests?.length && <LinkCard title="Mock tests" icon={<Swords size={16} className="text-suit-2" />} items={m.mockTests} />}
        </div>
      </div>

      {!!m.generalResources?.length && <LinkCard title="Cross-subject must-haves" icon={<Wrench size={16} className="text-good" />} items={m.generalResources} grid />}

      {(!!m.outOfScope?.length || !!m.dontSkip?.length) && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {!!m.outOfScope?.length && (
            <div className="card p-5">
              <h2 className="mb-1 flex items-center gap-2 font-semibold">
                <Ban size={16} className="text-bad" /> Out of scope: don't go down these rabbit holes
              </h2>
              <p className="mb-3 text-xs text-ink-3">Related to data science but not in the official syllabus. The official syllabus sets the boundary.</p>
              <div className="flex flex-wrap gap-1.5">
                {m.outOfScope.map((x) => (
                  <span key={x} className="rounded-full border border-line px-2.5 py-1 text-xs text-ink-3 line-through decoration-[var(--bad)]/60">
                    {x}
                  </span>
                ))}
              </div>
            </div>
          )}
          {!!m.dontSkip?.length && (
            <div className="card p-5">
              <h2 className="mb-1 flex items-center gap-2 font-semibold">
                <CircleAlert size={16} className="text-warn" /> Small but tested: don't skip
              </h2>
              <p className="mb-3 text-xs text-ink-3">These look minor in the syllabus but are explicitly named, so questions can come from them.</p>
              <div className="flex flex-wrap gap-1.5">
                {m.dontSkip.map((x) => (
                  <span key={x} className="rounded-full border border-[color-mix(in_oklab,var(--warn)_40%,transparent)] bg-[color-mix(in_oklab,var(--warn)_10%,transparent)] px-2.5 py-1 text-xs">
                    {x}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function linkify(s: string) {
  const parts = s.split(/(https?:\/\/\S+)/g)
  return parts.map((p, i) =>
    /^https?:\/\//.test(p) ? (
      <button key={i} onClick={() => openUrl(p)} className="text-suit-2 hover:underline">
        {hostOf(p)}
      </button>
    ) : (
      <span key={i}>{p}</span>
    ),
  )
}

function LinkCard({ title, icon, items, grid }: { title: string; icon: React.ReactNode; items: LinkItem[]; grid?: boolean }) {
  return (
    <div className="card p-5">
      <h2 className="mb-3 flex items-center gap-2 font-semibold">
        {icon} {title}
      </h2>
      <div className={grid ? 'grid grid-cols-1 gap-2 md:grid-cols-2' : 'flex flex-col gap-2'}>
        {items.map((x) => {
          const tm = TYPE_META[x.type || 'website'] || TYPE_META.website
          return (
            <button key={x.url + x.title} onClick={() => openUrl(x.url)} className="group flex items-start gap-3 rounded-xl border border-line bg-surface-2 p-3 text-left transition hover:border-ink-3">
              <tm.Icon size={16} className="mt-0.5 shrink-0" style={{ color: tm.color }} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium leading-snug group-hover:underline">{x.title}</div>
                <div className="text-[11px] text-ink-3">
                  {x.source || hostOf(x.url)}
                  {x.free === false && <span className="ml-1.5 text-warn">paid</span>}
                  {x.free === true && <span className="ml-1.5 text-good">free</span>}
                </div>
                {x.note && <div className="mt-1 text-xs leading-relaxed text-ink-2">{x.note}</div>}
              </div>
              <ExternalLink size={13} className="mt-1 shrink-0 text-ink-3" />
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Weightage({ tracker }: { tracker: Tracker }) {
  const m = tracker.meta
  const years = m.weightageYears || []
  const rows = m.weightage || []
  const max = Math.max(1, ...rows.flatMap((r) => r.marks.map((x) => x || 0)))
  const [hover, setHover] = useState<string | null>(null)
  const avg = (r: (number | null)[]) => {
    const v = r.filter((x): x is number => x != null)
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0
  }
  const sorted = [...rows].sort((a, b) => avg(b.marks) - avg(a.marks))
  // Year shading: one hue (sequential), older years lighter.
  const shade = (k: number) => `color-mix(in oklab, var(--suit-2) ${40 + (60 * (k + 1)) / years.length}%, var(--surface-3))`
  return (
    <div className="card p-5">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold">
          <Info size={16} className="text-suit-2" /> Marks by subject in past papers
        </h2>
        <div className="flex items-center gap-3 text-[11px] text-ink-3">
          {years.map((y, k) => (
            <span key={y} className="inline-flex items-center gap-1.5">
              <span className="inline-block size-2.5 rounded-sm" style={{ background: shade(k) }} /> {y}
            </span>
          ))}
        </div>
      </div>
      {m.weightageNote && <p className="mb-3 text-[11px] text-ink-3">{m.weightageNote}</p>}
      <div className="flex flex-col gap-2">
        {sorted.map((r) => {
          const idx = tracker.nodes.findIndex((n) => n.title === r.subject)
          return (
            <div key={r.subject} className="grid grid-cols-[200px_1fr_64px] items-center gap-3" onMouseEnter={() => setHover(r.subject)} onMouseLeave={() => setHover(null)}>
              <div className="flex items-center gap-2 truncate text-sm">
                <span className="inline-block size-2.5 shrink-0 rounded-full" style={{ background: idx >= 0 ? subjectColor(idx) : 'var(--ink-3)' }} />
                {r.subject}
              </div>
              <div className="flex flex-col gap-[2px]">
                {r.marks.map((v, k) => (
                  <div key={k} className="flex items-center gap-2">
                    <div className="h-2 rounded-r-[4px]" style={{ width: `${((v || 0) / max) * 100}%`, background: shade(k), minWidth: v ? 4 : 0 }} />
                    {hover === r.subject && <span className="num text-[10px] text-ink-2">{v ?? '—'}</span>}
                  </div>
                ))}
              </div>
              <div className="num text-right text-sm text-ink-2" title="Average marks">
                ~{avg(r.marks).toFixed(1)}
              </div>
            </div>
          )
        })}
      </div>
      <div className="mt-2 text-right text-[10px] text-ink-3">right column = average marks across years · hover a row for exact values</div>
    </div>
  )
}

function Milestones({ items }: { items: { date: string; label: string }[] }) {
  const xs = [...items].sort((a, b) => a.date.localeCompare(b.date)).map((m) => ({ ...m, days: daysBetween(new Date(), parseDay(m.date)) }))
  const nextIdx = xs.findIndex((x) => x.days >= 0)
  return (
    <div className="card p-5">
      <h2 className="mb-4 flex items-center gap-2 font-semibold">
        <CalendarDays size={16} className="text-spidey" /> Milestones
      </h2>
      <div className="relative flex gap-0 overflow-x-auto pb-2">
        {xs.map((m, i) => {
          const past = m.days < 0
          const isNext = i === nextIdx
          return (
            <div key={m.date + m.label} className="relative flex min-w-[140px] flex-1 flex-col items-start pr-3">
              <div className="flex w-full items-center">
                <span
                  className="z-10 size-3 shrink-0 rounded-full border-2"
                  style={{ borderColor: past ? 'var(--good)' : isNext ? 'var(--spidey)' : 'var(--ink-3)', background: past ? 'var(--good)' : isNext ? 'var(--spidey)' : 'var(--surface)' }}
                />
                {i < xs.length - 1 && <span className="h-[2px] flex-1" style={{ background: past ? 'var(--good)' : 'var(--line)' }} />}
              </div>
              <div className={`num mt-2 text-[11px] ${isNext ? 'font-semibold text-spidey' : 'text-ink-3'}`}>
                {parseDay(m.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                {!past && ` · ${m.days === 0 ? 'today' : `${m.days}d`}`}
              </div>
              <div className={`mt-0.5 text-xs leading-snug ${past ? 'text-ink-3 line-through' : 'text-ink-2'}`}>{m.label}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
