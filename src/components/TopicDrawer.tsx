import { AnimatePresence, motion } from 'framer-motion'
import {
  BookMarked,
  Brain,
  CalendarClock,
  Check,
  ChevronRight,
  Clock,
  Lightbulb,
  ListChecks,
  NotebookPen,
  Play,
  Plus,
  RotateCcw,
  Settings2,
  Swords,
  Trash2,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useStore, useTracker } from '../lib/store'
import { findPath, leafProgress, REVISION_INTERVALS, revisionState } from '../lib/tree'
import type { Priority, Status, TrackerNode } from '../lib/types'
import { fmtDate, fmtMinutes, fmtRelative, uid } from '../lib/util'
import { NotesEditor } from './NotesEditor'
import { ResourcePanel } from './Resources'
import { Btn, cx, Field, inputCls, PriorityTag, Ring, Stars, STATUS_META, Tabs } from './ui'
import { useTimer } from './FocusTimer'

type Tab = 'overview' | 'resources' | 'pyqs' | 'notes' | 'edit'

export function TopicDrawer() {
  const id = useStore((s) => s.openTopicId)
  const openTopic = useStore((s) => s.openTopic)
  const tracker = useTracker()
  const path = id && tracker ? findPath(tracker.nodes, id) : undefined
  const node = path?.[path.length - 1]
  const [tab, setTab] = useState<Tab>('overview')

  useEffect(() => {
    if (!id) return
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !(e.target as HTMLElement)?.closest('input,textarea')) openTopic(null)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [id, openTopic])

  useEffect(() => setTab('overview'), [id])

  return (
    <AnimatePresence>
      {node && tracker && path && (
        <>
          <motion.div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => openTopic(null)} />
          <motion.aside
            className="fixed right-0 top-0 z-40 flex h-full w-[min(760px,92vw)] flex-col border-l border-line bg-surface shadow-2xl"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 280 }}
          >
            <DrawerHeader node={node} path={path} />
            <div className="border-b border-line px-6 py-3">
              <Tabs<Tab>
                value={tab}
                onChange={setTab}
                tabs={[
                  { id: 'overview', label: <><ListChecks size={14} /> Overview</> },
                  { id: 'resources', label: <><BookMarked size={14} /> Resources</>, count: node.resources.length },
                  { id: 'pyqs', label: <><Swords size={14} /> {tracker.practiceLabel}</>, count: node.pyqs.length },
                  { id: 'notes', label: <><NotebookPen size={14} /> My Notes</> },
                  { id: 'edit', label: <><Settings2 size={14} /> Edit</> },
                ]}
              />
            </div>
            <div className="scroll-y flex-1 px-6 py-5">
              {tab === 'overview' && <Overview node={node} />}
              {tab === 'resources' && (
                <ResourcePanel nodeId={node.id} kind="resources" items={node.resources} emptyHint="Add lecture videos, PDFs, Drive folders or upload your own notes." />
              )}
              {tab === 'pyqs' && (
                <ResourcePanel nodeId={node.id} kind="pyqs" items={node.pyqs} emptyHint="Add links to previous-year questions or practice sets. Tick them off as you solve them." />
              )}
              {tab === 'notes' && <Notes node={node} />}
              {tab === 'edit' && <EditNode node={node} />}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

function DrawerHeader({ node, path }: { node: TrackerNode; path: TrackerNode[] }) {
  const { openTopic, setStatus, go } = useStore.getState()
  const timer = useTimer()
  const p = leafProgress(node)
  return (
    <div className="relative overflow-hidden border-b border-line px-6 pb-5 pt-5">
      <div className="halftone pointer-events-none absolute -right-10 -top-10 size-56 rounded-full opacity-40" />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1 text-xs text-ink-3">
            {path.slice(0, -1).map((p) => (
              <span key={p.id} className="inline-flex items-center gap-1">
                <button className="hover:text-ink" onClick={() => go({ view: 'node', id: p.id })}>
                  {p.icon} {p.title}
                </button>
                <ChevronRight size={12} />
              </span>
            ))}
          </div>
          <h2 className="mt-1 text-2xl font-bold leading-tight">{node.title}</h2>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-ink-3">
            <PriorityTag p={node.priority} />
            {node.estHours ? (
              <span className="inline-flex items-center gap-1">
                <Clock size={12} /> ~{node.estHours}h estimated
              </span>
            ) : null}
            {node.minutes > 0 && <span className="inline-flex items-center gap-1">⏱ {fmtMinutes(node.minutes)} focused</span>}
            <span>Last studied {fmtRelative(node.lastStudied)}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Ring value={p} size={62} stroke={6} color={node.status === 'done' ? 'var(--good)' : 'var(--spidey)'}>
            <span className="num text-sm font-semibold">{Math.round(p * 100)}%</span>
          </Ring>
          <button onClick={() => openTopic(null)} className="self-start rounded-lg p-1.5 text-ink-3 hover:bg-surface-3 hover:text-ink" aria-label="Close">
            <X size={18} />
          </button>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {(['todo', 'learning', 'done'] as Status[]).map((s) => {
          const m = STATUS_META[s]
          const on = node.status === s
          return (
            <button
              key={s}
              onClick={() => setStatus(node.id, s)}
              className={cx('inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm font-medium transition', on ? '' : 'border-line text-ink-3 hover:text-ink-2')}
              style={on ? { color: m.color, borderColor: m.color, background: `color-mix(in oklab, ${m.color} 14%, transparent)` } : undefined}
            >
              <m.Icon size={14} /> {m.label}
            </button>
          )
        })}
        <div className="flex-1" />
        <Btn variant="soft" onClick={() => timer.start(node.id)}>
          <Play size={14} /> Focus on this
        </Btn>
      </div>
    </div>
  )
}

function Overview({ node }: { node: TrackerNode }) {
  const mutateNode = useStore((s) => s.mutateNode)
  const practiceLabel = useTracker()?.practiceLabel ?? 'practice'
  const [newSub, setNewSub] = useState('')
  const rev = revisionState(node)
  const groups: { name: string; items: TrackerNode['subtopics'] }[] = []
  for (const s of node.subtopics) {
    const g = s.group || ''
    const last = groups[groups.length - 1]
    if (last && last.name === g) last.items.push(s)
    else groups.push({ name: g, items: [s] })
  }
  const doneCount = node.subtopics.filter((s) => s.done).length

  return (
    <div className="flex flex-col gap-6">
      {node.summary && <p className="text-sm leading-relaxed text-ink-2">{node.summary}</p>}
      {node.tips && (
        <div className="flex gap-3 rounded-2xl border border-[color-mix(in_oklab,var(--warn)_35%,transparent)] bg-[color-mix(in_oklab,var(--warn)_8%,transparent)] p-4">
          <Lightbulb size={18} className="mt-0.5 shrink-0 text-warn" />
          <div className="text-sm leading-relaxed">
            <div className="comic mb-0.5 text-base text-warn">Spider-tip</div>
            {node.tips}
          </div>
        </div>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-semibold">
            <ListChecks size={16} className="text-spidey" /> Checklist
            <span className="num text-xs font-normal text-ink-3">
              {doneCount}/{node.subtopics.length}
            </span>
          </h3>
          {node.subtopics.length > 0 && (
            <div className="flex gap-1">
              <Btn
                className="!px-2 !py-1 text-xs"
                onClick={() => mutateNode(node.id, (n) => n.subtopics.forEach((s) => (s.done = true)))}
              >
                Tick all
              </Btn>
              <Btn className="!px-2 !py-1 text-xs" onClick={() => mutateNode(node.id, (n) => n.subtopics.forEach((s) => (s.done = false)), false)}>
                Clear
              </Btn>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-4">
          {groups.map((g, gi) => (
            <div key={gi}>
              {g.name && (
                <div className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-ink-3">
                  {g.name}
                  <span className="num font-normal">
                    {g.items.filter((s) => s.done).length}/{g.items.length}
                  </span>
                </div>
              )}
              <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                {g.items.map((s) => (
                  <div key={s.id} className="group flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-surface-2">
                    <button
                      onClick={() => mutateNode(node.id, (n) => {
                        const x = n.subtopics.find((y) => y.id === s.id)
                        if (x) x.done = !x.done
                        if (n.status === 'todo') n.status = 'learning'
                      })}
                      className={cx('grid size-[18px] shrink-0 place-items-center rounded-md border transition', s.done ? 'border-transparent bg-good text-white' : 'border-line hover:border-good')}
                      aria-label={s.done ? 'Uncheck' : 'Check'}
                    >
                      {s.done && <Check size={12} strokeWidth={3} />}
                    </button>
                    <span className={cx('flex-1 text-sm', s.done && 'text-ink-3 line-through')}>{s.title}</span>
                    <button
                      onClick={() => mutateNode(node.id, (n) => void (n.subtopics = n.subtopics.filter((y) => y.id !== s.id)), false)}
                      className="text-ink-3 opacity-0 transition hover:text-bad group-hover:opacity-100"
                      aria-label="Remove item"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (!newSub.trim()) return
            mutateNode(node.id, (n) => void n.subtopics.push({ id: uid('s'), title: newSub.trim(), done: false, group: n.subtopics[n.subtopics.length - 1]?.group }), false)
            setNewSub('')
          }}
        >
          <input className={inputCls} placeholder="Add a checklist item…" value={newSub} onChange={(e) => setNewSub(e.target.value)} />
          <Btn type="submit" variant="soft">
            <Plus size={14} />
          </Btn>
        </form>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-line bg-surface-2 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Brain size={15} className="text-suit-2" /> Confidence
          </div>
          <Stars size={20} value={node.confidence} onChange={(v) => mutateNode(node.id, (n) => void (n.confidence = v), false)} />
          <div className="mt-2 text-xs text-ink-3">Rate after solving {practiceLabel}. Low-confidence topics show up as weak spots.</div>
        </div>
        <div className="rounded-2xl border border-line bg-surface-2 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <CalendarClock size={15} className="text-spidey" /> Spider-Sense revision
          </div>
          {node.status !== 'done' ? (
            <div className="text-xs text-ink-3">Mark the topic Done to start its spaced-revision schedule ({REVISION_INTERVALS.join(', ')} days).</div>
          ) : (
            <>
              <div className="flex gap-1">
                {REVISION_INTERVALS.map((d, i) => (
                  <div
                    key={d}
                    title={`Revision ${i + 1} (+${d}d)`}
                    className="h-2 flex-1 rounded-full"
                    style={{ background: i < node.revisions.length ? 'var(--good)' : i === node.revisions.length && rev?.due ? 'var(--spidey)' : 'var(--surface-3)' }}
                  />
                ))}
              </div>
              <div className="mt-2 text-xs text-ink-2">
                {rev ? (rev.due ? <span className="font-semibold text-spidey">Revision due {rev.overdue ? `(${-rev.days}d overdue)` : 'today'}</span> : <>Next revision {fmtDate(rev.next.toISOString())}</>) : 'All revisions complete 🎉'}
              </div>
              <div className="mt-2 flex gap-2">
                <Btn
                  variant="soft"
                  className="!py-1 text-xs"
                  disabled={node.revisions.length >= REVISION_INTERVALS.length}
                  onClick={() => mutateNode(node.id, (n) => void n.revisions.push(new Date().toISOString()))}
                >
                  <RotateCcw size={12} /> Revised today
                </Btn>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  )
}

function Notes({ node }: { node: TrackerNode }) {
  const mutateNode = useStore((s) => s.mutateNode)
  const mine = node.resources.filter((r) => r.mine)
  return (
    <div className="flex flex-col gap-6">
      <NotesEditor
        value={node.notes}
        onChange={(v) => mutateNode(node.id, (n) => void (n.notes = v), false)}
        placeholder={`# ${node.title}\n\n- Key formulas\n- Traps I fell for\n- PYQ insights`}
      />
      <section>
        <h3 className="mb-2 text-sm font-semibold">My uploads & links for this topic</h3>
        <ResourcePanel nodeId={node.id} kind="resources" items={mine} emptyHint="Upload handwritten-note PDFs or paste a Google Drive link — they'll be tagged 'mine'." />
      </section>
    </div>
  )
}

export function EditNode({ node }: { node: TrackerNode }) {
  const { mutateNode, deleteNode, openTopic, addNode } = useStore.getState()
  const levelNames = useTracker()?.levelNames
  const set = (fn: (n: TrackerNode) => void) => mutateNode(node.id, fn, false)
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-[80px_1fr] gap-3">
        <Field label="Icon">
          <input className={inputCls} value={node.icon || ''} onChange={(e) => set((n) => void (n.icon = e.target.value))} placeholder="🕸️" />
        </Field>
        <Field label="Title">
          <input className={inputCls} value={node.title} onChange={(e) => set((n) => void (n.title = e.target.value))} />
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Priority">
          <select className={inputCls} value={node.priority || ''} onChange={(e) => set((n) => void (n.priority = (e.target.value || undefined) as Priority))}>
            <option value="">—</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </Field>
        <Field label="Est. hours">
          <input type="number" min={0} className={inputCls} value={node.estHours ?? ''} onChange={(e) => set((n) => void (n.estHours = e.target.value ? Number(e.target.value) : undefined))} />
        </Field>
        <Field label="Marks weight">
          <input type="number" min={0} className={inputCls} value={node.marks ?? ''} onChange={(e) => set((n) => void (n.marks = e.target.value ? Number(e.target.value) : undefined))} />
        </Field>
      </div>
      <Field label="Summary">
        <textarea rows={2} className={inputCls} value={node.summary || ''} onChange={(e) => set((n) => void (n.summary = e.target.value))} />
      </Field>
      <Field label="Tip">
        <textarea rows={2} className={inputCls} value={node.tips || ''} onChange={(e) => set((n) => void (n.tips = e.target.value))} />
      </Field>
      <div className="flex flex-wrap justify-between gap-2 border-t border-line pt-4">
        <Btn
          variant="soft"
          onClick={() => {
            const title = prompt(`New ${levelNames?.[2]?.toLowerCase() || 'sub-item'} under "${node.title}"`)
            if (title) {
              addNode(node.id, { title })
              openTopic(null)
              useStore.getState().go({ view: 'node', id: node.id })
            }
          }}
        >
          <Plus size={14} /> Add nested {levelNames?.[2]?.toLowerCase() || 'item'}
        </Btn>
        <Btn
          variant="danger"
          onClick={() => {
            if (confirm(`Delete "${node.title}" and everything inside it?`)) {
              openTopic(null)
              deleteNode(node.id)
            }
          }}
        >
          <Trash2 size={14} /> Delete
        </Btn>
      </div>
    </div>
  )
}
