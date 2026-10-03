import { motion } from 'framer-motion'
import { ArrowDown, ArrowUp, BookMarked, ChevronRight, Clock, Layers, NotebookPen, Plus, Search, Settings2, Swords, Lightbulb } from 'lucide-react'
import { useMemo, useState } from 'react'
import { NotesEditor } from '../components/NotesEditor'
import { ResourcePanel } from '../components/Resources'
import { EditNode } from '../components/TopicDrawer'
import { Bar, Btn, cx, Empty, inputCls, nextStatus, PriorityTag, Ring, Stars, StatusPill, subjectColor, Tabs } from '../components/ui'
import { useStore } from '../lib/store'
import { counts, findPath, leafProgress, practiceStats, progress, revisionState } from '../lib/tree'
import type { Status, Tracker, TrackerNode } from '../lib/types'
import { fmtRelative } from '../lib/util'

type Tab = 'items' | 'resources' | 'pyqs' | 'notes' | 'edit'
type Filter = 'all' | Status | 'due'
type Sort = 'order' | 'progress' | 'priority' | 'hours'

export function NodeView({ tracker, id }: { tracker: Tracker; id: string }) {
  const path = findPath(tracker.nodes, id)
  const node = path?.[path.length - 1]
  const [tab, setTab] = useState<Tab>('items')
  const [filter, setFilter] = useState<Filter>('all')
  const [sort, setSort] = useState<Sort>('order')
  const [q, setQ] = useState('')
  const { go, openTopic, setStatus, addNode, moveNode } = useStore.getState()

  const rootIndex = path ? tracker.nodes.findIndex((n) => n.id === path[0].id) : 0
  const color = subjectColor(rootIndex)
  const level = (path?.length || 1) // depth of this node; children are at level index `level`
  const childName = tracker.levelNames[level] || 'Item'

  const items = useMemo(() => {
    if (!node) return []
    let xs = node.children.filter((c) => {
      if (q && !c.title.toLowerCase().includes(q.toLowerCase()) && !c.subtopics.some((s) => s.title.toLowerCase().includes(q.toLowerCase()))) return false
      if (filter === 'all') return true
      if (filter === 'due') return revisionState(c)?.due
      return c.status === filter
    })
    const pr = { high: 0, medium: 1, low: 2, undefined: 3 } as Record<string, number>
    if (sort === 'progress') xs = [...xs].sort((a, b) => progress(a) - progress(b))
    if (sort === 'priority') xs = [...xs].sort((a, b) => pr[String(a.priority)] - pr[String(b.priority)])
    if (sort === 'hours') xs = [...xs].sort((a, b) => (b.estHours || 0) - (a.estHours || 0))
    return xs
  }, [node, filter, sort, q])

  if (!node || !path) return <div className="p-10 text-ink-3">This item no longer exists.</div>

  const p = progress(node)
  const c = counts([node])
  const pq = practiceStats([node])

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-5 p-6 pt-2">
      {/* breadcrumb */}
      <div className="flex items-center gap-1 text-xs text-ink-3">
        <button onClick={() => go({ view: 'home' })} className="hover:text-ink">
          {tracker.emoji} {tracker.name}
        </button>
        {path.map((n) => (
          <span key={n.id} className="inline-flex items-center gap-1">
            <ChevronRight size={12} />
            <button onClick={() => go({ view: 'node', id: n.id })} className={cx('hover:text-ink', n.id === node.id && 'text-ink-2')}>
              {n.title}
            </button>
          </span>
        ))}
      </div>

      {/* header */}
      <motion.div key={node.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card relative overflow-hidden p-6">
        <div className="pointer-events-none absolute -right-20 -top-20 size-80 rounded-full blur-3xl" style={{ background: `color-mix(in oklab, ${color} 22%, transparent)` }} />
        <div className="halftone pointer-events-none absolute right-0 top-0 h-full w-1/3 opacity-30 [mask-image:linear-gradient(to_left,black,transparent)]" />
        <div className="relative flex flex-wrap items-center gap-6">
          <Ring value={p} size={104} stroke={9} color={color}>
            <div className="text-center">
              <div className="text-3xl">{node.icon || '🕸️'}</div>
            </div>
          </Ring>
          <div className="min-w-[260px] flex-1">
            <div className="text-xs font-semibold uppercase tracking-wider" style={{ color }}>
              {tracker.levelNames[level - 1] || 'Section'}
            </div>
            <h1 className="comic text-4xl leading-tight tracking-wide">{node.title}</h1>
            {node.summary && <p className="mt-1 max-w-3xl text-sm leading-relaxed text-ink-2">{node.summary}</p>}
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <Stat label="Complete" value={`${Math.round(p * 100)}%`} />
            <Stat label={`${childName}s done`} value={`${c.done}/${c.total}`} />
            <Stat label={tracker.practiceLabel} value={`${pq.done}/${pq.total}`} />
            {node.weightage ? <Stat label="Exam weight" value={node.weightage} /> : <Stat label="Est. hours" value={`${Math.round(c.hours)}h`} />}
          </div>
        </div>
        {node.tips && (
          <div className="relative mt-4 flex items-start gap-2 rounded-xl bg-surface-2 p-3 text-sm text-ink-2">
            <Lightbulb size={16} className="mt-0.5 shrink-0 text-warn" /> {node.tips}
          </div>
        )}
      </motion.div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs<Tab>
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'items', label: <><Layers size={14} /> {childName}s</>, count: node.children.length },
            { id: 'resources', label: <><BookMarked size={14} /> Resources</>, count: node.resources.length },
            { id: 'pyqs', label: <><Swords size={14} /> {tracker.practiceLabel}</>, count: node.pyqs.length },
            { id: 'notes', label: <><NotebookPen size={14} /> Notes & guide</> },
            { id: 'edit', label: <><Settings2 size={14} /> Edit</> },
          ]}
        />
        {tab === 'items' && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter…" className={cx(inputCls, '!w-44 !py-1.5 pl-8')} />
            </div>
            <select value={filter} onChange={(e) => setFilter(e.target.value as Filter)} className={cx(inputCls, '!w-auto !py-1.5')}>
              <option value="all">All</option>
              <option value="todo">To do</option>
              <option value="learning">Learning</option>
              <option value="done">Done</option>
              <option value="due">Revision due</option>
            </select>
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className={cx(inputCls, '!w-auto !py-1.5')}>
              <option value="order">Syllabus order</option>
              <option value="progress">Least progress</option>
              <option value="priority">Priority</option>
              <option value="hours">Biggest first</option>
            </select>
            <Btn
              variant="primary"
              onClick={() => {
                const title = prompt(`New ${childName.toLowerCase()} in "${node.title}"`)
                if (title) addNode(node.id, { title })
              }}
            >
              <Plus size={15} /> {childName}
            </Btn>
          </div>
        )}
      </div>

      {tab === 'items' &&
        (items.length === 0 ? (
          <Empty icon={<Layers size={24} />} title={node.children.length ? 'Nothing matches' : `No ${childName.toLowerCase()}s yet`} hint="Add one with the button above." />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
            {items.map((t, i) => (
              <TopicCard
                key={t.id}
                t={t}
                i={i}
                color={color}
                practiceLabel={tracker.practiceLabel}
                onOpen={() => (t.children.length ? go({ view: 'node', id: t.id }) : openTopic(t.id))}
                onCycle={() => setStatus(t.id, nextStatus(t.status))}
                onMove={sort === 'order' && filter === 'all' && !q ? (d) => moveNode(t.id, d) : undefined}
              />
            ))}
          </div>
        ))}
      {tab === 'resources' && (
        <div className="card p-5">
          <ResourcePanel nodeId={node.id} kind="resources" items={node.resources} emptyHint="Section-wide resources: full courses, textbooks, playlists, your Drive folder." />
        </div>
      )}
      {tab === 'pyqs' && (
        <div className="card p-5">
          <ResourcePanel nodeId={node.id} kind="pyqs" items={node.pyqs} emptyHint="Section-wide practice sets and PYQ collections." />
        </div>
      )}
      {tab === 'notes' && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1.4fr]">
          {node.notesGuide && (
            <div className="card p-5">
              <h3 className="comic mb-2 text-xl tracking-wide text-spidey">How to get notes for this</h3>
              <div className="whitespace-pre-line text-sm leading-relaxed text-ink-2">{node.notesGuide}</div>
            </div>
          )}
          <div className="card p-5">
            <h3 className="mb-2 font-semibold">My notes</h3>
            <NotesEditor value={node.notes} onChange={(v) => useStore.getState().mutateNode(node.id, (n) => void (n.notes = v), false)} placeholder="Formula sheet, mistakes log, links…" />
          </div>
        </div>
      )}
      {tab === 'edit' && (
        <div className="card max-w-2xl p-5">
          <EditNode node={node} />
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] text-ink-3">{label}</div>
      <div className="num text-lg font-semibold">{value}</div>
    </div>
  )
}

