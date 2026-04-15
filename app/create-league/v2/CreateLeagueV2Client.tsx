'use client'

/**
 * Create League v2 — client orchestrator.
 *
 * Handles the 4-page flow state machine, persists draft state to
 * sessionStorage, delegates rendering to per-page components, and submits
 * to the existing `POST /api/league/create` endpoint on the final step.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getAccent, PAGE_BG_CLASS } from '@/lib/create-league-v2/theme'
import type { V2PageId } from '@/lib/create-league-v2/state'
import {
  DEFAULT_V2_STATE,
  V2_PAGES,
  canAdvance,
  clearPersistedV2State,
  loadPersistedV2State,
  persistV2State,
  type CreateLeagueV2State,
} from '@/lib/create-league-v2/state'
import { submitCreateLeagueV2 } from '@/lib/create-league-v2/submit'
import { Page1Setup } from '@/components/create-league-v2/Page1Setup'
import { Page2Identity } from '@/components/create-league-v2/Page2Identity'
import { Page3Scoring } from '@/components/create-league-v2/Page3Scoring'
import { Page4Review } from '@/components/create-league-v2/Page4Review'
import {
  PrimaryCTA,
  SecondaryButton,
  StepProgress,
} from '@/components/create-league-v2/primitives'

export interface CreateLeagueV2ClientProps {
  userId: string
}

export function CreateLeagueV2Client({ userId: _userId }: CreateLeagueV2ClientProps) {
  const router = useRouter()
  const [currentPage, setCurrentPage] = useState<V2PageId>('setup')
  const [state, setState] = useState<CreateLeagueV2State>(DEFAULT_V2_STATE)
  const [hydrated, setHydrated] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Hydrate from sessionStorage once after mount.
  useEffect(() => {
    const persisted = loadPersistedV2State()
    if (persisted) setState((s) => ({ ...s, ...persisted }))
    setHydrated(true)
  }, [])

  // Persist on every change.
  useEffect(() => {
    if (!hydrated) return
    persistV2State(state)
  }, [state, hydrated])

  const accent = useMemo(() => getAccent(state.leagueType), [state.leagueType])

  const onChange = useCallback((patch: Partial<CreateLeagueV2State>) => {
    setState((prev) => ({ ...prev, ...patch }))
  }, [])

  const goNext = useCallback(() => {
    const idx = V2_PAGES.indexOf(currentPage)
    const next = V2_PAGES[idx + 1]
    if (next) {
      setCurrentPage(next)
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [currentPage])

  const goBack = useCallback(() => {
    const idx = V2_PAGES.indexOf(currentPage)
    if (idx > 0) {
      const prev = V2_PAGES[idx - 1]
      if (prev) {
        setCurrentPage(prev)
        if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
      }
      return
    }
    // On setup, back button returns to dashboard.
    router.push('/dashboard')
  }, [currentPage, router])

  const jumpTo = useCallback((page: V2PageId) => {
    setCurrentPage(page)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const handleSubmit = useCallback(async () => {
    setSubmitting(true)
    setSubmitError(null)
    const result = await submitCreateLeagueV2(state)
    if (!result.ok) {
      setSubmitting(false)
      setSubmitError(result.error ?? 'Something went wrong creating your league.')
      return
    }
    clearPersistedV2State()
    router.push(result.redirectTo ?? '/dashboard')
  }, [state, router])

  const canProceed = canAdvance(currentPage, state)
  const isFinal = currentPage === 'review'
  const currentIndex = V2_PAGES.indexOf(currentPage)

  return (
    <div className={PAGE_BG_CLASS}>
      <StepProgress current={currentPage} accent={accent} onJump={jumpTo} />

      <main className="mx-auto max-w-3xl px-4 pb-32 pt-6">
        {/* Header */}
        <div className="mb-6">
          <p className={`mb-1 text-[11px] font-bold uppercase tracking-[0.2em] ${accent.text}`}>
            Step {currentIndex + 1} of {V2_PAGES.length}
          </p>
          <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
            {currentPage === 'setup' && 'Design your league'}
            {currentPage === 'identity' && 'Give it an identity'}
            {currentPage === 'scoring' && 'Tune the scoring'}
            {currentPage === 'review' && 'Review and launch'}
          </h1>
          <p className="mt-1 text-sm text-white/55">
            {currentPage === 'setup' && 'Pick a format, sport, and how you\u2019ll draft.'}
            {currentPage === 'identity' && 'Name the league and set the ground rules.'}
            {currentPage === 'scoring' && 'Dial in how points are earned.'}
            {currentPage === 'review' && 'Last look before your league goes live.'}
          </p>
        </div>

        {/* Page body */}
        {currentPage === 'setup' ? (
          <Page1Setup state={state} accent={accent} onChange={onChange} />
        ) : null}
        {currentPage === 'identity' ? (
          <Page2Identity state={state} accent={accent} onChange={onChange} />
        ) : null}
        {currentPage === 'scoring' ? (
          <Page3Scoring state={state} accent={accent} onChange={onChange} />
        ) : null}
        {currentPage === 'review' ? (
          <Page4Review state={state} accent={accent} onJump={jumpTo} />
        ) : null}

        {submitError ? (
          <div
            role="alert"
            className="mt-4 rounded-2xl border border-rose-400/40 bg-rose-500/10 p-4 text-sm text-rose-200"
          >
            {submitError}
          </div>
        ) : null}
      </main>

      {/* Sticky bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-white/10 bg-[#0B0F1A]/90 px-4 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <SecondaryButton onClick={goBack} disabled={submitting}>
            {currentIndex === 0 ? 'Cancel' : 'Back'}
          </SecondaryButton>
          {isFinal ? (
            <PrimaryCTA
              accent={accent}
              onClick={handleSubmit}
              loading={submitting}
              disabled={!canProceed}
            >
              Create League
            </PrimaryCTA>
          ) : (
            <PrimaryCTA accent={accent} onClick={goNext} disabled={!canProceed}>
              Continue →
            </PrimaryCTA>
          )}
        </div>
      </div>
    </div>
  )
}
