/**
 * Resolves hero / background video for Create League v2.
 * Priority (fixed): (1) league concept clip → (2) draft-type clip → (3) sport loop.
 */

import type { LeagueTypeId } from '@/lib/league-creation-wizard/types'
import type { SupportedSport } from '@/lib/create-league-v2/state'
import { LEAGUE_TYPE_MEDIA, SPORT_MEDIA, type MediaAsset } from '@/lib/create-league-v2/theme'
import { getDraftTypeMedia } from '@/lib/league-media/draftTypeMedia'
import type { WizardDraftType } from '@/lib/create-league-v2/state'
import { resolveEffectiveDraftType } from '@/lib/create-league-v2/rules-engine'

export type HeroMediaFocus = 'concept' | 'draft' | 'sport'

export type ResolvedCreateLeagueMedia = MediaAsset & {
  /** Stable key for React video remount / crossfade */
  mediaKey: string
  badge?: string
}

function asMediaFromDraft(base: string): MediaAsset {
  return { video: base, fallback: '/af-crest.png' }
}

/**
 * Hero media resolution. Always tries concept first, then draft format, then sport.
 * `draftEmphasis` is kept for analytics / future use; it does not override priority order.
 */
export function resolveCreateLeagueHeroMedia(args: {
  leagueType: LeagueTypeId
  sport: SupportedSport
  draftType: WizardDraftType
  idpSelected: boolean
  /** Kept for callers (scroll/draft section visibility); does not change priority order. */
  draftEmphasis: boolean
}): ResolvedCreateLeagueMedia {
  const conceptKey = args.idpSelected ? 'idp' : args.leagueType
  const concept = LEAGUE_TYPE_MEDIA[conceptKey] ?? LEAGUE_TYPE_MEDIA.redraft

  const effective = resolveEffectiveDraftType(args.leagueType, args.draftType)
  const draftRow = getDraftTypeMedia(effective as import('@/lib/league-creation-wizard/types').DraftTypeId)
  const draftClip = asMediaFromDraft(draftRow.selectionVideo)

  const sport = SPORT_MEDIA[args.sport] ?? SPORT_MEDIA.NFL

  if (concept?.video) {
    return {
      ...concept,
      mediaKey: `concept:${conceptKey}`,
      badge: undefined,
    }
  }

  if (draftClip?.video) {
    return {
      ...draftClip,
      mediaKey: `draft:${effective}`,
      poster: draftRow.thumbnail,
      badge: 'Draft format',
    }
  }

  return {
    ...sport,
    mediaKey: `sport:${args.sport}`,
    badge: undefined,
  }
}
