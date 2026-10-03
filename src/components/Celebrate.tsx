import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useStore } from '../lib/store'
import { Mascot } from './Mascot'

const WORDS = ['THWIP!', 'AMAZING!', 'SPECTACULAR!', 'WEB-TASTIC!', 'NAILED IT!', 'SENSATIONAL!']

/** Comic-book burst + web shots whenever a topic is marked Done. */
export function Celebrate() {
  const stamp = useStore((s) => s.celebrate)
  const [show, setShow] = useState<number | null>(null)
  useEffect(() => {
    if (!stamp) return
    setShow(stamp)
    const t = setTimeout(() => setShow(null), 1900)
    return () => clearTimeout(t)
  }, [stamp])
  const word = show ? WORDS[show % WORDS.length] : ''

  return (
    <AnimatePresence>
      {show && (
        <motion.div key={show} className="pointer-events-none fixed inset-0 z-[70] overflow-hidden" initial={{ opacity: 1 }} exit={{ opacity: 0 }}>
          {/* web shots from bottom-left corner */}
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            {[18, 30, 42, 55, 68].map((a, i) => {
              const r = (a * Math.PI) / 180
              return (
                <motion.line
                  key={a}
                  x1="0"
                  y1="100"
                  x2={Math.cos(r) * 140}
                  y2={100 - Math.sin(r) * 140}
                  stroke="white"
                  strokeOpacity="0.55"
                  strokeWidth="0.25"
                  vectorEffect="non-scaling-stroke"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.35, delay: i * 0.04 }}
                />
              )
            })}
          </svg>
          <div className="absolute inset-0 grid place-items-center">
            <motion.div
              initial={{ scale: 0.2, rotate: -14, opacity: 0 }}
              animate={{ scale: 1, rotate: -6, opacity: 1 }}
              exit={{ scale: 1.3, opacity: 0 }}
              transition={{ type: 'spring', damping: 11, stiffness: 220 }}
              className="relative"
            >
              <svg width="420" height="260" viewBox="0 0 420 260" className="drop-shadow-2xl">
                <polygon
                  points="210,6 246,62 318,20 302,92 412,96 326,140 404,206 296,190 290,254 226,200 172,252 158,192 48,226 104,150 8,118 110,98 70,26 160,64"
                  fill="#ffd23f"
                  stroke="#14060a"
                  strokeWidth="6"
                  strokeLinejoin="round"
                />
                <polygon
                  points="210,34 238,80 292,52 282,104 368,110 300,140 360,188 284,176 278,224 228,184 182,226 170,180 92,200 132,146 54,122 128,108 102,56 168,84"
                  fill="#e0222a"
                />
              </svg>
              <div className="comic absolute inset-0 grid place-items-center text-[54px] text-white [text-shadow:4px_4px_0_#14060a,-2px_-2px_0_#14060a,2px_-2px_0_#14060a,-2px_2px_0_#14060a]">
                {word}
              </div>
            </motion.div>
          </div>
          <motion.div className="absolute bottom-6 right-8" initial={{ y: 120 }} animate={{ y: 0 }} transition={{ type: 'spring', damping: 12 }}>
            <Mascot size={110} mood="happy" />
          </motion.div>
          {Array.from({ length: 22 }).map((_, i) => {
            const a = (i / 22) * Math.PI * 2
            return (
              <motion.span
                key={i}
                className="absolute left-1/2 top-1/2 size-2.5 rounded-full"
                style={{ background: i % 3 === 0 ? '#3b7bff' : i % 3 === 1 ? '#ff3b3b' : '#ffd23f' }}
                initial={{ x: 0, y: 0, opacity: 1 }}
                animate={{ x: Math.cos(a) * (260 + (i % 4) * 50), y: Math.sin(a) * (200 + (i % 3) * 50), opacity: 0 }}
                transition={{ duration: 1.1, ease: 'easeOut' }}
              />
            )
          })}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
