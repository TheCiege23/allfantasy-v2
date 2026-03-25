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
    <div className="sticky bottom-0 z-10 mt-8 space-y-3 border-t border-white/10 bg-gradient-to-b from-transparent via-[#02061a]/95 to-[#02061a] pt-4 pb-2">
      {error && (
        <p className="rounded-xl border border-red-400/35 bg-red-500/10 px-3 py-2 text-sm text-red-200" role="alert">
          {error}
        </p>
      )}
      <div className="flex items-center justify-between gap-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            disabled={creating}
            className="inline-flex h-[52px] w-[52px] items-center justify-center rounded-full border border-white/20 bg-black/20 text-xl font-semibold text-white/90 hover:bg-white/10 touch-manipulation disabled:opacity-50"
            aria-label="Previous step"
          >
            ←
          </button>
        )}
        {!onBack && <span />}
        {isReview && onCreate ? (
          <button
            type="button"
            onClick={onCreate}
            disabled={creating || disableForward}
            className="min-h-[58px] flex-1 rounded-full bg-[#00ffd4] px-6 text-sm font-black uppercase tracking-[0.14em] text-[#00131a] hover:bg-[#2bffe0] touch-manipulation disabled:opacity-50"
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
              className="min-h-[58px] flex-1 rounded-full bg-[#00ffd4] px-6 text-sm font-black uppercase tracking-[0.14em] text-[#00131a] hover:bg-[#2bffe0] touch-manipulation disabled:opacity-50"
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
