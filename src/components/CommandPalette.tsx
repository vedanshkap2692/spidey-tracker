import { AnimatePresence, motion } from 'framer-motion'
import { CornerDownLeft, Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore, useTracker, type Route } from '../lib/store'
import { walk } from '../lib/tree'
import { openUrl, TYPE_META } from './Resources'
import { cx, STATUS_META } from './ui'

type Item = { id: string; title: string; sub: string; kind: string; run: () => void; icon?: React.ReactNode }

export function CommandPalette() {
  const open = useStore((s) => s.paletteOpen)
  const setPalette = useStore((s) => s.setPalette)
  const tracker = useTracker()
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPalette(!useStore.getState().paletteOpen)
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [setPalette])

  useEffect(() => {
    if (open) {
      setQ('')
      setSel(0)
      setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [open])

  const items = useMemo<Item[]>(() => {
    if (!tracker) return []
    const { go, openTopic } = useStore.getState()
    const close = () => setPalette(false)
    const nav = (label: string, r: Route): Item => ({ id: 'nav-' + label, title: label, sub: 'Go to page', kind: 'page', run: () => (go(r), close()) })
    const out: Item[] = [
      nav('Dashboard', { view: 'home' }),
      nav('Web Map', { view: 'web' }),
      nav('Spider-Sense (revisions)', { view: 'revise' }),
      nav('Library', { view: 'library' }),
      nav('Battle Plan', { view: 'plan' }),
      nav('Settings', { view: 'settings' }),
    ]
    walk(tracker.nodes, (n, parents) => {
      const m = STATUS_META[n.status]
      out.push({
        id: n.id,
        title: `${n.icon ? n.icon + ' ' : ''}${n.title}`,
        sub: parents.map((p) => p.title).join(' › ') || tracker.levelNames[0],
        kind: n.children.length ? tracker.levelNames[parents.length] || 'section' : m.label,
        icon: <m.Icon size={14} style={{ color: m.color }} />,
        run: () => {
          if (n.children.length) go({ view: 'node', id: n.id })
          else {
            if (parents[0]) go({ view: 'node', id: parents[parents.length - 1].id })
            openTopic(n.id)
          }
          close()
        },
      })
      for (const s of n.subtopics) out.push({ id: s.id, title: s.title, sub: `checklist · ${n.title}`, kind: s.done ? '✓' : 'item', run: () => (openTopic(n.id), close()) })
      for (const r of [...n.resources, ...n.pyqs]) {
        const tm = TYPE_META[r.type] || TYPE_META.website
        out.push({ id: r.id, title: r.title, sub: `${tm.label} · ${n.title}`, kind: 'link', icon: <tm.Icon size={14} style={{ color: tm.color }} />, run: () => (openUrl(r.url), close()) })
      }
    })
    return out
  }, [tracker, setPalette])

  const results = useMemo(() => {
    const words = q.toLowerCase().trim().split(/\s+/).filter(Boolean)
    if (!words.length) return items.slice(0, 8)
    return items
      .map((it) => {
        const t = it.title.toLowerCase()
        const hay = t + ' ' + it.sub.toLowerCase()
        if (!words.every((w) => hay.includes(w))) return null
        const score = (t.startsWith(words[0]) ? 3 : 0) + (t.includes(words.join(' ')) ? 2 : 0) + (it.kind === 'page' ? 1 : 0) + (it.kind === 'item' ? -1 : 0)
        return { it, score }
      })
      .filter((x): x is { it: Item; score: number } => !!x)
      .sort((a, b) => b.score - a.score)
      .slice(0, 40)
      .map((x) => x.it)
  }, [q, items])

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[60] flex items-start justify-center pt-[12vh]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setPalette(false)} />
          <motion.div initial={{ y: -10, scale: 0.98 }} animate={{ y: 0, scale: 1 }} className="card relative w-[640px] max-w-[92vw] overflow-hidden">
            <div className="flex items-center gap-3 border-b border-line px-4">
              <Search size={18} className="text-spidey" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => {
                  setQ(e.target.value)
                  setSel(0)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') (e.preventDefault(), setSel((s) => Math.min(results.length - 1, s + 1)))
                  if (e.key === 'ArrowUp') (e.preventDefault(), setSel((s) => Math.max(0, s - 1)))
                  if (e.key === 'Enter') results[sel]?.run()
                  if (e.key === 'Escape') setPalette(false)
                }}
                placeholder="Search topics, checklist items, resources, pages…"
                className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-3"
              />
              <kbd className="rounded border border-line px-1.5 text-[10px] text-ink-3">esc</kbd>
            </div>
            <div className="scroll-y max-h-[50vh] p-2">
              {results.length === 0 && <div className="p-6 text-center text-sm text-ink-3">No matches.</div>}
              {results.map((r, i) => (
                <button
                  key={r.id + i}
                  onMouseEnter={() => setSel(i)}
                  onClick={r.run}
                  className={cx('flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left', i === sel && 'bg-surface-3')}
                >
                  <span className="grid size-6 place-items-center text-ink-3">{r.icon || '→'}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{r.title}</span>
                    <span className="block truncate text-[11px] text-ink-3">{r.sub}</span>
                  </span>
                  <span className="text-[10px] uppercase tracking-wide text-ink-3">{r.kind}</span>
                  {i === sel && <CornerDownLeft size={13} className="text-ink-3" />}
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
