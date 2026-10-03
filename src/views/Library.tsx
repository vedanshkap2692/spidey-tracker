import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ResourceRow, TYPE_META } from '../components/Resources'
import { cx, Empty, inputCls } from '../components/ui'
import { useStore } from '../lib/store'
import { allResources } from '../lib/tree'
import type { ResourceType, Tracker } from '../lib/types'

/** Every link and file in the tracker, searchable and filterable in one place. */
export function Library({ tracker }: { tracker: Tracker }) {
  const [q, setQ] = useState('')
  const [kind, setKind] = useState<'all' | 'resource' | 'practice'>('all')
  const [type, setType] = useState<ResourceType | 'all'>('all')
  const [subject, setSubject] = useState('all')
  const [only, setOnly] = useState<'any' | 'mine' | 'starred' | 'pending'>('any')
  const { mutateNode, openTopic } = useStore.getState()

  const all = useMemo(() => allResources(tracker), [tracker])
  const list = all.filter(({ res, parents, node, kind: k }) => {
    if (kind !== 'all' && k !== kind) return false
    if (type !== 'all' && res.type !== type) return false
    if (subject !== 'all' && (parents[0]?.id || node.id) !== subject) return false
    if (only === 'mine' && !res.mine) return false
    if (only === 'starred' && !res.starred) return false
    if (only === 'pending' && res.done) return false
    if (q) {
      const hay = `${res.title} ${res.note || ''} ${res.source || ''} ${node.title}`.toLowerCase()
      if (!q.toLowerCase().split(/\s+/).every((w) => hay.includes(w))) return false
    }
    return true
  })
  const typeCounts = all.reduce<Record<string, number>>((m, x) => ((m[x.res.type] = (m[x.res.type] || 0) + 1), m), {})

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5 p-6 pt-2">
      <div>
        <h1 className="comic text-4xl tracking-wide">Library</h1>
        <p className="text-sm text-ink-3">
          {all.length} links & files across the whole tracker · {all.filter((x) => x.res.mine).length} added by you
        </p>
      </div>
      <div className="card flex flex-wrap items-center gap-2 p-3">
        <div className="relative min-w-[240px] flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
          <input className={cx(inputCls, 'pl-9')} placeholder="Search titles, notes, sources…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className={cx(inputCls, '!w-auto')} value={subject} onChange={(e) => setSubject(e.target.value)}>
          <option value="all">All {tracker.levelNames[0].toLowerCase()}s</option>
          {tracker.nodes.map((n) => (
            <option key={n.id} value={n.id}>
              {n.icon} {n.title}
            </option>
          ))}
        </select>
        <select className={cx(inputCls, '!w-auto')} value={kind} onChange={(e) => setKind(e.target.value as any)}>
          <option value="all">Resources + {tracker.practiceLabel}</option>
          <option value="resource">Resources only</option>
          <option value="practice">{tracker.practiceLabel} only</option>
        </select>
        <select className={cx(inputCls, '!w-auto')} value={only} onChange={(e) => setOnly(e.target.value as any)}>
          <option value="any">Any state</option>
          <option value="pending">Not finished</option>
          <option value="starred">Starred</option>
          <option value="mine">Added by me</option>
        </select>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Chip on={type === 'all'} onClick={() => setType('all')}>
          All <span className="num text-ink-3">{all.length}</span>
        </Chip>
        {(Object.keys(TYPE_META) as ResourceType[])
          .filter((t) => typeCounts[t])
          .map((t) => {
            const m = TYPE_META[t]
            return (
              <Chip key={t} on={type === t} onClick={() => setType(t)}>
                <m.Icon size={13} style={{ color: m.color }} /> {m.label} <span className="num text-ink-3">{typeCounts[t]}</span>
              </Chip>
            )
          })}
      </div>
      {list.length === 0 ? (
        <Empty title="Nothing found" hint="Try clearing a filter." />
      ) : (
        <div className="flex flex-col gap-2">
          {list.slice(0, 400).map(({ res, node, parents, kind: k }) => {
            const field = k === 'practice' ? 'pyqs' : 'resources'
            return (
              <ResourceRow
                key={res.id}
                r={res}
                onToggle={() => mutateNode(node.id, (n) => {
                  const r = n[field].find((x) => x.id === res.id)
                  if (r) r.done = !r.done
                })}
                onStar={() => mutateNode(node.id, (n) => {
                  const r = n[field].find((x) => x.id === res.id)
                  if (r) r.starred = !r.starred
                }, false)}
                context={
                  <button
                    className="text-suit-2 hover:underline"
                    onClick={() => (node.children.length ? useStore.getState().go({ view: 'node', id: node.id }) : openTopic(node.id))}
                  >
                    {[...parents, node].map((p) => p.title).join(' › ')}
                  </button>
                }
              />
            )
          })}
          {list.length > 400 && <div className="text-center text-xs text-ink-3">Showing first 400 — refine your search.</div>}
        </div>
      )}
    </div>
  )
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={cx('inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition', on ? 'border-spidey bg-[color-mix(in_oklab,var(--spidey)_12%,transparent)] text-ink' : 'border-line text-ink-2 hover:text-ink')}>
      {children}
    </button>
  )
}
