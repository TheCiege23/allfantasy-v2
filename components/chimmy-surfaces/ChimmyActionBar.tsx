'use client'

import React from 'react'

export interface ChimmyActionBarAction {
  id: string
  label: string
  icon?: React.ReactNode
  onClick: () => void
  /** Use 'primary' for the most important CTA */
  variant?: 'primary' | 'secondary' | 'ghost'
  disabled?: boolean
}

export interface ChimmyActionBarProps {
  actions: ChimmyActionBarAction[]
  /** Stack vertically on small screens (default: horizontal scroll) */
  stackOnMobile?: boolean
  className?: string
}

const VARIANT_STYLES: Record<NonNullable<ChimmyActionBarAction['variant']>, string> = {
  primary:   'bg-indigo-600 text-white hover:bg-indigo-500',
  secondary: 'bg-white/10 text-white hover:bg-white/15',
  ghost:     'text-white/60 hover:text-white hover:bg-white/5',
}

export default function ChimmyActionBar({ actions, stackOnMobile = false, className = '' }: ChimmyActionBarProps) {
  if (actions.length === 0) return null

  return (
    <div
      className={`flex gap-2 ${stackOnMobile ? 'flex-col sm:flex-row' : 'flex-row overflow-x-auto'} ${className}`}
    >
      {actions.map((action) => (
        <button
          key={action.id}
          onClick={action.onClick}
          disabled={action.disabled}
          className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${VARIANT_STYLES[action.variant ?? 'secondary']}`}
        >
          {action.icon}
          {action.label}
        </button>
      ))}
    </div>
  )
}
