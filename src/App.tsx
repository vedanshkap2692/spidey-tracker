import { AnimatePresence, motion } from 'framer-motion'
import { useEffect } from 'react'
import { Celebrate } from './components/Celebrate'
import { CommandPalette } from './components/CommandPalette'
import { DanglingSpider, Mascot } from './components/Mascot'
import { Sidebar } from './components/Sidebar'
import { TopicDrawer } from './components/TopicDrawer'
import { WebMap } from './components/WebMap'
import { useStore, useTracker } from './lib/store'
import { Dashboard } from './views/Dashboard'
import { Library } from './views/Library'
import { NodeView } from './views/NodeView'
import { Plan } from './views/Plan'
import { Revise } from './views/Revise'
import { Settings } from './views/Settings'

export default function App() {
  const ready = useStore((s) => s.ready)
  const load = useStore((s) => s.load)
  const theme = useStore((s) => s.state.theme)
  const route = useStore((s) => s.route)
  const tracker = useTracker()

  useEffect(() => {
    load()
  }, [load])
  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])
  useEffect(() => {
    if (tracker) document.title = `${tracker.emoji} ${tracker.name} — Spidey Tracker`
  }, [tracker?.name, tracker?.emoji])

  if (!ready || !tracker)
    return (
      <div className="grid h-full place-items-center">
        <Mascot size={96} mood="focused" className="float" />
      </div>
    )

  const key = route.view === 'node' ? route.id : route.view
  return (
    <div className="web-bg relative flex h-full">
      <div className="web-lines" />
      <Sidebar />
      <main className="relative flex min-w-0 flex-1 flex-col">
        <div className="drag h-10 shrink-0" />
        <DanglingSpider length={46} className="pointer-events-none absolute right-24 top-0 z-0 text-ink-3 opacity-50" />
        <div className="scroll-y relative flex-1">
          <AnimatePresence mode="wait">
            <motion.div key={key} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
              {route.view === 'home' && <Dashboard tracker={tracker} />}
              {route.view === 'web' && (
                <div className="mx-auto max-w-[1100px] p-6 pt-2">
                  <h1 className="comic text-4xl tracking-wide">Web Map</h1>
                  <p className="mb-2 text-sm text-ink-3">
                    Each spoke is a {tracker.levelNames[0].toLowerCase()}, the red web shows how far you've got in each, and the outer dots are every {tracker.levelNames[1].toLowerCase()}. Click anything to open it.
                  </p>
                  <div className="card p-6">
                    <WebMap tracker={tracker} size={860} />
                  </div>
                </div>
              )}
              {route.view === 'node' && <NodeView tracker={tracker} id={route.id} />}
              {route.view === 'revise' && <Revise tracker={tracker} />}
              {route.view === 'library' && <Library tracker={tracker} />}
              {route.view === 'plan' && <Plan tracker={tracker} />}
              {route.view === 'settings' && <Settings tracker={tracker} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
      <TopicDrawer />
      <CommandPalette />
      <Celebrate />
    </div>
  )
}
