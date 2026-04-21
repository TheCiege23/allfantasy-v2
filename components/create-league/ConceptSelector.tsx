'use client'

import type { LeagueTypeId } from '@/lib/league-creation-wizard/types'
import type { AccentTone } from '@/lib/create-league-v2/theme'
import type { CreateLeagueV2State } from '@/lib/create-league-v2/state'
import { SUPPORTED_SPORTS, getEffectiveLeagueType } from '@/lib/create-league-v2/state'
import {
  getDraftTypeOptions,
  getDefaultTeamCount,
  isDraftTypeAllowedForType,
  isIdpAvailableForSport,
  isSportAllowedForType,
} from '@/lib/create-league-v2/rules-engine'
import { resolveScoringPresetId } from '@/lib/league-creation-preset/scoring-presets'
import type { SupportedSport } from '@/lib/create-league-v2/state'
import { GlassCard, SelectableCard, SectionHeader } from '@/components/create-league-v2/primitives'
import { LEAGUE_TYPE_MEDIA } from '@/lib/create-league-v2/theme'
import { useLanguage } from '@/components/i18n/LanguageProviderClient'

export type LeagueConceptCard = {
  id: LeagueTypeId | 'idp'
  title: string
  subtitle: string
  icon: string
}

export const LEAGUE_CONCEPT_CARDS: LeagueConceptCard[] = [
  { id: 'redraft', title: 'Redraft', subtitle: 'Fresh draft every season', icon: '◆' },
  { id: 'dynasty', title: 'Dynasty', subtitle: 'Keep your core forever', icon: '♔' },
  { id: 'keeper', title: 'Keeper', subtitle: 'Hold a few, draft the rest', icon: '⬡' },
  { id: 'best_ball', title: 'Best Ball', subtitle: 'Set and forget', icon: '◉' },
  { id: 'idp', title: 'IDP', subtitle: 'Individual defensive players', icon: '🛡' },
  { id: 'salary_cap', title: 'Salary Cap', subtitle: 'Budget-based rosters', icon: '$' },
  { id: 'devy', title: 'Devy', subtitle: 'Draft college prospects', icon: '✦' },
  { id: 'c2c', title: 'C2C', subtitle: 'College to pros', icon: '⇄' },
  { id: 'guillotine', title: 'Guillotine', subtitle: 'Lowest score is eliminated', icon: '✕' },
  { id: 'zombie', title: 'Zombie', subtitle: 'Infection-style survival', icon: '☣' },
  { id: 'survivor', title: 'Survivor', subtitle: 'Vote players off', icon: '⚑' },
  { id: 'tournament', title: 'Tournament', subtitle: 'Bracket-style playoffs', icon: '⚔' },
  { id: 'big_brother', title: 'Big Brother', subtitle: 'Weekly nominations', icon: '◎' },
]

function localizedConceptCard(
  t: (key: string) => string,
  card: LeagueConceptCard,
): { title: string; subtitle: string } {
  const tk = `createLeague.concept.${card.id}.title`
  const sk = `createLeague.concept.${card.id}.subtitle`
  const tv = t(tk)
  const sv = t(sk)
  return {
    title: tv === tk ? card.title : tv,
    subtitle: sv === sk ? card.subtitle : sv,
  }
}

function isCardSelected(card: LeagueConceptCard, state: CreateLeagueV2State): boolean {
  if (card.id === 'idp') return state.idpSelected
  return state.leagueType === card.id && !state.idpSelected
}

export function ConceptSelector({
  state,
  accent,
  onChange,
  error,
}: {
  state: CreateLeagueV2State
  accent: AccentTone
  onChange: (patch: Partial<CreateLeagueV2State>) => void
  error?: string
}) {
  const { t } = useLanguage()
  const effectiveType = getEffectiveLeagueType(state)

  function handleLeagueTypeSelect(card: LeagueConceptCard) {
    const patch: Partial<CreateLeagueV2State> = {}

    if (card.id === 'idp') {
      patch.idpSelected = true
      patch.leagueType = 'redraft'
      if (!isIdpAvailableForSport(state.sport)) {
        patch.sport = 'NFL'
        patch.soccerPipeline = null
      }
    } else {
      const selectedLeagueType: LeagueTypeId = card.id
      patch.idpSelected = false
      patch.leagueType = selectedLeagueType
      if (!isSportAllowedForType(state.sport, selectedLeagueType)) {
        const fallback = SUPPORTED_SPORTS.find((s) => isSportAllowedForType(s, selectedLeagueType))
        if (fallback) {
          patch.sport = fallback
          patch.soccerPipeline = fallback === 'SOCCER' ? 'euro' : null
        }
      }
    }

    const resolvedType: LeagueTypeId = card.id === 'idp' ? 'redraft' : card.id
    if (!isDraftTypeAllowedForType(state.draftType, resolvedType)) {
      const firstAllowed = getDraftTypeOptions(resolvedType)
      patch.draftType = firstAllowed[0]?.id ?? 'snake'
    }

    const nextSport = (patch.sport ?? state.sport) as SupportedSport
    const nextPipeline = patch.soccerPipeline ?? state.soccerPipeline
    patch.teamCount = getDefaultTeamCount(nextSport, resolvedType, nextPipeline)
    patch.scoringPresetId = resolveScoringPresetId(state.scoringPresetId, {
      leagueType: resolvedType,
      sport: nextSport,
      idpSelected: patch.idpSelected ?? state.idpSelected,
    })
    patch.nameTouched = false
    onChange(patch)
  }

  return (
    <GlassCard>
      <SectionHeader
        title={t('createLeague.section.conceptTitle')}
        hint={t('createLeague.section.conceptHint')}
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {LEAGUE_CONCEPT_CARDS.map((card) => {
          const copy = localizedConceptCard(t, card)
          return (
            <SelectableCard
              key={card.id}
              selected={isCardSelected(card, state)}
              onClick={() => handleLeagueTypeSelect(card)}
              accent={accent}
              title={copy.title}
              subtitle={copy.subtitle}
              icon={card.icon}
            />
          )
        })}
      </div>
      {effectiveType ? (
        <p className="mt-4 text-[11px] text-white/35">
          Preview:{' '}
          <span className="text-white/55">
            {(state.idpSelected ? LEAGUE_TYPE_MEDIA.idp : LEAGUE_TYPE_MEDIA[effectiveType])?.video
              ? 'Video loop active for this concept.'
              : 'Gradient fallback.'}
          </span>
        </p>
      ) : null}
      {error ? (
        <p className="mt-3 text-xs text-rose-300/90" role="alert">
          {error}
        </p>
      ) : null}
    </GlassCard>
  )
}
