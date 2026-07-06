import type { ReactNode } from 'react'

export function GradientWord({ children, from = 'var(--accent-cyan)', to = 'color-mix(in srgb, var(--accent-cyan-strong) 72%, #3b82f6)' }: { children: ReactNode; from?: string; to?: string }) {
  return (
    <span
      style={{
        backgroundImage: `linear-gradient(90deg, ${from}, ${to})`,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      }}
    >
      {children}
    </span>
  )
}
