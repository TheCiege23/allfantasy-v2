'use client'

import { useState, type ReactNode } from 'react'
import { Info } from 'lucide-react'

interface ChimmyDisabledActionTooltipProps {
  /** The reason the action is unavailable */
  reason: string
  children: ReactNode
}

/**
 * Wraps an action button with a tooltip explaining why it is disabled.
 * Uses a CSS hover/focus approach — no external tooltip library needed.
 */
export function ChimmyDisabledActionTooltip({
  reason,
  children,
}: ChimmyDisabledActionTooltipProps) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative inline-flex">
      {/* Trigger area */}
      <div
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        className="relative"
      >
        {children}

        {/* Info badge */}
        <span className="pointer-events-none absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-gray-700">
          <Info className="h-2.5 w-2.5 text-white/40" aria-hidden="true" />
        </span>
      </div>

      {/* Tooltip bubble */}
      {visible && (
        <div
          role="tooltip"
          className="absolute bottom-full left-1/2 z-50 mb-2 w-52 -translate-x-1/2 rounded-lg border border-white/10 bg-gray-800 px-3 py-2 text-xs text-white/80 shadow-xl"
        >
          {reason}
          {/* Arrow */}
          <span className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-x-4 border-t-4 border-x-transparent border-t-gray-800" />
        </div>
      )}
    </div>
  )
}
