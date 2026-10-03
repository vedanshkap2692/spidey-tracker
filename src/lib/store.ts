import { create } from 'zustand'
import { produce } from 'immer'
import type { AppState, Resource, Status, Tracker, TrackerNode } from './types'
import { findNode } from './tree'
import { instantiate, normalizeNode, type NodeInput, type TemplateInput } from './template'
import { todayKey, uid } from './util'
import gateTemplate from '../../templates/gate-da-2027.json'

export const GATE_TEMPLATE = gateTemplate as unknown as TemplateInput
const LS_KEY = 'spidey-tracker-state'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'local'

export type Route =
  | { view: 'home' }
  | { view: 'web' }
  | { view: 'node'; id: string }
  | { view: 'revise' }
  | { view: 'library' }
  | { view: 'plan' }
  | { view: 'settings' }

interface Store {
  ready: boolean
  state: AppState
  saveStatus: SaveStatus
  route: Route
  openTopicId: string | null
  paletteOpen: boolean
  celebrate: number
  load: () => Promise<void>
  go: (r: Route) => void
  openTopic: (id: string | null) => void
  setPalette: (v: boolean) => void
  mutate: (fn: (s: AppState) => void) => void
  mutateTracker: (fn: (t: Tracker) => void) => void
  mutateNode: (id: string, fn: (n: TrackerNode, t: Tracker) => void, log?: boolean) => void
  setStatus: (id: string, s: Status) => void
  addNode: (parentId: string | null, input: NodeInput) => string
  deleteNode: (id: string) => void
  moveNode: (id: string, dir: -1 | 1) => void
  addResource: (nodeId: string, kind: 'resources' | 'pyqs', r: Partial<Resource>) => void
  logMinutes: (nodeId: string | null, minutes: number) => void
  addTracker: (t: TemplateInput, keepIds?: boolean) => void
}

const empty: AppState = { version: 1, activeTrackerId: null, theme: 'dark', trackers: [] }

let saveTimer: ReturnType<typeof setTimeout> | undefined
let serverOk = true

export const active = (s: AppState) => s.trackers.find((t) => t.id === s.activeTrackerId) || s.trackers[0]

function bumpActivity(t: Tracker, minutes = 0, actions = 1) {
  const key = todayKey()
  let a = t.activity.find((x) => x.date === key)
  if (!a) {
    a = { date: key, minutes: 0, actions: 0 }
    t.activity.push(a)
  }
  a.minutes += minutes
  a.actions += actions
}

function removeNode(nodes: TrackerNode[], id: string): boolean {
  const i = nodes.findIndex((n) => n.id === id)
  if (i >= 0) {
    nodes.splice(i, 1)
    return true
  }
  return nodes.some((n) => removeNode(n.children, id))
}

function siblingsOf(nodes: TrackerNode[], id: string): TrackerNode[] | undefined {
  if (nodes.some((n) => n.id === id)) return nodes
  for (const n of nodes) {
    const s = siblingsOf(n.children, id)
    if (s) return s
  }
}

