import type { Resource, Tracker, TrackerNode } from './types'
import { addDays, daysBetween, parseDay, todayKey } from './util'

export function walk(nodes: TrackerNode[], fn: (n: TrackerNode, parents: TrackerNode[]) => void, parents: TrackerNode[] = []) {
  for (const n of nodes) {
    fn(n, parents)
    walk(n.children, fn, [...parents, n])
  }
}

export function findNode(nodes: TrackerNode[], id: string): TrackerNode | undefined {
  for (const n of nodes) {
    if (n.id === id) return n
    const f = findNode(n.children, id)
    if (f) return f
  }
}

export function findPath(nodes: TrackerNode[], id: string, path: TrackerNode[] = []): TrackerNode[] | undefined {
  for (const n of nodes) {
    if (n.id === id) return [...path, n]
    const f = findPath(n.children, id, [...path, n])
    if (f) return f
  }
}

export function leaves(node: TrackerNode): TrackerNode[] {
  if (!node.children.length) return [node]
  return node.children.flatMap(leaves)
}

export function allLeaves(nodes: TrackerNode[]) {
  return nodes.flatMap(leaves)
}

const leafHours = (n: TrackerNode): number =>
  n.children.length ? n.children.reduce((s, c) => s + leafHours(c), 0) : n.estHours || 1

/** 0..1 progress of a single leaf: status first, checklist as partial credit. */
export function leafProgress(n: TrackerNode) {
  if (n.status === 'done') return 1
  const subs = n.subtopics.length ? n.subtopics.filter((s) => s.done).length / n.subtopics.length : 0
  const base = Math.min(0.95, subs)
  return n.status === 'learning' ? Math.max(0.1, base) : base * 0.95
}

/** Progress of any node, children weighted by their estimated study hours. */
export function progress(n: TrackerNode): number {
  if (!n.children.length) return leafProgress(n)
  const total = n.children.reduce((s, c) => s + leafHours(c), 0)
  if (!total) return 0
  return n.children.reduce((s, c) => s + progress(c) * leafHours(c), 0) / total
}

/** Overall progress for a tracker. byMarks: weight top-level nodes by exam marks. */
export function trackerProgress(t: Tracker, byMarks = false) {
  if (!t.nodes.length) return 0
  const w = (n: TrackerNode) => (byMarks ? n.marks || 1 : leafHours(n))
  const total = t.nodes.reduce((s, n) => s + w(n), 0)
  return t.nodes.reduce((s, n) => s + progress(n) * w(n), 0) / total
}

export const hoursOf = leafHours

export function practiceStats(nodes: TrackerNode[]) {
  let total = 0
  let done = 0
  walk(nodes, (n) => {
    total += n.pyqs.length
    done += n.pyqs.filter((p) => p.done).length
  })
  return { total, done }
}

export function resourceStats(nodes: TrackerNode[]) {
  let total = 0
  let done = 0
  walk(nodes, (n) => {
    total += n.resources.length
    done += n.resources.filter((p) => p.done).length
  })
  return { total, done }
}

export function counts(nodes: TrackerNode[]) {
  const ls = allLeaves(nodes)
  return {
    total: ls.length,
    done: ls.filter((l) => l.status === 'done').length,
    learning: ls.filter((l) => l.status === 'learning').length,
    todo: ls.filter((l) => l.status === 'todo').length,
    hours: ls.reduce((s, l) => s + (l.estHours || 0), 0),
    hoursDone: ls.reduce((s, l) => s + (l.estHours || 0) * leafProgress(l), 0),
  }
}

// ── Spaced repetition ("Spider-Sense") ────────────────────────────────────────
export const REVISION_INTERVALS = [1, 3, 7, 15, 30, 60]

export function nextRevision(n: TrackerNode): Date | null {
  if (n.status !== 'done' || !n.completedAt) return null
  const k = n.revisions.length
  if (k >= REVISION_INTERVALS.length) return null
  const last = k ? n.revisions[k - 1] : n.completedAt
  return addDays(parseDay(last.slice(0, 10)), REVISION_INTERVALS[k])
}

export function revisionState(n: TrackerNode) {
  const next = nextRevision(n)
  if (!next) return null
  const days = daysBetween(new Date(), next)
  return { next, days, due: days <= 0, overdue: days < 0 }
}

export function dueRevisions(t: Tracker) {
  const out: { node: TrackerNode; parents: TrackerNode[]; days: number; next: Date }[] = []
  walk(t.nodes, (n, parents) => {
    if (n.children.length) return
    const r = revisionState(n)
    if (r) out.push({ node: n, parents, days: r.days, next: r.next })
  })
  return out.sort((a, b) => a.days - b.days)
}

// ── Activity / streaks ────────────────────────────────────────────────────────
export function streak(t: Tracker) {
  const active = new Set(t.activity.filter((a) => a.minutes > 0 || a.actions > 0).map((a) => a.date))
  let d = new Date()
  if (!active.has(todayKey(d))) d = addDays(d, -1) // today not over yet
  let s = 0
  while (active.has(todayKey(d))) {
    s++
    d = addDays(d, -1)
  }
  let best = 0
  let run = 0
  const sorted = [...active].sort()
  let prev: string | null = null
  for (const k of sorted) {
    run = prev && daysBetween(parseDay(prev), parseDay(k)) === 1 ? run + 1 : 1
    best = Math.max(best, run)
    prev = k
  }
  return { current: s, best }
}

export function minutesOn(t: Tracker, key = todayKey()) {
  return t.activity.find((a) => a.date === key)?.minutes || 0
}

/** Suggest what to study next: in-progress first, then high priority on heavy subjects. */
export function suggestions(t: Tracker, limit = 6) {
  const items: { node: TrackerNode; parents: TrackerNode[]; score: number }[] = []
  walk(t.nodes, (n, parents) => {
    if (n.children.length || n.status === 'done') return
    const root = parents[0] || n
    const pr = n.priority === 'high' ? 3 : n.priority === 'low' ? 1 : 2
    const marks = root.marks || 5
    const score = (n.status === 'learning' ? 100 : 0) + pr * 10 + marks + (1 - leafProgress(n)) * 2
    items.push({ node: n, parents, score })
  })
  return items.sort((a, b) => b.score - a.score).slice(0, limit)
}

export function allResources(t: Tracker) {
  const out: { res: Resource; node: TrackerNode; parents: TrackerNode[]; kind: 'resource' | 'practice' }[] = []
  walk(t.nodes, (n, parents) => {
    n.resources.forEach((res) => out.push({ res, node: n, parents, kind: 'resource' }))
    n.pyqs.forEach((res) => out.push({ res, node: n, parents, kind: 'practice' }))
  })
  return out
}
