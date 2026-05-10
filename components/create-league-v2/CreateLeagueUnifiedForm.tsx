'use client'

import { useEffect, useMemo, type ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import type { AccentTone } from '@/lib/create-league-v2/theme'
import type { CreateLeagueCompletionIssue } from '@/lib/create-league-v2/form-completion'
import type { CreateLeagueV2State } from '@/lib/create-league-v2/state'
import { getEffectiveLeagueType, isDynastyConcept } from '@/lib/create-league-v2/state'
import type { CreateLeagueFieldErrors } from '@/lib/create-league-v2/submit'
import { buildSuggestedLeagueName } from '@/lib/create-league-v2/suggested-league-name'
import { CreateLeagueReviewStep } from '@/components/create-league-v2/CreateLeagueReviewStep'
import { LeagueRegionalPreferencesCard } from '@/components/create-league-v2/LeagueRegionalPreferencesCard'
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

function FormFlowSection({
  step,
  title,
  subtitle,
  children,
}: {
  step: number
  title: string
  subtitle?: string
  children: ReactNode
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-baseline gap-3 border-b border-white/[0.06] pb-2">
        <span className="min-w-[1.75rem] font-mono text-[11px] font-black tabular-nums text-cyan-400/90">
          {String(step).padStart(2, '0')}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-white/80">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-[11px] leading-relaxed text-white/38">{subtitle}</p> : null}
        </div>
      </div>
      {children}
    </div>
  )
}

export function CreateLeagueUnifiedForm({
  state,
  accent,
  onChange,
  onDraftSectionVisible,
  fieldErrors,
  completionIssues,
}: {
  state: CreateLeagueV2State
  accent: AccentTone
  onChange: (patch: Partial<CreateLeagueV2State>) => void
  onDraftSectionVisible?: (visible: boolean) => void
  fieldErrors?: CreateLeagueFieldErrors | null
  completionIssues?: CreateLeagueCompletionIssue[]
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
  const blocking = completionIssues ?? []

  return (
    <div className="space-y-8">
      {blocking.length > 0 ? (
        <GlassCard className="border-amber-400/25 bg-amber-500/[0.06]">
          <SectionHeader
            title="Before you create"
            hint="Resolve the items below to enable Create League."
          />
          <ul className="list-inside list-disc space-y-1.5 text-xs leading-relaxed text-amber-100/90">
            {blocking.map((issue) => (
              <li key={issue.code}>{issue.message}</li>
            ))}
          </ul>
        </GlassCard>
      ) : null}

      <FormFlowSection
        step={1}
        title="Basics"
        subtitle="Pick your league format, then choose Quick setup or Advanced commissioner controls."
      >
        <ConceptSelector state={state} accent={accent} onChange={onChange} error={fe?.concept} />

        <GlassCard>
          <SectionHeader
            title="Creation mode"
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
      </FormFlowSection>

      <FormFlowSection step={2} title="Sport & scoring" subtitle="Presets are filtered for your sport and league format.">
        <section className={!effectiveType ? 'opacity-35' : undefined}>
          <SportScoringSelector
            state={state}
            accent={accent}
            onChange={onChange}
            sportError={fe?.sport}
            scoringError={fe?.scoringPreset}
          />
        </section>
      </FormFlowSection>

      <FormFlowSection
        step={3}
        title="Regional preferences"
        subtitle="Timezone and language apply at creation; trade review controls how trades clear."
      >
        <section className={!effectiveType ? 'opacity-35' : undefined}>
          <LeagueRegionalPreferencesCard state={state} accent={accent} onChange={onChange} />
        </section>
      </FormFlowSection>

      <FormFlowSection step={4} title="Draft format" subtitle="Options depend on sport and league concept.">
        <section className={!effectiveType ? 'opacity-35' : undefined}>
          <DraftTypeSelector
            state={state}
            accent={accent}
            onChange={onChange}
            onDraftSectionVisible={onDraftSectionVisible}
            draftError={fe?.draftType}
          />
        </section>
      </FormFlowSection>

      <FormFlowSection step={5} title="Teams & league name" subtitle="Pool or team count, then name your league.">
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
      </FormFlowSection>

      <FormFlowSection
        step={6}
        title="Advanced options"
        subtitle="Shown when Advanced mode is on for formats that support deeper setup."
      >
        {state.creationMode === 'advanced' && isDynastyConcept(effectiveType) ? (
          <DynastyAdvancedSettings state={state} accent={accent} onChange={onChange} />
        ) : null}

        {state.creationMode === 'advanced' && effectiveType === 'keeper' ? (
          <KeeperAdvancedSettings state={state} accent={accent} onChange={onChange} />
        ) : null}

        {state.creationMode === 'advanced' && effectiveType === 'best_ball' ? (
          <BestBallAdvancedSettings state={state} accent={accent} onChange={onChange} />
        ) : null}

        {state.creationMode === 'quick' || !effectiveType ? (
          <p className="text-[11px] text-white/35">
            {effectiveType ? 'Switch to Advanced mode above for full commissioner controls.' : 'Choose a concept to unlock advanced options.'}
          </p>
        ) : null}
      </FormFlowSection>

      <FormFlowSection step={7} title="Review & create" subtitle="Confirm everything looks right, then use Create League below.">
        {effectiveType ? <CreateLeagueReviewStep state={state} accent={accent} /> : null}
      </FormFlowSection>
    </div>
  )
}
