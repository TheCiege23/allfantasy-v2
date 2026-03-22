'use client'

import { memo } from 'react'

export type WizardStepNavProps = {
  onBack?: () => void
  onNext?: () => void
  nextLabel?: string
  disableForward?: boolean
  /** When true, show only Create button (review step) */
  isReview?: boolean
  onCreate?: () => void
  creating?: boolean
  error?: string | null
}

/**
 * Consistent Back / Next or Back / Create league navigation. Mobile-first, touch-friendly.
 */
export const WizardStepNav = memo(function WizardStepNav({
  onBack,
  onNext,
  nextLabel = 'Next',
  disableForward = false,
  isReview = false,
  onCreate,
  creating = false,
  error,
}: WizardStepNavProps) {
  return (
    <div className="mt-6 pt-4 border-t border-white/10 space-y-3">
      {error && (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}
      <div className="flex justify-between gap-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            disabled={creating}
            className="rounded-xl border border-white/20 px-4 py-3 text-sm font-medium text-white/90 hover:bg-white/10 min-h-[44px] touch-manipulation disabled:opacity-50 flex-1 max-w-[140px]"
            aria-label="Previous step"
          >
            Back
          </button>
        )}
        {!onBack && <span />}
        {isReview && onCreate ? (
          <button
            type="button"
            onClick={onCreate}
            disabled={creating || disableForward}
            className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white hover:bg-emerald-500 min-h-[44px] touch-manipulation disabled:opacity-50 flex-1 max-w-[200px]"
            aria-busy={creating}
            aria-label={creating ? 'Creating league' : 'Create league'}
          >
            {creating ? 'Creating…' : 'Create league'}
          </button>
        ) : (
          onNext && (
            <button
              type="button"
              onClick={onNext}
              disabled={disableForward}
              className="rounded-xl bg-cyan-600 px-4 py-3 text-sm font-medium text-white hover:bg-cyan-500 min-h-[44px] touch-manipulation disabled:opacity-50 flex-1 max-w-[140px]"
              aria-label={nextLabel}
            >
              {nextLabel}
            </button>
          )
        )}
      </div>
    </div>
  )
})