function TopicCard({
  t,
  i,
  color,
  practiceLabel,
  onOpen,
  onCycle,
  onMove,
}: {
  t: TrackerNode
  i: number
  color: string
  practiceLabel: string
  onOpen: () => void
  onCycle: () => void
  onMove?: (d: -1 | 1) => void
}) {
  const p = t.children.length ? progress(t) : leafProgress(t)
  const rev = revisionState(t)
  const subsDone = t.subtopics.filter((s) => s.done).length
  const pqDone = t.pyqs.filter((x) => x.done).length
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(i * 0.025, 0.4) }}
      className="card group relative flex cursor-pointer flex-col gap-3 p-4 transition hover:-translate-y-0.5 hover:border-[color-mix(in_oklab,var(--spidey)_40%,transparent)]"
      onClick={onOpen}
    >
      {t.status === 'done' && <div className="absolute right-0 top-0 h-full w-1 rounded-r-[18px] bg-good" />}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[15px] font-semibold leading-snug">{t.title}</div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-ink-3">
            <PriorityTag p={t.priority} />
            {t.estHours ? (
              <span className="inline-flex items-center gap-1">
                <Clock size={11} /> {t.estHours}h
              </span>
            ) : null}
            {t.children.length > 0 && <span>{t.children.length} nested</span>}
            {t.lastStudied && <span>· {fmtRelative(t.lastStudied)}</span>}
          </div>
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <StatusPill status={t.status} onClick={onCycle} small />
        </div>
      </div>
      <Bar value={p} color={t.status === 'done' ? 'var(--good)' : color} h={5} />
      <div className="flex items-center justify-between text-[11px] text-ink-3">
        <div className="flex items-center gap-3">
          {t.subtopics.length > 0 && (
            <span className="num" title="Checklist">
              ☑ {subsDone}/{t.subtopics.length}
            </span>
          )}
          <span className="num" title="Resources">
            📚 {t.resources.length}
          </span>
          <span className="num" title={practiceLabel}>
            ⚔️ {pqDone}/{t.pyqs.length}
          </span>
          {rev?.due && <span className="font-semibold text-spidey">revise!</span>}
        </div>
        <div className="flex items-center gap-1">
          {(t.confidence || 0) > 0 && <Stars value={t.confidence} size={11} />}
          {onMove && (
            <span className="ml-1 hidden gap-0.5 group-hover:flex" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => onMove(-1)} className="rounded p-0.5 hover:bg-surface-3" aria-label="Move up">
                <ArrowUp size={12} />
              </button>
              <button onClick={() => onMove(1)} className="rounded p-0.5 hover:bg-surface-3" aria-label="Move down">
                <ArrowDown size={12} />
              </button>
            </span>
          )}
        </div>
      </div>
    </motion.div>
  )
}
