'use client'

import { useEffect, useMemo, type ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import type { AccentTone } from '@/lib/create-league-v2/theme'
import type { CreateLeagueCompletionIssue } from '@/lib/create-league-v2/form-completion'
import type { CreateLeagueV2State } from '@/lib/create-league-v2/state'
import { getEffectiveLeagueType, isDynastyConcept } from '@/lib/create-league-v2/state'
import type { CreateLeagueFieldErrors } from '@/lib/create-league-v2/submit'
import type { HeroMediaFocus } from '@/lib/create-league-v2/media-priority'
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
  onSwitchToAdvanced,
  onDraftSectionVisible,
  onHeroMediaFocus,
  fieldErrors,
  completionIssues,
}: {
  state: CreateLeagueV2State
  accent: AccentTone
  onChange: (patch: Partial<CreateLeagueV2State>) => void
  onSwitchToAdvanced?: () => void
  onDraftSectionVisible?: (visible: boolean) => void
  /** Drives Create League hero preview: concept vs sport vs draft clip priority. */
  onHeroMediaFocus?: (focus: HeroMediaFocus) => void
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
  const quickMode = state.creationMode === 'quick'

  return (
    <div className="space-y-8">
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

      {quickMode ? (
        <>
          <GlassCard data-testid="quick-create-form">
            <SectionHeader
              title="Quick Create"
              hint="Set the essentials and create your league in one short step."
            />
            <div className="space-y-6">
              <section>
                <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white/75">Concept</h2>
                <ConceptSelector
                  state={state}
                  accent={accent}
                  onChange={onChange}
                  onConceptMediaFocus={() => onHeroMediaFocus?.('concept')}
                  error={fe?.concept}
                />
              </section>

              <section className={!effectiveType ? 'opacity-35' : undefined}>
                <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white/75">Sport & scoring</h2>
                <SportScoringSelector
                  state={state}
                  accent={accent}
                  onChange={onChange}
                  onSportUserChange={() => onHeroMediaFocus?.('sport')}
                  sportError={fe?.sport}
                  scoringError={fe?.scoringPreset}
                />
              </section>

              <section className={!effectiveType ? 'opacity-35' : undefined}>
                <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white/75">Draft</h2>
                <DraftTypeSelector
                  state={state}
                  accent={accent}
                  onChange={onChange}
                  onDraftSectionVisible={onDraftSectionVisible}
                  onDraftUserChange={() => onHeroMediaFocus?.('draft')}
                  draftError={fe?.draftType}
                />
              </section>

              <section className={!effectiveType || !state.scoringPresetId ? 'opacity-35' : undefined}>
                <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white/75">Teams & name</h2>
                <TeamNameSection
                  state={state}
                  accent={accent}
                  onChange={onChange}
                  commissionerFirstName={firstName}
                  teamCountError={fe?.teamCount}
                  leagueNameError={fe?.leagueName}
                />
              </section>

              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-[12px] text-white/70" data-testid="quick-create-summary">
                {state.teamCount}-team {state.sport} {effectiveType ?? 'league'} · {state.draftType} draft
              </div>

              <button
                type="button"
                onClick={() => {
                  onChange({ creationMode: 'advanced' })
                  onSwitchToAdvanced?.()
                }}
                className="w-full rounded-xl border border-cyan-400/35 bg-cyan-500/10 px-4 py-2.5 text-[12px] font-semibold text-cyan-100 transition hover:bg-cyan-500/20"
                data-testid="switch-to-advanced"
              >
                Customize advanced settings
              </button>
            </div>
          </GlassCard>
        </>
      ) : (
        <>
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-3" data-testid="advanced-create-heading">
            <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-white/85">Advanced Create</h2>
            <p className="mt-1 text-[12px] text-white/50">
              Customize league format, rules, trades, waivers, and commissioner settings.
            </p>
          </div>

          <FormFlowSection
            step={1}
            title="Basics"
            subtitle="Pick your league format and complete commissioner setup."
          >
            <ConceptSelector
              state={state}
              accent={accent}
              onChange={onChange}
              onConceptMediaFocus={() => onHeroMediaFocus?.('concept')}
              error={fe?.concept}
            />
          </FormFlowSection>

          <FormFlowSection step={2} title="Sport & scoring" subtitle="Presets are filtered for your sport and league format.">
            <section className={!effectiveType ? 'opacity-35' : undefined}>
              <SportScoringSelector
                state={state}
                accent={accent}
                onChange={onChange}
                onSportUserChange={() => onHeroMediaFocus?.('sport')}
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
            <section className={!effectiveType ? 'opacity-35' : undefined} data-testid="regional-preferences-section">
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
                onDraftUserChange={() => onHeroMediaFocus?.('draft')}
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
            subtitle="Shown for formats that support deeper setup."
          >
            {isDynastyConcept(effectiveType) ? (
              <DynastyAdvancedSettings state={state} accent={accent} onChange={onChange} />
            ) : null}

            {effectiveType === 'keeper' ? (
              <KeeperAdvancedSettings state={state} accent={accent} onChange={onChange} />
            ) : null}

            {effectiveType === 'best_ball' ? (
              <BestBallAdvancedSettings state={state} accent={accent} onChange={onChange} />
            ) : null}

            {!effectiveType ? (
              <p className="text-[11px] text-white/35">Choose a concept to unlock advanced options.</p>
            ) : null}
          </FormFlowSection>

          <div data-testid="advanced-review-section">
            <FormFlowSection step={7} title="Review & create" subtitle="Confirm everything looks right, then use Create League below.">
              {effectiveType ? <CreateLeagueReviewStep state={state} accent={accent} /> : null}
            </FormFlowSection>
          </div>
        </>
      )}
    </div>
  )
}