export const useStore = create<Store>((set, get) => {
  const persist = () => {
    clearTimeout(saveTimer)
    set({ saveStatus: 'saving' })
    saveTimer = setTimeout(async () => {
      const body = JSON.stringify(get().state)
      try {
        localStorage.setItem(LS_KEY, body)
      } catch {
        /* quota — server copy is the source of truth */
      }
      if (!serverOk) return set({ saveStatus: 'local' })
      try {
        const r = await fetch('/api/state', { method: 'PUT', body, headers: { 'Content-Type': 'application/json' } })
        set({ saveStatus: r.ok ? 'saved' : 'error' })
      } catch {
        set({ saveStatus: 'error' })
      }
    }, 500)
  }

  const mutate = (fn: (s: AppState) => void) => {
    set({ state: produce(get().state, fn) })
    persist()
  }

  const mutateTracker = (fn: (t: Tracker) => void) =>
    mutate((s) => {
      const t = active(s)
      if (t) fn(t)
    })

  return {
    ready: false,
    state: empty,
    saveStatus: 'idle',
    route: { view: 'home' },
    openTopicId: null,
    paletteOpen: false,
    celebrate: 0,

    load: async () => {
      let loaded: AppState | null = null
      try {
        const r = await fetch('/api/state')
        if (!r.ok) throw new Error()
        loaded = await r.json()
      } catch {
        serverOk = false
        try {
          loaded = JSON.parse(localStorage.getItem(LS_KEY) || 'null')
        } catch {
          loaded = null
        }
      }
      if (!loaded || !loaded.trackers?.length) {
        const t = instantiate(GATE_TEMPLATE)
        loaded = { ...empty, trackers: [t], activeTrackerId: t.id }
        set({ state: loaded, ready: true })
        persist()
      } else {
        set({ state: { ...empty, ...loaded }, ready: true })
        if (!serverOk) set({ saveStatus: 'local' })
      }
    },

    go: (route) => set({ route, openTopicId: null }),
    openTopic: (id) => set({ openTopicId: id }),
    setPalette: (v) => set({ paletteOpen: v }),
    mutate,
    mutateTracker,

    mutateNode: (id, fn, log = true) =>
      mutateTracker((t) => {
        const n = findNode(t.nodes, id)
        if (!n) return
        fn(n, t)
        if (log) {
          n.lastStudied = new Date().toISOString()
          bumpActivity(t)
        }
      }),

    setStatus: (id, s) => {
      get().mutateNode(id, (n) => {
        if (n.status !== 'done' && s === 'done') {
          n.completedAt = new Date().toISOString()
          n.revisions = []
          set({ celebrate: Date.now() })
        }
        if (s !== 'done') n.completedAt = undefined
        n.status = s
      })
    },

    addNode: (parentId, input) => {
      const node = normalizeNode(input)
      mutateTracker((t) => {
        if (!parentId) t.nodes.push(node)
        else findNode(t.nodes, parentId)?.children.push(node)
      })
      return node.id
    },

    deleteNode: (id) => mutateTracker((t) => void removeNode(t.nodes, id)),

    moveNode: (id, dir) =>
      mutateTracker((t) => {
        const sib = siblingsOf(t.nodes, id)
        if (!sib) return
        const i = sib.findIndex((n) => n.id === id)
        const j = i + dir
        if (j < 0 || j >= sib.length) return
        ;[sib[i], sib[j]] = [sib[j], sib[i]]
      }),

    addResource: (nodeId, kind, r) =>
      get().mutateNode(nodeId, (n) => {
        n[kind].unshift({
          id: uid('r'),
          title: r.title || r.url || 'Untitled',
          url: r.url || '',
          type: r.type || 'website',
          source: r.source,
          note: r.note,
          done: false,
          mine: true,
          fileName: r.fileName,
          size: r.size,
          addedAt: new Date().toISOString(),
        })
      }),

    logMinutes: (nodeId, minutes) =>
      mutateTracker((t) => {
        bumpActivity(t, minutes, 0)
        t.sessions.push({ nodeId: nodeId || '', start: new Date().toISOString(), minutes })
        if (nodeId) {
          const n = findNode(t.nodes, nodeId)
          if (n) {
            n.minutes += minutes
            n.lastStudied = new Date().toISOString()
            if (n.status === 'todo' && !n.children.length) n.status = 'learning'
          }
        }
      }),

    addTracker: (input, keepIds = false) => {
      const t = instantiate(input, keepIds)
      mutate((s) => {
        if (s.trackers.some((x) => x.id === t.id)) t.id = uid('t')
        s.trackers.push(t)
        s.activeTrackerId = t.id
      })
      set({ route: { view: 'home' }, openTopicId: null })
    },
  }
})

export const useTracker = () => useStore((s) => active(s.state))

export async function uploadFile(file: File): Promise<{ url: string; fileName: string; size: number }> {
  const r = await fetch(`/api/upload?name=${encodeURIComponent(file.name)}`, { method: 'POST', body: file })
  if (!r.ok) throw new Error('Upload failed — is the local server running?')
  return r.json()
}

// Handy for debugging from DevTools: __spidey.getState()
;(window as any).__spidey = useStore
