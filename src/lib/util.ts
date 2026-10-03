import type { ResourceType } from './types'

export const uid = (p = '') => p + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3)

export const todayKey = (d = new Date()) => {
  const z = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`
}

export const parseDay = (key: string) => {
  const [y, m, d] = key.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const daysBetween = (a: Date, b: Date) =>
  Math.round((parseDay(todayKey(b)).getTime() - parseDay(todayKey(a)).getTime()) / 86400000)

export const addDays = (d: Date, n: number) => {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

export const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

export const fmtRelative = (iso?: string) => {
  if (!iso) return 'never'
  const d = daysBetween(new Date(iso), new Date())
  if (d <= 0) return 'today'
  if (d === 1) return 'yesterday'
  if (d < 30) return `${d}d ago`
  return fmtDate(iso)
}

export const fmtMinutes = (m: number) => {
  if (m < 60) return `${Math.round(m)}m`
  const h = Math.floor(m / 60)
  const r = Math.round(m % 60)
  return r ? `${h}h ${r}m` : `${h}h`
}

export const pct = (x: number) => `${Math.round(x * 100)}%`

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x))

/** Guess a resource type from a URL so pasting a link "just works". */
export function detectType(url: string, fallback: ResourceType = 'website'): ResourceType {
  const u = url.toLowerCase()
  if (u.startsWith('/files/')) return 'upload'
  if (/drive\.google\.com|docs\.google\.com|onedrive|dropbox\.com|notion\.so/.test(u)) return 'drive'
  if (/youtube\.com|youtu\.be|vimeo\.com/.test(u)) return 'video'
  if (/\.pdf($|\?|#)/.test(u)) return 'pdf'
  if (/nptel|coursera|edx|ocw\.mit|udemy|swayam/.test(u)) return 'course'
  if (/gateoverflow|leetcode|hackerrank|indiabix|practice/.test(u)) return 'practice'
  return fallback
}

export function hostOf(url: string) {
  try {
    if (url.startsWith('/')) return 'local file'
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

export const fmtBytes = (b?: number) =>
  b == null ? '' : b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1048576).toFixed(1)} MB`

export function download(name: string, text: string, type = 'application/json') {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([text], { type }))
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

export function greeting() {
  const h = new Date().getHours()
  if (h < 5) return 'Burning the midnight web'
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}
