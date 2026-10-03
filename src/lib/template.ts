import type { Resource, Tracker, TrackerNode } from './types'
import { detectType, uid } from './util'

/** Anything JSON-ish that looks like a node; missing fields are filled in. */
export type NodeInput = Partial<Omit<TrackerNode, 'children' | 'subtopics' | 'resources' | 'pyqs'>> & {
  title: string
  children?: NodeInput[]
  subtopics?: (string | { title: string; done?: boolean; group?: string })[]
  resources?: Partial<Resource>[]
  pyqs?: Partial<Resource>[]
}

export type TemplateInput = Partial<Omit<Tracker, 'nodes'>> & { name: string; nodes: NodeInput[] }

const normRes = (r: Partial<Resource>, mine = false): Resource => ({
  id: r.id || uid('r'),
  title: r.title || r.url || 'Untitled',
  url: r.url || '',
  type: r.type || detectType(r.url || ''),
  source: r.source,
  note: r.note,
  free: r.free,
  done: r.done ?? false,
  starred: r.starred ?? false,
  mine: r.mine ?? mine,
  fileName: r.fileName,
  size: r.size,
  addedAt: r.addedAt,
})

export function normalizeNode(n: NodeInput): TrackerNode {
  return {
    id: n.id || uid('n'),
    title: n.title,
    icon: n.icon,
    color: n.color,
    summary: n.summary,
    tips: n.tips,
    notesGuide: n.notesGuide,
    weightage: n.weightage,
    marks: n.marks,
    status: n.status || 'todo',
    priority: n.priority,
    estHours: n.estHours,
    confidence: n.confidence ?? 0,
    subtopics: (n.subtopics || []).map((s) =>
      typeof s === 'string' ? { id: uid('s'), title: s, done: false } : { id: (s as any).id || uid('s'), title: s.title, done: !!s.done, group: s.group },
    ),
    resources: (n.resources || []).map((r) => normRes(r)),
    pyqs: (n.pyqs || []).map((r) => normRes({ type: 'practice', ...r })),
    notes: n.notes || '',
    completedAt: n.completedAt,
    revisions: n.revisions || [],
    lastStudied: n.lastStudied,
    minutes: n.minutes || 0,
    children: (n.children || []).map(normalizeNode),
  }
}

/** Build a fresh tracker from a template (or re-normalise an imported tracker). */
export function instantiate(t: TemplateInput, keepIds = false): Tracker {
  const tr: Tracker = {
    id: keepIds && t.id ? t.id : uid('t'),
    name: t.name,
    emoji: t.emoji || '🕷️',
    tagline: t.tagline,
    targetDate: t.targetDate,
    targetLabel: t.targetLabel || 'Target',
    dailyGoalMinutes: t.dailyGoalMinutes || 240,
    levelNames: t.levelNames?.length ? t.levelNames : ['Section', 'Topic', 'Item'],
    practiceLabel: t.practiceLabel || 'Practice',
    createdAt: t.createdAt || new Date().toISOString(),
    nodes: t.nodes.map((n) => normalizeNode(keepIds ? n : stripIds(n))),
    meta: t.meta || {},
    activity: keepIds ? t.activity || [] : [],
    sessions: keepIds ? t.sessions || [] : [],
  }
  return tr
}

function stripIds(n: NodeInput): NodeInput {
  return { ...n, id: undefined, children: (n.children || []).map(stripIds) }
}

export const BLANK_TEMPLATE: TemplateInput = {
  name: 'New Tracker',
  emoji: '🕸️',
  tagline: 'With great power comes great responsibility.',
  levelNames: ['Section', 'Topic', 'Item'],
  practiceLabel: 'Practice',
  dailyGoalMinutes: 120,
  nodes: [],
}
