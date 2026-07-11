'use client'

import { useEffect, useRef, useState } from 'react'

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

type ProgressBarProps = {
  targetPct: number
  accent?: string
  label?: string
  trackClassName?: string
}

/** Scroll-triggered width fill, reusing the app's existing h-2/rounded-full progress-bar shell. */
export function ProgressBar({ targetPct, accent = 'var(--accent-cyan)', label, trackClassName }: ProgressBarProps) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [pct, setPct] = useState(0)
  const reduced = prefersReducedMotion()

  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (reduced || typeof IntersectionObserver === 'undefined') {
      setPct(targetPct)
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry?.isIntersecting) return
        observer.disconnect()
        setPct(targetPct)
      },
      { threshold: 0.4 }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [targetPct, reduced])

  return (
    <div ref={ref}>
      {label ? (
        <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium" style={{ color: 'var(--muted)' }}>
          <span>{label}</span>
          <span>{targetPct}%</span>
        </div>
      ) : null}
      <div
        className={trackClassName ?? 'h-2 w-full overflow-hidden rounded-full'}
        style={{ background: 'color-mix(in srgb, var(--border) 140%, transparent)' }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: accent,
            transition: reduced ? 'none' : 'width 900ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />
      </div>
    </div>
  )
}
