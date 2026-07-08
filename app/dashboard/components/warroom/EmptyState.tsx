'use client'

import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { WarRoomCard } from './WarRoomCard'

export type EmptyStateTone = 'positive' | 'info' | 'neutral'

const TONE: Record<EmptyStateTone, { ring: string; icon: string; title: string; border: string }> = {
  positive: { ring: 'bg-emerald-500/10', icon: 'text-emerald-300', title: 'text-emerald-300', border: 'rgba(52,211,153,0.2)' },
  info: { ring: 'bg-cyan-500/10', icon: 'text-cyan-300', title: 'text-cyan-100', border: 'rgba(34,211,238,0.18)' },
  neutral: { ring: 'bg-white/[0.06]', icon: 'text-white/50', title: 'text-white/80', border: 'rgba(255,255,255,0.08)' },
}

export interface EmptyStateProps {
  icon: LucideIcon
  title: ReactNode
  description?: ReactNode
  /**
   * Tone conveys whether the empty state is a good thing (`positive` — "you're
   * all caught up"), an in-progress calculation (`info`), or simply nothing yet
   * (`neutral`).
   */
  tone?: EmptyStateTone
  /**
   * A short, uppercase "what unlocks later" hint — turns a dead-end empty state
   * into a premium, intentional one (e.g. "Unlocks at kickoff").
   */
  hint?: ReactNode
  /** `center` for standalone cards, `start` for in-column list placements. */
  align?: 'center' | 'start'
  className?: string
}

/**
 * Dashboard V2 Phase 3.7 — the shared premium empty state. Consolidates the
 * tinted-icon-circle + title + subtext pattern used across the dashboard into one
 * primitive with a tone and an optional "what unlocks" hint, so every quiet card
 * reads as intentional and on-brand rather than blank. No fake data — it only
 * frames the honest absence of data.
 */
export function EmptyState({ icon: Icon, title, description, tone = 'neutral', hint, align = 'center', className }: EmptyStateProps) {
  const c = TONE[tone]
  const centered = align === 'center'
  return (
    <WarRoomCard
      className={`flex gap-3 p-5 ${centered ? 'flex-col items-center text-center' : 'items-start'} ${className ?? ''}`}
      accentBorder={c.border}
    >
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${c.ring} ${c.icon} ${centered ? '' : 'mt-0.5'}`}>
        <Icon className="h-[18px] w-[18px]" aria-hidden />
      </span>
      <div className={centered ? '' : 'min-w-0'}>
        <p className={`text-[13px] font-semibold ${c.title}`}>{title}</p>
        {description ? <p className="mt-0.5 text-[11px] leading-snug text-white/45">{description}</p> : null}
        {hint ? <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-wide text-white/30">{hint}</p> : null}
      </div>
    </WarRoomCard>
  )
}
