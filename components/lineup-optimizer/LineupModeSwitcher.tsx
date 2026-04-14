'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { LineupDecisionMode } from '@/lib/lineup-decision-engine/types'

const MODES: LineupDecisionMode[] = [
  'Best Lineup',
  'Safe Lineup',
  'Upside Lineup',
  'Must-Win Lineup',
  'Underdog Lineup',
]

const SHORT: Partial<Record<LineupDecisionMode, string>> = {
  'Best Lineup': 'Best',
  'Safe Lineup': 'Safe',
  'Upside Lineup': 'Upside',
  'Must-Win Lineup': 'Must-Win',
  'Underdog Lineup': 'Underdog',
}

export function LineupModeSwitcher({
  value,
  onChange,
  disabled,
}: {
  value: LineupDecisionMode
  onChange: (m: LineupDecisionMode) => void
  disabled?: boolean
}) {
  return (
    <div
      className="flex flex-wrap gap-1 rounded-xl border border-white/10 bg-black/30 p-1"
      role="tablist"
      aria-label="Lineup mode"
      data-testid="lineup-optimizer-mode-switcher"
    >
      {MODES.map((m) => {
        const active = value === m
        return (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={disabled}
            onClick={() => onChange(m)}
            className={cn(
              'relative rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors',
              active ? 'text-white' : 'text-white/50 hover:text-white/75',
              disabled && 'cursor-not-allowed opacity-50'
            )}
          >
            {active ? (
              <motion.span
                layoutId="mode-pill"
                className="absolute inset-0 rounded-lg bg-cyan-500/20 ring-1 ring-cyan-400/30"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            ) : null}
            <span className="relative z-[1]">{SHORT[m] ?? m}</span>
          </button>
        )
      })}
    </div>
  )
}
