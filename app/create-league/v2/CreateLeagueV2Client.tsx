'use client'

/**
 * Create League v2 — unified concept-first flow (single scroll + live summary).
 * Wired to POST /api/leagues (canonical) + tournament create when applicable.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getAccent, PAGE_BG_CLASS, ambientGlowStyle } from '@/lib/create-league-v2/theme'
import {
  DEFAULT_V2_STATE,
  clearPersistedV2State,
  loadPersistedV2State,
  persistV2State,
  isFormComplete,
  getEffectiveLeagueType,
  type CreateLeagueV2State,
} from '@/lib/create-league-v2/state'
import { submitCreateLeagueV2, type CreateLeagueFieldErrors } from '@/lib/create-league-v2/submit'
import { CreateLeagueUnifiedForm } from '@/components/create-league-v2/CreateLeagueUnifiedForm'
import { CreateLeagueSummary, CreateLeagueMedia } from '@/components/create-league'
import { PrimaryCTA, SecondaryButton } from '@/components/create-league-v2/primitives'
import { resolveCreateLeagueHeroMedia } from '@/lib/create-league-v2/media-priority'
import { getSportHue } from '@/lib/create-league-v2/sport-hues'
import { SPORT_MEDIA } from '@/lib/create-league-v2/theme'

export interface CreateLeagueV2ClientProps {
  userId: string
}

export function CreateLeagueV2Client({ userId: _userId }: CreateLeagueV2ClientProps) {
  const router = useRouter()
  const [state, setState] = useState<CreateLeagueV2State>(DEFAULT_V2_STATE)
  const [hydrated, setHydrated] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<CreateLeagueFieldErrors | null>(null)
  const [draftSectionVisible, setDraftSectionVisible] = useState(false)

  useEffect(() => {
    const persisted = loadPersistedV2State()
    if (persisted) setState((s) => ({ ...s, ...persisted, leagueType: persisted.leagueType ?? null }))
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    persistV2State(state)
  }, [state, hydrated])

  const effectiveType = getEffectiveLeagueType(state)
  const accent = useMemo(() => getAccent(effectiveType ?? undefined), [effectiveType])

  const onChange = useCallback((patch: Partial<CreateLeagueV2State>) => {
    setSubmitError(null)
    setFieldErrors(null)
    setState((prev) => ({ ...prev, ...patch }))
  }, [])

  const heroMedia = useMemo(() => {
    if (!effectiveType) {
      const sm = SPORT_MEDIA[state.sport] ?? SPORT_MEDIA.NFL
      return { ...sm, mediaKey: `sport:${state.sport}`, badge: 'Choose a concept' }
    }
    return resolveCreateLeagueHeroMedia({
      leagueType: effectiveType,
      sport: state.sport,
      draftType: state.draftType,
      idpSelected: state.idpSelected,
      draftEmphasis: draftSectionVisible,
    })
  }, [effectiveType, state.sport, state.draftType, state.idpSelected, draftSectionVisible])

  const sportHue = getSportHue(state.sport)

  const handleSubmit = useCallback(async () => {
    setSubmitting(true)
    setSubmitError(null)
    setFieldErrors(null)
    try {
      const result = await submitCreateLeagueV2(state)
      if (!result.ok) {
        setSubmitError(result.error ?? 'Something went wrong creating your league.')
        if (result.fieldErrors && Object.keys(result.fieldErrors).length > 0) {
          setFieldErrors(result.fieldErrors)
        }
        return
      }
      clearPersistedV2State()
      router.push(result.redirectTo ?? '/dashboard')
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong creating your league.')
    } finally {
      setSubmitting(false)
    }
  }, [state, router])

  const canCreate = isFormComplete(state)

  const topError =
    submitError ??
    fieldErrors?.general ??
    null

  return (
    <div className={`${PAGE_BG_CLASS} relative`}>
      <div
        className={`pointer-events-none fixed inset-0 z-0 bg-gradient-to-b ${sportHue.pageGradient}`}
        aria-hidden
      />
      <div
        className="pointer-events-none fixed inset-0 z-0 transition-all duration-1000"
        style={ambientGlowStyle(accent.hex)}
        aria-hidden
      />

      <main className="relative z-10 mx-auto max-w-6xl px-4 pb-36 pt-6 lg:pt-10">
        <div className="mb-8 max-w-3xl">
          <p
            className={`mb-1.5 text-[11px] font-bold uppercase tracking-[0.22em] ${sportHue.labelClass} transition-colors duration-500`}
          >
            Create league
          </p>
          <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">Design your league</h1>
          <p className="mt-2 text-sm leading-relaxed text-white/50">
            Concept first, then sport and scoring, teams and name, and draft type. Advanced rules live in League
            Settings.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <CreateLeagueMedia media={heroMedia} accent={accent} />

            <CreateLeagueUnifiedForm
              state={state}
              accent={accent}
              onChange={onChange}
              onDraftSectionVisible={setDraftSectionVisible}
              fieldErrors={fieldErrors}
            />

            {topError ? (
              <div
                role="alert"
                className="rounded-2xl border border-rose-400/40 bg-rose-500/10 p-4 text-sm text-rose-200"
              >
                {topError}
              </div>
            ) : null}
          </div>

          <CreateLeagueSummary state={state} accent={accent} />
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-cyan-500/10 bg-[#060a18]/92 px-4 py-4 backdrop-blur-2xl shadow-[0_-8px_30px_-10px_rgba(0,0,0,0.6)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <SecondaryButton onClick={() => router.push('/dashboard')} disabled={submitting}>
            Cancel
          </SecondaryButton>
          <PrimaryCTA accent={accent} onClick={handleSubmit} loading={submitting} disabled={!canCreate}>
            Create League
          </PrimaryCTA>
        </div>
      </div>
    </div>
  )
}
