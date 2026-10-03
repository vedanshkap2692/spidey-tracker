import { marked } from 'marked'
import { Eye, Pencil } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { cx } from './ui'

marked.setOptions({ gfm: true, breaks: true })

/** Markdown notes with live preview; saves on pause so typing stays snappy. */
export function NotesEditor({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [mode, setMode] = useState<'edit' | 'preview'>(value ? 'preview' : 'edit')
  const [draft, setDraft] = useState(value)
  const t = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => setDraft(value), [value])
  const html = useMemo(() => marked.parse(draft || '') as string, [draft])

  const set = (v: string) => {
    setDraft(v)
    clearTimeout(t.current)
    t.current = setTimeout(() => onChange(v), 400)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="text-xs text-ink-3">Markdown supported — **bold**, lists, `code`, tables, links</div>
        <div className="flex gap-1 text-xs">
          {(['edit', 'preview'] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)} className={cx('inline-flex items-center gap-1 rounded-lg px-2.5 py-1 capitalize', mode === m ? 'bg-surface-3 text-ink' : 'text-ink-3')}>
              {m === 'edit' ? <Pencil size={12} /> : <Eye size={12} />} {m}
            </button>
          ))}
        </div>
      </div>
      {mode === 'edit' ? (
        <textarea
          value={draft}
          onChange={(e) => set(e.target.value)}
          onBlur={() => onChange(draft)}
          placeholder={placeholder}
          className="min-h-[280px] w-full resize-y rounded-xl border border-line bg-surface-2 p-4 font-mono text-[13px] leading-relaxed text-ink outline-none focus:border-[var(--suit-2)]"
        />
      ) : (
        <div
          className="md min-h-[120px] cursor-text rounded-xl border border-line bg-surface-2 p-4"
          onDoubleClick={() => setMode('edit')}
          dangerouslySetInnerHTML={{ __html: html || `<p style="color:var(--ink-3)">Nothing yet — double-click to write.</p>` }}
        />
      )}
    </div>
  )
}
