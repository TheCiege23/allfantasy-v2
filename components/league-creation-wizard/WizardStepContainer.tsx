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
  const progressPercent = Math.max(6, Math.min(100, (stepNumber / Math.max(1, totalSteps)) * 100))
  return (
    <div className="flex flex-col min-h-0">
      <div className="shrink-0 mb-5 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200/90 tabular-nums" aria-live="polite">
            Step {stepNumber} of {totalSteps}
          </p>
          <p className="text-[11px] text-white/50">
            {stepLabel}
          </p>
        </div>
        <div className="h-1.5 w-full rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-cyan-300 transition-[width] duration-300"
            style={{ width: `${progressPercent}%` }}
            aria-hidden
          />
        </div>
        <p className="sr-only">
          Step {stepNumber} of {totalSteps}
        </p>
        <p className="text-[11px] text-white/45">
          Recommended defaults are preselected. Open advanced options only when needed.
        </p>
      </div>
      <div className="flex-1 min-h-0 rounded-2xl border border-white/10 bg-[#030a1f]/55 p-3 sm:p-4">
        {children}
      </div>
    </div>
  )
})
