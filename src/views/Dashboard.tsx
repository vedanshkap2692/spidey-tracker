import { motion } from 'framer-motion'
import { ArrowRight, BookMarked, Brain, CalendarDays, CheckCircle2, Flame, Gauge, Radar, Scale, Swords, Target, Timer, TrendingUp } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Heatmap } from '../components/Heatmap'
import { Mascot } from '../components/Mascot'
import { Bar, cx, PriorityTag, Ring, StatusPill, subjectColor } from '../components/ui'
import { WebMap } from '../components/WebMap'
import { useStore } from '../lib/store'
import { allLeaves, counts, dueRevisions, minutesOn, practiceStats, progress, resourceStats, streak, suggestions, trackerProgress, walk } from '../lib/tree'
import type { Tracker } from '../lib/types'
import { addDays, daysBetween, fmtMinutes, greeting, parseDay, todayKey } from '../lib/util'

export function Dashboard({ tracker }: { tracker: Tracker }) {
  const [byMarks, setByMarks] = useState(false)
  const go = useStore((s) => s.go)
  const openTopic = useStore((s) => s.openTopic)

  const overall = trackerProgress(tracker, byMarks)
  const c = counts(tracker.nodes)
  const pq = practiceStats(tracker.nodes)
  const rs = resourceStats(tracker.nodes)
  const st = streak(tracker)
  const due = dueRevisions(tracker)
  const dueNow = due.filter((d) => d.days <= 0)
  const todayMin = minutesOn(tracker)
  const totalMin = tracker.activity.reduce((s, a) => s + a.minutes, 0)
  const weekMin = Array.from({ length: 7 }, (_, i) => minutesOn(tracker, todayKey(addDays(new Date(), -i)))).reduce((a, b) => a + b, 0)
  const daysLeft = tracker.targetDate ? daysBetween(new Date(), parseDay(tracker.targetDate)) : null

  // Pace: topics remaining vs. weeks left, compared with the last 14 days.
  const remaining = c.total - c.done
  const recentDone = allLeaves(tracker.nodes).filter((l) => l.completedAt && daysBetween(new Date(l.completedAt), new Date()) < 14).length
  const actualPerWeek = recentDone / 2
  const studyDaysLeft = daysLeft != null ? Math.max(1, daysLeft - 21) : null // keep ~3 weeks for mocks & revision
  const neededPerWeek = studyDaysLeft ? remaining / (studyDaysLeft / 7) : null
  const onTrack = neededPerWeek != null ? actualPerWeek >= neededPerWeek * 0.95 : null

  const weak: { id: string; title: string; conf: number; parent: string }[] = []
  walk(tracker.nodes, (n, parents) => {
    if (!n.children.length && n.status !== 'todo' && (n.confidence || 0) > 0 && (n.confidence || 0) <= 2)
      weak.push({ id: n.id, title: n.title, conf: n.confidence || 0, parent: parents[0]?.title || '' })
  })
  const next = suggestions(tracker, 6)
  const upcoming = (tracker.meta.milestones || [])
    .map((m) => ({ ...m, days: daysBetween(new Date(), parseDay(m.date)) }))
    .filter((m) => m.days >= 0)
    .sort((a, b) => a.days - b.days)

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-5 p-6 pt-2">
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card relative overflow-hidden p-6">
        <div className="halftone pointer-events-none absolute -right-16 -top-24 size-[380px] rounded-full opacity-50" />
        <div className="pointer-events-none absolute -right-20 -bottom-24 size-72 rounded-full bg-[color-mix(in_oklab,var(--suit)_20%,transparent)] blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-6">
          <Mascot size={88} mood={overall > 0.5 ? 'wow' : todayMin > 0 ? 'happy' : 'normal'} className="float" />
          <div className="min-w-[260px] flex-1">
            <div className="text-sm text-ink-3">{greeting()}, web-slinger 🕷️</div>
            <h1 className="comic mt-1 text-4xl leading-none tracking-wide">
              {tracker.emoji} <span className="text-grad">{tracker.name}</span>
            </h1>
            {tracker.tagline && <p className="mt-2 max-w-2xl text-sm text-ink-2">{tracker.tagline}</p>}
            {upcoming.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {upcoming.slice(0, 2).map((m) => (
                  <button
                    key={m.date + m.label}
                    onClick={() => go({ view: 'plan' })}
                    className={cx(
                      'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition hover:brightness-125',
                      m.days <= 7 ? 'border-spidey text-spidey bg-[color-mix(in_oklab,var(--spidey)_10%,transparent)]' : 'border-line text-ink-2',
                    )}
                  >
                    <CalendarDays size={12} />
                    {m.label}
                    <span className="num font-semibold">{m.days === 0 ? 'today' : m.days === 1 ? 'tomorrow' : `in ${m.days}d`}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {daysLeft != null && (
            <div className="flex items-center gap-5">
              <div className="text-right">
                <div className="comic text-6xl leading-none text-spidey">{Math.max(0, daysLeft)}</div>
                <div className="text-xs font-semibold uppercase tracking-wider text-ink-3">days to {tracker.targetLabel}</div>
                <div className="num text-[11px] text-ink-3">{parseDay(tracker.targetDate!).toDateString()}</div>
              </div>
              {neededPerWeek != null && (
                <div className={cx('rounded-2xl border p-3 text-xs', onTrack ? 'border-[color-mix(in_oklab,var(--good)_40%,transparent)]' : 'border-[color-mix(in_oklab,var(--warn)_40%,transparent)]')}>
                  <div className={cx('mb-1 flex items-center gap-1.5 font-semibold', onTrack ? 'text-good' : 'text-warn')}>
                    <Gauge size={14} /> {onTrack ? 'On track' : 'Pick up the pace'}
                  </div>
                  <div className="num text-ink-2">need {neededPerWeek.toFixed(1)} topics/wk</div>
                  <div className="num text-ink-3">doing {actualPerWeek.toFixed(1)} topics/wk</div>
                  <div className="text-[10px] text-ink-3">keeps last 3 weeks for mocks</div>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi icon={<Target size={16} />} label="Syllabus complete" value={`${Math.round(overall * 100)}%`} sub={byMarks ? 'weighted by marks' : 'weighted by study hours'} accent="var(--spidey)">
          <Bar value={overall} className="mt-2" />
        </Kpi>
        <Kpi icon={<CheckCircle2 size={16} />} label={`${tracker.levelNames[1]}s done`} value={`${c.done}/${c.total}`} sub={`${c.learning} in progress`} accent="var(--good)">
          <Bar value={c.total ? c.done / c.total : 0} color="var(--good)" className="mt-2" />
        </Kpi>
        <Kpi icon={<Swords size={16} />} label={`${tracker.practiceLabel} sets solved`} value={`${pq.done}/${pq.total}`} sub="tick links as you solve" accent="var(--suit-2)">
          <Bar value={pq.total ? pq.done / pq.total : 0} color="var(--suit-2)" className="mt-2" />
        </Kpi>
        <Kpi icon={<BookMarked size={16} />} label="Resources finished" value={`${rs.done}/${rs.total}`} sub={`${Math.round(c.hoursDone)}h of ~${Math.round(c.hours)}h syllabus`} accent="var(--s4)">
          <Bar value={rs.total ? rs.done / rs.total : 0} color="var(--s4)" className="mt-2" />
        </Kpi>
        <Kpi icon={<Timer size={16} />} label="Focus today" value={fmtMinutes(todayMin)} sub={`${fmtMinutes(weekMin)} this week · ${fmtMinutes(totalMin)} total`} accent="var(--s5)">
          <Bar value={todayMin / tracker.dailyGoalMinutes} color="var(--s5)" className="mt-2" />
          <div className="num mt-1 text-[10px] text-ink-3">goal {fmtMinutes(tracker.dailyGoalMinutes)}/day</div>
        </Kpi>
        <Kpi icon={<Flame size={16} />} label="Streak" value={`${st.current}d`} sub={`best ${st.best}d · ${dueNow.length} revisions due`} accent="var(--warn)" />
      </div>

      {/* Web + subjects */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.6fr_1fr]">
        <div className="card p-5">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="comic text-2xl tracking-wide">The Web</h2>
            <button onClick={() => go({ view: 'web' })} className="inline-flex items-center gap-1 text-xs text-ink-3 hover:text-ink">
              Full map <ArrowRight size={12} />
            </button>
          </div>
          <WebMap tracker={tracker} size={600} />
        </div>
        <div className="card flex flex-col p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="comic text-2xl tracking-wide">{tracker.levelNames[0]}s</h2>
            <button
              onClick={() => setByMarks((v) => !v)}
              className={cx('inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs transition', byMarks ? 'border-spidey text-spidey' : 'border-line text-ink-3')}
              title="Weight the overall % by exam marks instead of study hours"
            >
              <Scale size={12} /> weight by marks
            </button>
          </div>
          <div className="flex flex-col gap-1">
            {tracker.nodes.map((n, i) => {
              const p = progress(n)
              const cc = counts([n])
              return (
                <button key={n.id} onClick={() => go({ view: 'node', id: n.id })} className="group flex items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-surface-2">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl text-lg" style={{ background: `color-mix(in oklab, ${subjectColor(i)} 16%, transparent)` }}>
                    {n.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-medium">{n.title}</span>
                      <span className="num shrink-0 text-xs text-ink-2">{Math.round(p * 100)}%</span>
                    </div>
                    <Bar value={p} color={subjectColor(i)} className="mt-1.5" h={5} />
                    <div className="num mt-1 flex justify-between text-[10px] text-ink-3">
                      <span>
                        {cc.done}/{cc.total} done
                      </span>
                      <span>{n.weightage || ''}</span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Action row */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Panel title="Next up" icon={<TrendingUp size={16} className="text-spidey" />} hint="in-progress first, then high-priority on heavy subjects">
          {next.length === 0 && <div className="text-sm text-ink-3">Everything is done. Go do a mock test! 🎉</div>}
          {next.map(({ node, parents }) => (
            <button key={node.id} onClick={() => openTopic(node.id)} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-surface-2">
              <StatusPill status={node.status} small />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{node.title}</div>
                <div className="truncate text-[11px] text-ink-3">
                  {parents.map((p) => p.title).join(' › ')}
                </div>
              </div>
              <PriorityTag p={node.priority} />
            </button>
          ))}
        </Panel>
        <Panel title="Spider-Sense" icon={<Radar size={16} className="text-spidey" />} hint="spaced revisions due" action={<button className="text-xs text-ink-3 hover:text-ink" onClick={() => go({ view: 'revise' })}>all →</button>}>
          {due.length === 0 && <div className="text-sm text-ink-3">Mark topics Done and they'll come back here for revision at 1, 3, 7, 15, 30 and 60 days.</div>}
          {due.slice(0, 6).map(({ node, parents, days }) => (
            <button key={node.id} onClick={() => openTopic(node.id)} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-surface-2">
              <CalendarDays size={15} className={days <= 0 ? 'text-spidey' : 'text-ink-3'} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{node.title}</div>
                <div className="truncate text-[11px] text-ink-3">{parents[0]?.title}</div>
              </div>
              <span className={cx('num text-xs', days < 0 ? 'text-bad' : days === 0 ? 'text-spidey' : 'text-ink-3')}>{days < 0 ? `${-days}d late` : days === 0 ? 'today' : `in ${days}d`}</span>
            </button>
          ))}
        </Panel>
        <Panel title="Weak spots" icon={<Brain size={16} className="text-suit-2" />} hint="topics rated ≤ 2★ confidence">
          {weak.length === 0 && <div className="text-sm text-ink-3">Rate your confidence on a topic after solving its PYQs. Anything ≤ 2★ lands here so you can hit it again.</div>}
          {weak.slice(0, 6).map((w) => (
            <button key={w.id} onClick={() => openTopic(w.id)} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-surface-2">
              <Ring value={w.conf / 5} size={22} stroke={3} color="var(--warn)" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{w.title}</div>
                <div className="truncate text-[11px] text-ink-3">{w.parent}</div>
              </div>
              <span className="num text-xs text-warn">{w.conf}★</span>
            </button>
          ))}
        </Panel>
      </div>

      <div className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="comic text-2xl tracking-wide">Swing log</h2>
          <div className="num text-xs text-ink-3">
            {tracker.activity.filter((a) => a.minutes > 0 || a.actions > 0).length} active days · streak {st.current}d (best {st.best}d)
          </div>
        </div>
        <Heatmap tracker={tracker} />
      </div>
    </div>
  )
}

function Kpi({ icon, label, value, sub, accent, children }: { icon: ReactNode; label: string; value: string; sub?: string; accent: string; children?: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card relative overflow-hidden p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-ink-3">
        <span style={{ color: accent }}>{icon}</span>
        {label}
      </div>
      <div className="num mt-2 text-2xl font-semibold">{value}</div>
      {sub && <div className="mt-0.5 truncate text-[11px] text-ink-3">{sub}</div>}
      {children}
    </motion.div>
  )
}

function Panel({ title, icon, hint, children, action }: { title: string; icon: ReactNode; hint?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="card flex flex-col p-5">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-semibold">
          {icon} {title}
        </h3>
        {action}
      </div>
      {hint && <div className="mb-2 text-[11px] text-ink-3">{hint}</div>}
      <div className="flex flex-col">{children}</div>
    </div>
  )
}
