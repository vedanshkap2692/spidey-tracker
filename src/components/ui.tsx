import { AnimatePresence, motion } from 'framer-motion'
import { Circle, CircleCheckBig, CircleDashed, Flame, Star, X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import type { Priority, Status } from '../lib/types'

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ')
}

export const subjectColor = (i: number) => `var(--s${(i % 8) + 1})`

export function Ring({
  value,
  size = 56,
  stroke = 6,
  color = 'var(--spidey)',
  track = 'var(--surface-3)',
  children,
  label,
}: {
  value: number
  size?: number
  stroke?: number
  color?: string
  track?: string
  children?: ReactNode
  label?: string
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }} role="img" aria-label={label || `${Math.round(value * 100)}% complete`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - Math.min(1, Math.max(0, value))) }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  )
}

export function Bar({ value, color = 'var(--spidey)', h = 6, className = '' }: { value: number; color?: string; h?: number; className?: string }) {
  return (
    <div className={cx('w-full overflow-hidden rounded-full bg-surface-3', className)} style={{ height: h }}>
      <motion.div
        className="h-full rounded-full"
        style={{ background: color }}
        initial={{ width: 0 }}
        animate={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  )
}

export const STATUS_META: Record<Status, { label: string; color: string; Icon: typeof Circle }> = {
  todo: { label: 'To do', color: 'var(--ink-3)', Icon: Circle },
  learning: { label: 'Learning', color: 'var(--warn)', Icon: CircleDashed },
  done: { label: 'Done', color: 'var(--good)', Icon: CircleCheckBig },
}

export function StatusPill({ status, onClick, small }: { status: Status; onClick?: () => void; small?: boolean }) {
  const m = STATUS_META[status]
  return (
    <button
      type="button"
      onClick={onClick}
      title={onClick ? 'Click to cycle status' : m.label}
      className={cx(
        'inline-flex items-center gap-1 rounded-full border font-medium transition focus-ring',
        small ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
        onClick && 'hover:brightness-125',
      )}
      style={{ color: m.color, borderColor: `color-mix(in oklab, ${m.color} 40%, transparent)`, background: `color-mix(in oklab, ${m.color} 12%, transparent)` }}
    >
      <m.Icon size={small ? 11 : 13} strokeWidth={2.5} />
      {m.label}
    </button>
  )
}

export const nextStatus = (s: Status): Status => (s === 'todo' ? 'learning' : s === 'learning' ? 'done' : 'todo')

export function PriorityTag({ p }: { p?: Priority }) {
  if (!p) return null
  const map = { high: ['High', 'var(--spidey)'], medium: ['Med', 'var(--suit-2)'], low: ['Low', 'var(--ink-3)'] } as const
  const [l, c] = map[p]
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide" style={{ color: c }}>
      {p === 'high' && <Flame size={11} />}
      {l}
    </span>
  )
}

export function Stars({ value = 0, onChange, size = 14 }: { value?: number; onChange?: (v: number) => void; size?: number }) {
  return (
    <div className="inline-flex items-center gap-0.5" role="radiogroup" aria-label="Confidence">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(value === i ? 0 : i)}
          className="disabled:cursor-default disabled:opacity-100 focus-ring rounded"
          aria-label={`${i} star`}
        >
          <Star size={size} fill={i <= value ? 'var(--warn)' : 'transparent'} stroke={i <= value ? 'var(--warn)' : 'var(--ink-3)'} />
        </button>
      ))}
    </div>
  )
}

export function Btn({
  children,
  onClick,
  variant = 'ghost',
  className = '',
  title,
  type = 'button',
  disabled,
}: {
  children: ReactNode
  onClick?: (e: React.MouseEvent) => void
  variant?: 'primary' | 'ghost' | 'soft' | 'danger'
  className?: string
  title?: string
  type?: 'button' | 'submit'
  disabled?: boolean
}) {
  const v = {
    primary: 'spidey-grad text-white shadow-lg shadow-red-900/20 hover:brightness-110',
    ghost: 'text-ink-2 hover:text-ink hover:bg-surface-3',
    soft: 'bg-surface-3 text-ink hover:brightness-110 border border-line',
    danger: 'text-bad hover:bg-[color-mix(in_oklab,var(--bad)_12%,transparent)]',
  }[variant]
  return (
    <button type={type} title={title} disabled={disabled} onClick={onClick} className={cx('inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium transition focus-ring', v, className)}>
      {children}
    </button>
  )
}

export function Modal({ open, onClose, children, title, wide }: { open: boolean; onClose: () => void; children: ReactNode; title?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 grid place-items-center p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            className={cx('card relative w-full max-h-[85vh] overflow-hidden flex flex-col', wide ? 'max-w-4xl' : 'max-w-lg')}
            initial={{ scale: 0.95, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 10 }}
          >
            {title && (
              <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
                <div className="font-semibold">{title}</div>
                <button onClick={onClose} className="text-ink-3 hover:text-ink" aria-label="Close">
                  <X size={18} />
                </button>
              </div>
            )}
            <div className="scroll-y p-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: ReactNode; count?: number }[]; value: T; onChange: (t: T) => void }) {
  return (
    <div className="flex gap-1 rounded-xl bg-surface-2 p-1 border border-line w-fit">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={cx('relative rounded-lg px-3 py-1.5 text-sm font-medium transition focus-ring', value === t.id ? 'text-ink' : 'text-ink-3 hover:text-ink-2')}
        >
          {value === t.id && <motion.div layoutId={`tab-${tabs.map((x) => x.id).join()}`} className="absolute inset-0 rounded-lg bg-surface-3 border border-line" />}
          <span className="relative inline-flex items-center gap-1.5">
            {t.label}
            {t.count != null && <span className="num text-[11px] text-ink-3">{t.count}</span>}
          </span>
        </button>
      ))}
    </div>
  )
}

export function Empty({ icon, title, hint, action }: { icon?: ReactNode; title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line px-6 py-10 text-center">
      {icon && <div className="text-ink-3">{icon}</div>}
      <div className="font-medium">{title}</div>
      {hint && <div className="max-w-sm text-sm text-ink-3">{hint}</div>}
      {action}
    </div>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-ink-2 font-medium">{label}</span>
      {children}
    </label>
  )
}

export const inputCls =
  'w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm text-ink placeholder:text-ink-3 outline-none focus:border-[var(--suit-2)] focus:ring-2 focus:ring-[color-mix(in_oklab,var(--suit-2)_25%,transparent)]'
