'use client'

import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

export interface SectionHeadingProps {
  /** The eyebrow label text. */
  children: ReactNode
  icon?: LucideIcon
  /**
   * Accent color (hex/rgb) for the leading bar + icon. Dashboard V2 uses this to
   * carry per-context identity: cyan (Global), amber (Commissioner), emerald
   * (Team). Defaults to a neutral white when omitted.
   */
  accent?: string
  /** Optional trailing content (a count chip, "view all", etc.), right-aligned. */
  trailing?: ReactNode
  className?: string
}

/**
 * Dashboard V2 Phase 3.7 — the shared section eyebrow. Formalizes the repeated
 * uppercase-tracking label into one premium primitive with a colored accent bar
 * and optional icon, giving the page a consistent, scannable hierarchy and each
 * context a distinct accent identity. Purely presentational.
 */
export function SectionHeading({ children, icon: Icon, accent, trailing, className }: SectionHeadingProps) {
  const color = accent ?? 'rgba(255,255,255,0.35)'
  return (
    <div className={`flex items-center gap-2 ${className ?? ''}`}>
      <span aria-hidden className="h-3.5 w-[3px] shrink-0 rounded-full" style={{ background: color }} />
      {Icon ? <Icon className="h-3.5 w-3.5 shrink-0" style={{ color }} aria-hidden /> : null}
      <p className="truncate text-[11px] font-bold uppercase tracking-widest text-white/45">{children}</p>
      {trailing ? <span className="ml-auto shrink-0">{trailing}</span> : null}
    </div>
  )
}

/** Per-context accent colors — the single source of Dashboard V2's context identity. */
export const CONTEXT_ACCENT: Record<'global' | 'commissioner' | 'team', string> = {
  global: '#22d3ee', // cyan — cross-league command center
  commissioner: '#fbbf24', // amber — operations / authority
  team: '#34d399', // emerald — weekly win center
}
