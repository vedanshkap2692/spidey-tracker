// A cute, chibi web-slinger head drawn in SVG. Mood changes the eye lenses.
export type Mood = 'happy' | 'normal' | 'focused' | 'sleepy' | 'wow'

export function Mascot({ size = 64, mood = 'normal', className = '' }: { size?: number; mood?: Mood; className?: string }) {
  const eyes: Record<Mood, { l: string; r: string }> = {
    normal: {
      l: 'M30 52 C 26 40, 38 32, 52 44 C 56 50, 50 60, 40 60 C 34 60, 31 57, 30 52 Z',
      r: 'M90 52 C 94 40, 82 32, 68 44 C 64 50, 70 60, 80 60 C 86 60, 89 57, 90 52 Z',
    },
    happy: {
      l: 'M28 54 C 32 40, 48 38, 54 50 C 46 46, 36 47, 28 54 Z',
      r: 'M92 54 C 88 40, 72 38, 66 50 C 74 46, 84 47, 92 54 Z',
    },
    focused: {
      l: 'M28 50 C 36 44, 48 44, 54 46 C 54 54, 46 58, 38 58 C 32 58, 29 55, 28 50 Z',
      r: 'M92 50 C 84 44, 72 44, 66 46 C 66 54, 74 58, 82 58 C 88 58, 91 55, 92 50 Z',
    },
    sleepy: {
      l: 'M30 54 C 36 50, 46 50, 52 52 C 48 56, 36 57, 30 54 Z',
      r: 'M90 54 C 84 50, 74 50, 68 52 C 72 56, 84 57, 90 54 Z',
    },
    wow: {
      l: 'M26 50 C 24 34, 44 28, 54 44 C 58 54, 50 64, 40 64 C 32 64, 27 58, 26 50 Z',
      r: 'M94 50 C 96 34, 76 28, 66 44 C 62 54, 70 64, 80 64 C 88 64, 93 58, 94 50 Z',
    },
  }
  const e = eyes[mood]
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" className={className} aria-hidden>
      <defs>
        <radialGradient id="mhead" cx="40%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#ff5a52" />
          <stop offset="60%" stopColor="#e0222a" />
          <stop offset="100%" stopColor="#a3101c" />
        </radialGradient>
        <clipPath id="mclip">
          <path d="M60 8 C 96 8, 112 34, 110 62 C 108 92, 86 114, 60 114 C 34 114, 12 92, 10 62 C 8 34, 24 8, 60 8 Z" />
        </clipPath>
      </defs>
      <path
        d="M60 8 C 96 8, 112 34, 110 62 C 108 92, 86 114, 60 114 C 34 114, 12 92, 10 62 C 8 34, 24 8, 60 8 Z"
        fill="url(#mhead)"
        stroke="#3a0a10"
        strokeWidth="3"
      />
      <g clipPath="url(#mclip)" stroke="#5a0b14" strokeWidth="1.3" fill="none" opacity="0.75">
        {/* radial threads from the nose point */}
        {[-80, -55, -30, -10, 10, 30, 55, 80, 120, 150, 180, 210, 240].map((a) => {
          const r = (a * Math.PI) / 180
          return <line key={a} x1="60" y1="66" x2={60 + Math.sin(r) * 90} y2={66 - Math.cos(r) * 90} />
        })}
        {[14, 28, 42, 56].map((r) => (
          <path key={r} d={`M ${60 - r * 1.15} ${66 - r * 0.2} Q 60 ${66 - r * 1.2} ${60 + r * 1.15} ${66 - r * 0.2}`} />
        ))}
        {[22, 40].map((r) => (
          <path key={'b' + r} d={`M ${60 - r} ${66 + r * 0.4} Q 60 ${66 + r * 1.25} ${60 + r} ${66 + r * 0.4}`} />
        ))}
      </g>
      {/* eye lenses */}
      <g stroke="#14060a" strokeWidth="5" strokeLinejoin="round">
        <path d={e.l} fill="#fff" />
        <path d={e.r} fill="#fff" />
      </g>
      <path d={e.l} fill="none" stroke="#c9d8ff" strokeWidth="1.5" opacity=".6" transform="translate(1.5 1.5) scale(0.98)" />
      {/* blush */}
      <ellipse cx="30" cy="76" rx="8" ry="4" fill="#ff9aa2" opacity=".55" />
      <ellipse cx="90" cy="76" rx="8" ry="4" fill="#ff9aa2" opacity=".55" />
      {/* shine */}
      <ellipse cx="40" cy="24" rx="12" ry="6" fill="#fff" opacity=".25" transform="rotate(-20 40 24)" />
    </svg>
  )
}

/** Little dangling spider on a thread — decorative. */
export function DanglingSpider({ length = 40, className = '' }: { length?: number; className?: string }) {
  return (
    <svg width="28" height={length + 24} viewBox={`0 0 28 ${length + 24}`} className={`swing ${className}`} aria-hidden>
      <line x1="14" y1="0" x2="14" y2={length} stroke="currentColor" strokeWidth="1" opacity=".5" />
      <g transform={`translate(14 ${length + 10})`} fill="currentColor">
        <ellipse rx="5" ry="6" />
        <circle cy="-7" r="3.5" />
        {[-1, 1].map((s) =>
          [-4, 0, 4].map((y) => (
            <path key={`${s}${y}`} d={`M0 ${y} q ${s * 7} -4 ${s * 10} ${y > 0 ? 6 : y < 0 ? -2 : 3}`} stroke="currentColor" strokeWidth="1.3" fill="none" />
          )),
        )}
      </g>
    </svg>
  )
}
