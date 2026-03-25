'use client'

import { memo, type ReactNode } from 'react'

export type WizardStepContainerProps = {
  /** Current step number (1-based), e.g. 1, 2, … 10 */
  stepNumber: number
  /** Total steps, e.g. 10 */
  totalSteps: number
  /** Short step name for display */
  stepLabel: string
  /** Step content */
  children: ReactNode
}

/**
 * Wraps each wizard step with consistent layout and progress.
 * Mobile-first, responsive, clear progress (Step X of Y).
 */
export const WizardStepContainer = memo(function WizardStepContainer({
  stepNumber,
  totalSteps,
  stepLabel,
  children,
}: WizardStepContainerProps) {
  return (
    <div className="flex flex-col min-h-0">
      <div className="shrink-0 mb-5 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-cyan-300 tabular-nums tracking-wide" aria-live="polite">
            {stepLabel}
          </p>
          <p className="text-xs text-white/55">
            {stepNumber}/{totalSteps}
          </p>
        </div>
        <div className="h-1.5 w-full rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-cyan-300 transition-[width] duration-300"
            style={{ width: `${Math.max(6, Math.min(100, (stepNumber / Math.max(1, totalSteps)) * 100))}%` }}
            aria-hidden
          />
        </div>
        <p className="sr-only">
          Step {stepNumber} of {totalSteps}
        </p>
      </div>
      <div className="flex-1 min-h-0">
        {children}
      </div>
    </div>
  )
})
