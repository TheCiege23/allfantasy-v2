'use client'

import React from 'react'

export interface ChimmyActionBinderProps {
  /** The AI output content / card */
  children: React.ReactNode
  /**
   * Actions to wire to the output. They are rendered as a row below the content.
   * Use ChimmyActionBar instead if you need full styling control.
   */
  actions: Array<{
    id: string
    label: string
    onClick: () => void
    variant?: 'primary' | 'ghost'
  }>
  className?: string
}

/**
 * ChimmyActionBinder — connects an AI output card to executable app actions.
 * Wraps any content and appends a set of action buttons in a consistent footer row.
 */
export default function ChimmyActionBinder({ children, actions, className = '' }: ChimmyActionBinderProps) {
  return (
    <div className={className}>
      {children}
      {actions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {actions.map((action) => (
            <button
              key={action.id}
              onClick={action.onClick}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                action.variant === 'primary'
                  ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                  : 'bg-white/10 text-white/80 hover:bg-white/15'
              }`}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
