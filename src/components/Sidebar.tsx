import { BookMarked, ChevronDown, Cloud, CloudOff, Compass, LayoutDashboard, Map, Moon, Network, Radar, Search, Settings, Sun } from 'lucide-react'
import { useState } from 'react'
import { active, useStore, useTracker, type Route } from '../lib/store'
import { dueRevisions, progress, trackerProgress } from '../lib/tree'
import { daysBetween, parseDay } from '../lib/util'
import { FocusWidget } from './FocusTimer'
import { Mascot, type Mood } from './Mascot'
import { cx, Ring, subjectColor } from './ui'

export function Sidebar() {
  const route = useStore((s) => s.route)
  const go = useStore((s) => s.go)
  const state = useStore((s) => s.state)
  const saveStatus = useStore((s) => s.saveStatus)
  const mutate = useStore((s) => s.mutate)
  const setPalette = useStore((s) => s.setPalette)
  const tracker = useTracker()
  const [switcher, setSwitcher] = useState(false)
  if (!tracker) return null

  const overall = trackerProgress(tracker)
  const due = dueRevisions(tracker).filter((d) => d.days <= 0).length
  const days = tracker.targetDate ? daysBetween(new Date(), parseDay(tracker.targetDate)) : null
  const mood: Mood = overall > 0.75 ? 'wow' : overall > 0.3 ? 'happy' : due > 5 ? 'focused' : 'normal'

  const nav: { r: Route; label: string; Icon: typeof Map; badge?: number }[] = [
    { r: { view: 'home' }, label: 'Dashboard', Icon: LayoutDashboard },
    { r: { view: 'web' }, label: 'Web Map', Icon: Network },
    { r: { view: 'revise' }, label: 'Spider-Sense', Icon: Radar, badge: due },
    { r: { view: 'library' }, label: 'Library', Icon: BookMarked },
    { r: { view: 'plan' }, label: 'Battle Plan', Icon: Compass },
    { r: { view: 'settings' }, label: 'Settings', Icon: Settings },
  ]
  const isOn = (r: Route) => r.view === route.view

  return (
    <aside className="relative z-10 flex h-full w-[264px] shrink-0 flex-col border-r border-line bg-[color-mix(in_oklab,var(--surface)_70%,transparent)] backdrop-blur-xl">
      <div className="drag h-10 shrink-0" />
      <div className="no-drag flex items-center gap-3 px-5 pb-4">
        <Mascot size={46} mood={mood} className="float drop-shadow-[0_6px_14px_rgba(226,34,42,0.35)]" />
        <div className="leading-none">
          <div className="comic text-[26px] text-grad">Spidey</div>
          <div className="comic -mt-0.5 text-[15px] tracking-[0.18em] text-ink-2">TRACKER</div>
        </div>
      </div>

      <div className="no-drag relative px-3">
        <button onClick={() => setSwitcher((v) => !v)} className="flex w-full items-center gap-2.5 rounded-2xl border border-line bg-surface-2 px-3 py-2.5 text-left transition hover:border-ink-3">
          <span className="text-xl">{tracker.emoji}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{tracker.name}</span>
            <span className="num block text-[11px] text-ink-3">{Math.round(overall * 100)}% complete</span>
          </span>
          <ChevronDown size={15} className={cx('text-ink-3 transition', switcher && 'rotate-180')} />
        </button>
        {switcher && (
          <div className="card absolute inset-x-3 top-full z-30 mt-1 p-1.5">
            {state.trackers.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  mutate((s) => void (s.activeTrackerId = t.id))
                  go({ view: 'home' })
                  setSwitcher(false)
                }}
                className={cx('flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm hover:bg-surface-3', t.id === active(state)?.id && 'bg-surface-3')}
              >
                <span>{t.emoji}</span>
                <span className="flex-1 truncate">{t.name}</span>
                <span className="num text-[11px] text-ink-3">{Math.round(trackerProgress(t) * 100)}%</span>
              </button>
            ))}
            <button
              onClick={() => {
                go({ view: 'settings' })
                setSwitcher(false)
              }}
              className="mt-1 w-full rounded-xl border-t border-line px-2.5 py-2 text-left text-xs text-ink-3 hover:text-ink"
            >
              + New tracker / import…
            </button>
          </div>
        )}
      </div>

      <button
        onClick={() => setPalette(true)}
        className="no-drag mx-3 mt-3 flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm text-ink-3 transition hover:text-ink-2"
      >
        <Search size={14} /> Search anything
        <kbd className="num ml-auto rounded-md border border-line bg-surface-2 px-1.5 text-[10px]">⌘K</kbd>
      </button>

      <nav className="no-drag mt-4 flex flex-col gap-0.5 px-3">
        {nav.map(({ r, label, Icon, badge }) => (
          <button
            key={label}
            onClick={() => go(r)}
            className={cx(
              'relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition',
              isOn(r) ? 'bg-surface-3 text-ink' : 'text-ink-2 hover:bg-surface-2 hover:text-ink',
            )}
          >
            {isOn(r) && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-spidey" />}
            <Icon size={17} className={isOn(r) ? 'text-spidey' : ''} />
            {label}
            {!!badge && <span className="num ml-auto rounded-full bg-spidey px-1.5 py-0.5 text-[10px] font-bold text-white">{badge}</span>}
          </button>
        ))}
      </nav>

      <div className="no-drag mt-5 px-5 text-[11px] font-semibold uppercase tracking-wider text-ink-3">{tracker.levelNames[0]}s</div>
      <div className="no-drag scroll-y mt-1.5 flex-1 px-3 pb-2">
        {tracker.nodes.map((n, i) => {
          const p = progress(n)
          const on = route.view === 'node' && route.id === n.id
          return (
            <button
              key={n.id}
              onClick={() => go({ view: 'node', id: n.id })}
              className={cx('flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left text-[13px] transition', on ? 'bg-surface-3 text-ink' : 'text-ink-2 hover:bg-surface-2')}
            >
              <Ring value={p} size={20} stroke={3} color={subjectColor(i)} />
              <span className="flex-1 truncate">{n.title}</span>
              <span className="num text-[11px] text-ink-3">{Math.round(p * 100)}</span>
            </button>
          )
        })}
      </div>

      <div className="no-drag flex flex-col gap-2 border-t border-line p-3">
        <FocusWidget />
        <div className="flex items-center justify-between px-1 text-[11px] text-ink-3">
          <span className="inline-flex items-center gap-1.5">
            {saveStatus === 'error' || saveStatus === 'local' ? <CloudOff size={12} className="text-warn" /> : <Cloud size={12} />}
            {{ idle: 'Synced', saving: 'Saving…', saved: 'All changes saved', error: 'Save failed', local: 'Browser-only mode' }[saveStatus]}
          </span>
          {days != null && <span className="num">{days}d to go</span>}
          <button
            onClick={() => mutate((s) => void (s.theme = s.theme === 'dark' ? 'light' : 'dark'))}
            className="rounded-md p-1 hover:bg-surface-3 hover:text-ink"
            title="Toggle theme"
          >
            {state.theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </div>
      </div>
    </aside>
  )
}
