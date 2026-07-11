import type { CSSProperties, ReactNode } from 'react'

type GlassCardProps = {
  children: ReactNode
  className?: string
  style?: CSSProperties
  accentBorder?: string
}

/** Extends the nav's existing backdrop-blur convention to cards — glassmorphism via CSS vars, no new dependency. */
export function GlassCard({ children, className, style, accentBorder }: GlassCardProps) {
  return (
    <div
      className={`hover-lift transition-premium rounded-2xl border ${className ?? ''}`}
      style={{
        background: 'color-mix(in srgb, var(--panel) 88%, transparent)',
        borderColor: accentBorder ?? 'color-mix(in srgb, var(--border) 100%, transparent)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}
