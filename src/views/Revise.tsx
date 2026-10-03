import { CalendarClock, RotateCcw } from 'lucide-react'
import { Btn, cx, Empty, Stars } from '../components/ui'
import { useStore } from '../lib/store'
import { dueRevisions, REVISION_INTERVALS } from '../lib/tree'
import type { Tracker } from '../lib/types'

export function Revise({ tracker }: { tracker: Tracker }) {
  const { openTopic, mutateNode } = useStore.getState()
  const all = dueRevisions(tracker)
  const groups = [
    { title: 'Overdue', items: all.filter((d) => d.days < 0), tone: 'var(--bad)' },
    { title: 'Due today', items: all.filter((d) => d.days === 0), tone: 'var(--spidey)' },
    { title: 'This week', items: all.filter((d) => d.days > 0 && d.days <= 7), tone: 'var(--warn)' },
    { title: 'Later', items: all.filter((d) => d.days > 7), tone: 'var(--ink-3)' },
  ]
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5 p-6 pt-2">
      <div className="card relative overflow-hidden p-6">
        <div className="halftone pointer-events-none absolute -right-10 -top-10 size-64 rounded-full opacity-40" />
        <h1 className="comic text-4xl tracking-wide">
          <span className="text-grad">Spider-Sense</span> is tingling…
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-2">
          Every {tracker.levelNames[1].toLowerCase()} you mark <b>Done</b> comes back for spaced revision after {REVISION_INTERVALS.join(', ')} days. Each pass should be quick: re-read your notes, redo 2–3 {tracker.practiceLabel}, then
          rate your confidence. Low-confidence topics show up under Weak spots on the dashboard.
        </p>
      </div>
      {all.length === 0 && <Empty icon={<CalendarClock size={26} />} title="No revisions scheduled yet" hint="Complete a topic and it will appear here." />}
      {groups.map(
        (g) =>
          g.items.length > 0 && (
            <section key={g.title}>
              <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold" style={{ color: g.tone }}>
                {g.title} <span className="num text-ink-3">{g.items.length}</span>
              </h2>
              <div className="card divide-y divide-[var(--line)]">
                {g.items.map(({ node, parents, days }) => (
                  <div key={node.id} className="flex items-center gap-4 px-4 py-3">
                    <div className="flex gap-0.5">
                      {REVISION_INTERVALS.map((_, i) => (
                        <span key={i} className="h-5 w-1.5 rounded-full" style={{ background: i < node.revisions.length ? 'var(--good)' : 'var(--surface-3)' }} />
                      ))}
                    </div>
                    <button onClick={() => openTopic(node.id)} className="min-w-0 flex-1 text-left">
                      <div className="truncate font-medium hover:underline">{node.title}</div>
                      <div className="truncate text-xs text-ink-3">
                        {parents.map((p) => p.title).join(' › ')} · revision {node.revisions.length + 1}/{REVISION_INTERVALS.length}
                      </div>
                    </button>
                    <Stars value={node.confidence} size={13} onChange={(v) => mutateNode(node.id, (n) => void (n.confidence = v), false)} />
                    <span className={cx('num w-20 text-right text-xs', days < 0 ? 'text-bad' : days === 0 ? 'text-spidey' : 'text-ink-3')}>
                      {days < 0 ? `${-days}d late` : days === 0 ? 'today' : `in ${days}d`}
                    </span>
                    <Btn variant={days <= 0 ? 'primary' : 'soft'} className="!py-1 text-xs" onClick={() => mutateNode(node.id, (n) => void n.revisions.push(new Date().toISOString()))}>
                      <RotateCcw size={12} /> Revised
                    </Btn>
                  </div>
                ))}
              </div>
            </section>
          ),
      )}
    </div>
  )
}
