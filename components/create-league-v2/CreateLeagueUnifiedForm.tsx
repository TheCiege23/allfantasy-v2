'use client'

import { useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import type { AccentTone } from '@/lib/create-league-v2/theme'
import type { CreateLeagueV2State } from '@/lib/create-league-v2/state'
import { getEffectiveLeagueType, isDynastyConcept } from '@/lib/create-league-v2/state'
import type { CreateLeagueFieldErrors } from '@/lib/create-league-v2/submit'
import { buildSuggestedLeagueName } from '@/lib/create-league-v2/suggested-league-name'
import {
  ConceptSelector,
  SportScoringSelector,
  TeamNameSection,
  DraftTypeSelector,
  DynastyAdvancedSettings,
  KeeperAdvancedSettings,
  BestBallAdvancedSettings,
} from '@/components/create-league'

export function CreateLeagueUnifiedForm({
  state,
  accent,
  onChange,
  onDraftSectionVisible,
  fieldErrors,
}: {
  state: CreateLeagueV2State
  accent: AccentTone
  onChange: (patch: Partial<CreateLeagueV2State>) => void
  onDraftSectionVisible?: (visible: boolean) => void
  fieldErrors?: CreateLeagueFieldErrors | null
}) {
  const { data: session } = useSession()

  const firstName = useMemo(() => {
    const n = session?.user?.name?.trim()
    if (!n) return undefined
    return n.split(/\s+/)[0]
  }, [session?.user?.name])

  const effectiveType = getEffectiveLeagueType(state)

  useEffect(() => {
    if (!effectiveType || state.nameTouched) return
    const suggested = buildSuggestedLeagueName({
      leagueType: effectiveType,
      sport: state.sport,
      teamCount: state.teamCount,
      idpSelected: state.idpSelected,
      commissionerFirstName: firstName,
    })
    if (suggested && suggested !== state.name) {
      onChange({ name: suggested })
    }
  }, [effectiveType, state.sport, state.teamCount, state.idpSelected, state.nameTouched, firstName, onChange])

  const fe = fieldErrors ?? undefined

  return (
    <div className="space-y-5">
      <ConceptSelector
        state={state}
        accent={accent}
        onChange={onChange}
        error={fe?.concept}
      />

      <section className={!effectiveType ? 'opacity-35' : undefined}>
        <SportScoringSelector
          state={state}
          accent={accent}
          onChange={onChange}
          sportError={fe?.sport}
          scoringError={fe?.scoringPreset}
        />
      </section>

      <section className={!effectiveType || !state.scoringPresetId ? 'opacity-35' : undefined}>
        <TeamNameSection
          state={state}
          accent={accent}
          onChange={onChange}
          commissionerFirstName={firstName}
          teamCountError={fe?.teamCount}
          leagueNameError={fe?.leagueName}
        />
      </section>

      <section className={!effectiveType || state.name.trim().length < 3 ? 'opacity-35' : undefined}>
        <DraftTypeSelector
          state={state}
          accent={accent}
          onChange={onChange}
          onDraftSectionVisible={onDraftSectionVisible}
          draftError={fe?.draftType}
        />
      </section>

      {isDynastyConcept(effectiveType) && (
        <DynastyAdvancedSettings
          state={state}
          accent={accent}
          onChange={onChange}
        />
      )}

      {effectiveType === 'keeper' && (
        <KeeperAdvancedSettings
          state={state}
          accent={accent}
          onChange={onChange}
        />
      )}

      {effectiveType === 'best_ball' && (
        <BestBallAdvancedSettings
          state={state}
          accent={accent}
          onChange={onChange}
        />
      )}
    </div>
  )
}
