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
      <div className="shrink-0 flex items-center justify-between gap-2 mb-4">
        <p className="text-sm font-medium text-cyan-300 tabular-nums" aria-live="polite">
          Step {stepNumber} of {totalSteps}
        </p>
        <p className="text-xs text-white/50 truncate max-w-[50%]">{stepLabel}</p>
      </div>
      <div className="flex-1 min-h-0">
        {children}
      </div>
    </div>
  )
})
