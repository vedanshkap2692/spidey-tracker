import { Copy, Download, FolderOpen, History, Plus, RotateCcw, Trash2, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Btn, cx, Field, inputCls } from '../components/ui'
import { active, GATE_TEMPLATE, useStore } from '../lib/store'
import { BLANK_TEMPLATE, type TemplateInput } from '../lib/template'
import { trackerProgress, walk } from '../lib/tree'
import type { AppState, Tracker } from '../lib/types'
import { download } from '../lib/util'

export function Settings({ tracker }: { tracker: Tracker }) {
  const { mutateTracker, mutate, addTracker } = useStore.getState()
  const state = useStore((s) => s.state)
  const fileRef = useRef<HTMLInputElement>(null)
  const [info, setInfo] = useState<{ dataDir: string } | null>(null)
  const [backups, setBackups] = useState<string[]>([])

  useEffect(() => {
    fetch('/api/info').then((r) => r.json()).then(setInfo).catch(() => {})
    fetch('/api/backups').then((r) => r.json()).then(setBackups).catch(() => {})
  }, [])

  const set = (fn: (t: Tracker) => void) => mutateTracker(fn)

  async function importFile(f: File) {
    try {
      const data = JSON.parse(await f.text())
      if (data.trackers) {
        // full app backup
        if (!confirm('This is a full backup. Add all of its trackers alongside your current ones?')) return
        for (const t of data.trackers as Tracker[]) addTracker(t as unknown as TemplateInput, true)
      } else if (data.nodes) {
        const keep = !!data.activity && confirm('Keep the progress saved in this file? (Cancel = start it fresh as a template)')
        addTracker(data, keep)
      } else alert('Unrecognised file: expected a tracker or template JSON with a "nodes" array.')
    } catch (e: any) {
      alert('Could not read file: ' + e.message)
    }
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5 p-6 pt-2">
      <h1 className="comic text-4xl tracking-wide">Settings</h1>

      <section className="card flex flex-col gap-4 p-5">
        <h2 className="font-semibold">This tracker</h2>
        <div className="grid grid-cols-[80px_1fr] gap-3">
          <Field label="Emoji">
            <input className={inputCls} value={tracker.emoji} onChange={(e) => set((t) => void (t.emoji = e.target.value))} />
          </Field>
          <Field label="Name">
            <input className={inputCls} value={tracker.name} onChange={(e) => set((t) => void (t.name = e.target.value))} />
          </Field>
        </div>
        <Field label="Tagline">
          <input className={inputCls} value={tracker.tagline || ''} onChange={(e) => set((t) => void (t.tagline = e.target.value))} />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Target date">
            <input type="date" className={inputCls} value={tracker.targetDate || ''} onChange={(e) => set((t) => void (t.targetDate = e.target.value || undefined))} />
          </Field>
          <Field label="Target label">
            <input className={inputCls} value={tracker.targetLabel || ''} onChange={(e) => set((t) => void (t.targetLabel = e.target.value))} />
          </Field>
          <Field label="Daily focus goal (min)">
            <input type="number" min={10} className={inputCls} value={tracker.dailyGoalMinutes} onChange={(e) => set((t) => void (t.dailyGoalMinutes = Number(e.target.value) || 60))} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Level names (comma separated)">
            <input
              className={inputCls}
              value={tracker.levelNames.join(', ')}
              onChange={(e) => set((t) => void (t.levelNames = e.target.value.split(',').map((x) => x.trim()).filter(Boolean)))}
            />
          </Field>
          <Field label="Practice label">
            <input className={inputCls} value={tracker.practiceLabel} onChange={(e) => set((t) => void (t.practiceLabel = e.target.value))} />
          </Field>
        </div>
        <Field label="Milestones (one per line: YYYY-MM-DD | label)">
          <MilestoneEditor tracker={tracker} />
        </Field>
        <p className="text-xs text-ink-3">
          Level names and the practice label let you reuse the app for anything: e.g. "Course, Module, Lesson" + "Exercises", or "Area, Skill, Drill" + "Reps".
        </p>
        <div className="flex flex-wrap gap-2 border-t border-line pt-4">
          <Btn variant="soft" onClick={() => download(`${slug(tracker.name)}.json`, JSON.stringify(tracker, null, 2))}>
            <Download size={14} /> Export (with progress)
          </Btn>
          <Btn variant="soft" onClick={() => download(`${slug(tracker.name)}-template.json`, JSON.stringify(asTemplate(tracker), null, 2))}>
            <Copy size={14} /> Export as template
          </Btn>
          <Btn
            variant="danger"
            onClick={() => {
              if (!confirm(`Reset ALL progress in "${tracker.name}"? Statuses, checklists, revisions, activity and confidence are cleared. Resources, uploads and notes stay.`)) return
              set((t) => {
                walk(t.nodes, (n) => {
                  n.status = 'todo'
                  n.subtopics.forEach((s) => (s.done = false))
                  n.revisions = []
                  n.completedAt = undefined
                  n.confidence = 0
                  n.minutes = 0
                  n.lastStudied = undefined
                  n.resources.forEach((r) => (r.done = false))
                  n.pyqs.forEach((r) => (r.done = false))
                })
                t.activity = []
                t.sessions = []
              })
            }}
          >
            <RotateCcw size={14} /> Reset progress
          </Btn>
        </div>
      </section>

      <section className="card flex flex-col gap-3 p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">All trackers</h2>
          <div className="flex gap-2">
            <Btn variant="soft" onClick={() => addTracker(BLANK_TEMPLATE)}>
              <Plus size={14} /> Blank
            </Btn>
            <Btn variant="soft" onClick={() => addTracker(GATE_TEMPLATE)}>
              <Plus size={14} /> GATE DA template
            </Btn>
            <Btn variant="primary" onClick={() => fileRef.current?.click()}>
              <Upload size={14} /> Import JSON
            </Btn>
            <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0])} />
          </div>
        </div>
        <div className="flex flex-col divide-y divide-[var(--line)]">
          {state.trackers.map((t) => (
            <div key={t.id} className="flex items-center gap-3 py-2.5">
              <span className="text-xl">{t.emoji}</span>
              <div className="min-w-0 flex-1">
                <div className={cx('truncate text-sm font-medium', t.id === active(state)?.id && 'text-spidey')}>{t.name}</div>
                <div className="num text-[11px] text-ink-3">{Math.round(trackerProgress(t) * 100)}% · created {new Date(t.createdAt).toLocaleDateString()}</div>
              </div>
              {t.id !== active(state)?.id && (
                <Btn className="!py-1 text-xs" onClick={() => mutate((s) => void (s.activeTrackerId = t.id))}>
                  Switch
                </Btn>
              )}
              <Btn className="!py-1 text-xs" onClick={() => addTracker({ ...(t as any), name: `${t.name} (copy)` }, true)}>
                <Copy size={12} /> Duplicate
              </Btn>
              <Btn
                variant="danger"
                className="!py-1 text-xs"
                disabled={state.trackers.length <= 1}
                onClick={() => {
                  if (!confirm(`Delete tracker "${t.name}" permanently? (Uploaded files stay on disk.)`)) return
                  mutate((s) => {
                    s.trackers = s.trackers.filter((x) => x.id !== t.id)
                    if (s.activeTrackerId === t.id) s.activeTrackerId = s.trackers[0]?.id || null
                  })
                }}
              >
                <Trash2 size={12} />
              </Btn>
            </div>
          ))}
        </div>
      </section>

      <section className="card flex flex-col gap-3 p-5">
        <h2 className="font-semibold">Data & backups</h2>
        <p className="text-sm text-ink-2">
          Everything lives on this computer. Changes are saved instantly to <code className="num rounded bg-surface-3 px-1.5 py-0.5 text-xs">{info?.dataDir || '…'}</code>. That folder holds{' '}
          <code className="num text-xs">db.json</code>, your <code className="num text-xs">uploads/</code> and rolling <code className="num text-xs">backups/</code> (one every 10 minutes while you use the app, last 30 kept).
        </p>
        <div className="flex flex-wrap gap-2">
          <Btn variant="soft" onClick={() => download(`spidey-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(state, null, 2))}>
            <Download size={14} /> Download full backup
          </Btn>
          {info && (
            <Btn variant="soft" onClick={() => navigator.clipboard.writeText(info.dataDir)}>
              <FolderOpen size={14} /> Copy data folder path
            </Btn>
          )}
        </div>
        {backups.length > 0 && (
          <details className="rounded-xl border border-line p-3">
            <summary className="flex cursor-pointer items-center gap-2 text-sm text-ink-2">
              <History size={14} /> Restore an automatic backup ({backups.length})
            </summary>
            <div className="mt-2 flex max-h-56 flex-col gap-1 overflow-auto">
              {backups.map((b) => (
                <div key={b} className="flex items-center justify-between rounded-lg px-2 py-1 text-xs hover:bg-surface-2">
                  <span className="num text-ink-2">{b.replace('db-', '').replace('.json', '').replace(/T(\d\d)-(\d\d)-(\d\d).*/, ' $1:$2')}</span>
                  <Btn
                    className="!py-0.5 text-xs"
                    onClick={async () => {
                      if (!confirm('Replace ALL current data with this backup? (Your current state is itself backed up first.)')) return
                      download(`before-restore-${Date.now()}.json`, JSON.stringify(state))
                      const data: AppState = await (await fetch(`/api/backups/${b}`)).json()
                      mutate((s) => {
                        s.trackers = data.trackers
                        s.activeTrackerId = data.activeTrackerId
                      })
                    }}
                  >
                    Restore
                  </Btn>
                </div>
              ))}
            </div>
          </details>
        )}
      </section>
    </div>
  )
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

function asTemplate(t: Tracker) {
  const clean = JSON.parse(JSON.stringify(t)) as Tracker
  walk(clean.nodes, (n) => {
    n.status = 'todo'
    n.subtopics.forEach((s) => (s.done = false))
    n.revisions = []
    n.completedAt = undefined
    n.confidence = 0
    n.minutes = 0
    n.lastStudied = undefined
    n.notes = ''
    n.resources = n.resources.filter((r) => r.type !== 'upload').map((r) => ({ ...r, done: false, starred: false }))
    n.pyqs = n.pyqs.map((r) => ({ ...r, done: false, starred: false }))
  })
  const { activity, sessions, id, createdAt, ...rest } = clean
  void activity, sessions, id, createdAt
  return rest
}

function MilestoneEditor({ tracker }: { tracker: Tracker }) {
  const toText = () => (tracker.meta.milestones || []).map((m) => `${m.date} | ${m.label}`).join('\n')
  const [text, setText] = useState(toText)
  useEffect(() => setText(toText()), [tracker.id]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <textarea
      rows={5}
      className={cx(inputCls, 'font-mono text-xs')}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() =>
        useStore.getState().mutateTracker((t) => {
          t.meta.milestones = text
            .split('\n')
            .map((l) => l.split('|').map((x) => x.trim()))
            .filter(([d, l]) => /^\d{4}-\d{2}-\d{2}$/.test(d) && l)
            .map(([date, label]) => ({ date, label }))
        })
      }
    />
  )
}
