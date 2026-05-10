'use client'

import { useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import type { AccentTone } from '@/lib/create-league-v2/theme'
import type { CreateLeagueV2State } from '@/lib/create-league-v2/state'
import { getEffectiveLeagueType, isDynastyConcept } from '@/lib/create-league-v2/state'
import type { CreateLeagueFieldErrors } from '@/lib/create-league-v2/submit'
import { buildSuggestedLeagueName } from '@/lib/create-league-v2/suggested-league-name'
import { CreateLeagueReviewStep } from '@/components/create-league-v2/CreateLeagueReviewStep'
import {
  ConceptSelector,
  SportScoringSelector,
  TeamNameSection,
  DraftTypeSelector,
  DynastyAdvancedSettings,
  KeeperAdvancedSettings,
  BestBallAdvancedSettings,
} from '@/components/create-league'
import { GlassCard, SectionHeader, Segmented } from '@/components/create-league-v2/primitives'

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

      <GlassCard>
        <SectionHeader
          title="Creation Mode"
          hint="Quick uses tuned defaults. Advanced unlocks detailed setup options."
        />
        <Segmented
          options={[
            { value: 'quick', label: 'Quick', hint: 'Fast setup with defaults' },
            { value: 'advanced', label: 'Advanced', hint: 'Configure league details now' },
          ]}
          value={state.creationMode}
          onChange={(creationMode) => onChange({ creationMode })}
          accent={accent}
          ariaLabel="Creation mode"
        />
      </GlassCard>

      <section className={!effectiveType ? 'opacity-35' : undefined}>
        <SportScoringSelector
          state={state}
          accent={accent}
          onChange={onChange}
          sportError={fe?.sport}
          scoringError={fe?.scoringPreset}
        />
      </section>

      <section className={!effectiveType ? 'opacity-35' : undefined}>
        <DraftTypeSelector
          state={state}
          accent={accent}
          onChange={onChange}
          onDraftSectionVisible={onDraftSectionVisible}
          draftError={fe?.draftType}
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

      {state.creationMode === 'advanced' && isDynastyConcept(effectiveType) && (
        <DynastyAdvancedSettings
          state={state}
          accent={accent}
          onChange={onChange}
        />
      )}

      {state.creationMode === 'advanced' && effectiveType === 'keeper' && (
        <KeeperAdvancedSettings
          state={state}
          accent={accent}
          onChange={onChange}
        />
      )}

      {state.creationMode === 'advanced' && effectiveType === 'best_ball' && (
        <BestBallAdvancedSettings
          state={state}
          accent={accent}
          onChange={onChange}
        />
      )}

      {effectiveType ? <CreateLeagueReviewStep state={state} accent={accent} /> : null}
    </div>
  )
}
