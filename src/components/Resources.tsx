import { AnimatePresence, motion } from 'framer-motion'
import {
  BookOpen,
  Check,
  ExternalLink,
  FileText,
  FileUp,
  GraduationCap,
  HardDrive,
  Link2,
  NotebookPen,
  Pencil,
  PlayCircle,
  Globe,
  Star,
  Swords,
  Trash2,
  Upload,
  Plus,
} from 'lucide-react'
import { useRef, useState } from 'react'
import type { Resource, ResourceType } from '../lib/types'
import { uploadFile, useStore } from '../lib/store'
import { detectType, fmtBytes, hostOf } from '../lib/util'
import { Btn, cx, Empty, Field, inputCls } from './ui'

export const TYPE_META: Record<ResourceType, { label: string; Icon: typeof Globe; color: string }> = {
  video: { label: 'Video', Icon: PlayCircle, color: 'var(--s8)' },
  pdf: { label: 'PDF', Icon: FileText, color: 'var(--s2)' },
  website: { label: 'Website', Icon: Globe, color: 'var(--s1)' },
  course: { label: 'Course', Icon: GraduationCap, color: 'var(--s7)' },
  book: { label: 'Book', Icon: BookOpen, color: 'var(--s4)' },
  practice: { label: 'Practice', Icon: Swords, color: 'var(--s3)' },
  notes: { label: 'Notes', Icon: NotebookPen, color: 'var(--s5)' },
  drive: { label: 'Drive', Icon: HardDrive, color: 'var(--s6)' },
  upload: { label: 'My file', Icon: FileUp, color: 'var(--spidey)' },
}

export const openUrl = (url: string) => window.open(url, '_blank', 'noopener')

