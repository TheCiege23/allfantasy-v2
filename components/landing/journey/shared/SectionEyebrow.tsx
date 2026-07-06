import type { ReactNode } from 'react'

export function SectionEyebrow({ children, accent = 'var(--accent-cyan-strong)' }: { children: ReactNode; accent?: string }) {
  return (
    <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: accent }}>
      {children}
    </p>
  )
}