export function ResourceRow({
  r,
  onToggle,
  onStar,
  onDelete,
  onEdit,
  context,
}: {
  r: Resource
  onToggle?: () => void
  onStar?: () => void
  onDelete?: () => void
  onEdit?: () => void
  context?: React.ReactNode
}) {
  const m = TYPE_META[r.type] || TYPE_META.website
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className={cx('group flex items-start gap-3 rounded-xl border border-line bg-surface-2 p-3 transition hover:border-[color-mix(in_oklab,var(--suit-2)_45%,transparent)]', r.done && 'opacity-60')}
    >
      {onToggle && (
        <button
          onClick={onToggle}
          title={r.done ? 'Mark as not done' : 'Mark as done'}
          className={cx('mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border transition focus-ring', r.done ? 'border-transparent bg-good text-white' : 'border-line hover:border-good')}
        >
          {r.done && <Check size={13} strokeWidth={3} />}
        </button>
      )}
      <div className="grid size-8 shrink-0 place-items-center rounded-lg" style={{ background: `color-mix(in oklab, ${m.color} 16%, transparent)`, color: m.color }}>
        <m.Icon size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <button onClick={() => r.url && openUrl(r.url)} className={cx('text-left text-sm font-medium leading-snug hover:underline focus-ring rounded', r.done && 'line-through')}>
          {r.title}
        </button>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-ink-3">
          <span style={{ color: m.color }} className="font-semibold uppercase tracking-wide">
            {m.label}
          </span>
          {r.source && <span>{r.source}</span>}
          {r.url && <span className="truncate max-w-[220px]">{r.type === 'upload' ? r.fileName?.replace(/^\w+-/, '') : hostOf(r.url)}</span>}
          {r.size ? <span>{fmtBytes(r.size)}</span> : null}
          {r.mine && <span className="rounded bg-[color-mix(in_oklab,var(--spidey)_15%,transparent)] px-1.5 text-spidey font-semibold">mine</span>}
          {r.free === false && <span className="text-warn">paid</span>}
          {context}
        </div>
        {r.note && <div className="mt-1 text-xs leading-relaxed text-ink-2">{r.note}</div>}
      </div>
      <div className="flex shrink-0 items-center gap-0.5 opacity-60 transition group-hover:opacity-100">
        {onStar && (
          <button onClick={onStar} title="Star" className="rounded-md p-1.5 hover:bg-surface-3 focus-ring">
            <Star size={14} fill={r.starred ? 'var(--warn)' : 'transparent'} stroke={r.starred ? 'var(--warn)' : 'currentColor'} />
          </button>
        )}
        {r.url && (
          <button onClick={() => openUrl(r.url)} title="Open" className="rounded-md p-1.5 hover:bg-surface-3 focus-ring">
            <ExternalLink size={14} />
          </button>
        )}
        {onEdit && (
          <button onClick={onEdit} title="Edit" className="rounded-md p-1.5 hover:bg-surface-3 focus-ring">
            <Pencil size={14} />
          </button>
        )}
        {onDelete && (
          <button onClick={onDelete} title="Remove" className="rounded-md p-1.5 text-bad hover:bg-surface-3 focus-ring">
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </motion.div>
  )
}

/** Full editable list of resources (or practice links) for one node. */
export function ResourcePanel({ nodeId, kind, items, emptyHint }: { nodeId: string; kind: 'resources' | 'pyqs'; items: Resource[]; emptyHint: string }) {
  const mutateNode = useStore((s) => s.mutateNode)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'todo' | 'mine' | 'starred'>('all')

  const upd = (id: string, fn: (r: Resource) => void, log = true) =>
    mutateNode(
      nodeId,
      (n) => {
        const r = n[kind].find((x) => x.id === id)
        if (r) fn(r)
      },
      log,
    )

  const shown = items.filter((r) => (filter === 'todo' ? !r.done : filter === 'mine' ? r.mine : filter === 'starred' ? r.starred : true))
  const sorted = [...shown].sort((a, b) => Number(!!b.starred) - Number(!!a.starred) || Number(!!a.done) - Number(!!b.done))

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1 text-xs">
          {(['all', 'todo', 'starred', 'mine'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={cx('rounded-full px-2.5 py-1 capitalize transition', filter === f ? 'bg-surface-3 text-ink' : 'text-ink-3 hover:text-ink-2')}>
              {f === 'todo' ? 'pending' : f}
            </button>
          ))}
        </div>
        <Btn variant={adding ? 'soft' : 'primary'} onClick={() => setAdding((v) => !v)}>
          <Plus size={15} /> Add {kind === 'pyqs' ? 'practice link' : 'resource'}
        </Btn>
      </div>
      <AnimatePresence>
        {adding && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <AddResourceForm
              kind={kind}
              onAdd={(r) => {
                useStore.getState().addResource(nodeId, kind, r)
                setAdding(false)
              }}
              onCancel={() => setAdding(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
      {sorted.length === 0 && !adding ? (
        <Empty icon={<Link2 size={22} />} title={items.length ? 'Nothing matches this filter' : 'No links yet'} hint={emptyHint} />
      ) : (
        <div className="flex flex-col gap-2">
          <AnimatePresence initial={false}>
            {sorted.map((r) =>
              editing === r.id ? (
                <AddResourceForm
                  key={r.id}
                  kind={kind}
                  initial={r}
                  onAdd={(v) => {
                    upd(r.id, (x) => Object.assign(x, v), false)
                    setEditing(null)
                  }}
                  onCancel={() => setEditing(null)}
                />
              ) : (
                <ResourceRow
                  key={r.id}
                  r={r}
                  onToggle={() => upd(r.id, (x) => void (x.done = !x.done))}
                  onStar={() => upd(r.id, (x) => void (x.starred = !x.starred), false)}
                  onEdit={() => setEditing(r.id)}
                  onDelete={() => {
                    if (!confirm(`Remove "${r.title}"?`)) return
                    if (r.type === 'upload' && r.fileName) fetch(`/api/upload/${encodeURIComponent(r.fileName)}`, { method: 'DELETE' })
                    mutateNode(nodeId, (n) => void (n[kind] = n[kind].filter((x) => x.id !== r.id)), false)
                  }}
                />
              ),
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

export function AddResourceForm({
  kind,
  initial,
  onAdd,
  onCancel,
}: {
  kind: 'resources' | 'pyqs'
  initial?: Partial<Resource>
  onAdd: (r: Partial<Resource>) => void
  onCancel: () => void
}) {
  const [mode, setMode] = useState<'link' | 'upload'>(initial?.type === 'upload' ? 'upload' : 'link')
  const [url, setUrl] = useState(initial?.url || '')
  const [title, setTitle] = useState(initial?.title || '')
  const [note, setNote] = useState(initial?.note || '')
  const [type, setType] = useState<ResourceType | ''>(initial?.type || '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [drag, setDrag] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const guessed = type || (url ? detectType(url, kind === 'pyqs' ? 'practice' : 'website') : kind === 'pyqs' ? 'practice' : 'website')

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return
    setBusy(true)
    setErr('')
    try {
      for (const f of Array.from(files)) {
        const up = await uploadFile(f)
        onAdd({
          title: files.length === 1 && title ? title : f.name.replace(/\.[^.]+$/, ''),
          url: up.url,
          type: 'upload',
          fileName: up.fileName,
          size: up.size,
          note: note || undefined,
          source: 'Uploaded',
        })
      }
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-surface-2 p-4">
      {!initial && (
        <div className="mb-3 flex gap-1 text-sm">
          <button onClick={() => setMode('link')} className={cx('inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5', mode === 'link' ? 'bg-surface-3 text-ink' : 'text-ink-3')}>
            <Link2 size={14} /> Link / Drive URL
          </button>
          <button onClick={() => setMode('upload')} className={cx('inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5', mode === 'upload' ? 'bg-surface-3 text-ink' : 'text-ink-3')}>
            <Upload size={14} /> Upload file
          </button>
        </div>
      )}
      {mode === 'upload' && !initial ? (
        <div className="flex flex-col gap-3">
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDrag(true)
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDrag(false)
              handleFiles(e.dataTransfer.files)
            }}
            onClick={() => fileRef.current?.click()}
            className={cx(
              'grid cursor-pointer place-items-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition',
              drag ? 'border-spidey bg-[color-mix(in_oklab,var(--spidey)_8%,transparent)]' : 'border-line hover:border-ink-3',
            )}
          >
            <FileUp size={26} className="text-spidey" />
            <div className="text-sm font-medium">{busy ? 'Uploading…' : 'Drop PDFs, images or notes here'}</div>
            <div className="text-xs text-ink-3">or click to browse — files are stored locally on this Mac</div>
            <input ref={fileRef} type="file" multiple hidden onChange={(e) => handleFiles(e.target.files)} />
          </div>
          <input className={inputCls} placeholder="Note (optional) — e.g. 'my handwritten notes, ch 3'" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      ) : (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (!url.trim() && !title.trim()) return
            onAdd({ url: url.trim(), title: title.trim() || hostOf(url) || url, note: note.trim() || undefined, type: guessed })
          }}
        >
          <Field label="URL">
            <input autoFocus className={inputCls} placeholder="https://… (YouTube, Drive, PDF, GATE Overflow…)" value={url} onChange={(e) => setUrl(e.target.value)} />
          </Field>
          <div className="grid grid-cols-[1fr_160px] gap-3">
            <Field label="Title">
              <input className={inputCls} placeholder="What is it?" value={title} onChange={(e) => setTitle(e.target.value)} />
            </Field>
            <Field label="Type">
              <select className={inputCls} value={guessed} onChange={(e) => setType(e.target.value as ResourceType)}>
                {Object.entries(TYPE_META).map(([k, m]) => (
                  <option key={k} value={k}>
                    {m.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Note">
            <input className={inputCls} placeholder="Which chapters / why it's useful (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <div className="flex justify-end gap-2">
            <Btn onClick={onCancel}>Cancel</Btn>
            <Btn type="submit" variant="primary">
              {initial ? 'Save' : 'Add'}
            </Btn>
          </div>
        </form>
      )}
      {err && <div className="mt-2 text-sm text-bad">{err}</div>}
      {mode === 'upload' && !initial && (
        <div className="mt-3 flex justify-end">
          <Btn onClick={onCancel}>Close</Btn>
        </div>
      )}
    </div>
  )
}
