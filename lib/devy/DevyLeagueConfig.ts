/**
 * Devy Dynasty league config: load, detect, upsert. PROMPT 2/6.
 * Sport adapter derived from League.sport (nfl_devy | nba_devy).
 */

import { prisma } from '@/lib/prisma'
import { normalizeToSupportedSport } from '@/lib/sport-scope'
import type { LeagueSport } from '@prisma/client'
import {
  getDevyAdapterForSport,
  type DevyLeagueConfigShape,
  type DevyFormatCapabilities,
  type DevyCommissionerSettings,
  DEVY_DYNASTY_VARIANT,
} from './types'
import {
  DEFAULT_DEVY_SLOTS_NFL,
  DEFAULT_DEVY_SLOTS_NBA,
  DEFAULT_TAXI_NFL,
  DEFAULT_TAXI_NBA,
  DEFAULT_ROOKIE_ROUNDS_NFL,
  DEFAULT_ROOKIE_ROUNDS_NBA,
  DEFAULT_DEVY_ROUNDS_NFL,
  DEFAULT_DEVY_ROUNDS_NBA,
} from './constants'

const DEFAULT_CAPABILITIES: DevyFormatCapabilities = {
  dynastyOnly: true,
  supportsStartupVetDraft: true,
  supportsRookieDraft: true,
  supportsDevyDraft: true,
  supportsBestBall: true,
  supportsSnakeDraft: true,
  supportsLinearDraft: true,
  supportsTaxi: true,
  supportsFuturePicks: true,
  supportsTradeableDevyPicks: true,
  supportsTradeableRookiePicks: true,
}

function defaultCommissionerSettings(sport: LeagueSport): DevyCommissionerSettings {
  const isFootball = sport === 'NFL' || sport === 'NCAAF'
  return {
    devySlotCount: isFootball ? DEFAULT_DEVY_SLOTS_NFL : DEFAULT_DEVY_SLOTS_NBA,
    devyIRSlots: 2,
    taxiSize: isFootball ? DEFAULT_TAXI_NFL : DEFAULT_TAXI_NBA,
    devyScoringEnabled: false,
    collegeSports: [isFootball ? 'NCAAF' : 'NCAAB'],
    rookieDraftRounds: isFootball ? DEFAULT_ROOKIE_ROUNDS_NFL : DEFAULT_ROOKIE_ROUNDS_NBA,
    devyDraftRounds: isFootball ? DEFAULT_DEVY_ROUNDS_NFL : DEFAULT_DEVY_ROUNDS_NBA,
    startupVetRounds: null,
    bestBallEnabled: false,
    startupDraftType: 'snake',
    rookieDraftType: 'snake',
    devyDraftType: 'snake',
    maxYearlyDevyPromotions: null,
    earlyDeclareBehavior: 'allow',
    rookiePickOrderMethod: 'reverse_standings',
    devyPickOrderMethod: 'reverse_standings',
    devyPickTradeRules: 'allowed',
    rookiePickTradeRules: 'allowed',
    nflDevyExcludeKDST: false,
    promotionTiming: 'manager_choice_before_rookie_draft',
    supplementalDevyFAEnabled: false,
    rightsExpirationEnabled: false,
    returnToSchoolHandling: 'restore_rights',
    taxiProRookiesScoreInBestBall: false,
    bestBallSuperflex: false,
  }
}

export async function isDevyLeague(leagueId: string): Promise<boolean> {
  const config = await prisma.devyLeagueConfig.findUnique({
    where: { leagueId },
    select: { id: true },
  })
  if (config) return true
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { leagueVariant: true },
  })
  return league?.leagueVariant === DEVY_DYNASTY_VARIANT
}

export async function getDevyConfig(leagueId: string): Promise<DevyLeagueConfigShape | null> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { id: true, sport: true, leagueVariant: true },
  })
  if (!league) return null
  const sport = normalizeToSupportedSport(league.sport) as LeagueSport
  const sportAdapterId = getDevyAdapterForSport(sport)

  const row = await prisma.devyLeagueConfig.findUnique({
    where: { leagueId },
  })
  if (row) {
    return {
      leagueId: row.leagueId,
      sport,
      sportAdapterId,
      ...DEFAULT_CAPABILITIES,
      devySlotCount: row.devySlotCount,
      devyIRSlots: (row as any).devyIRSlots ?? 0,
      taxiSize: row.taxiSize,
      devyScoringEnabled: (row as any).devyScoringEnabled ?? false,
      collegeSports: Array.isArray((row as any).collegeSports)
        ? ((row as any).collegeSports as string[]).filter(Boolean)
        : defaults.collegeSports,
      rookieDraftRounds: row.rookieDraftRounds,
      devyDraftRounds: row.devyDraftRounds,
      startupVetRounds: row.startupVetRounds,
      bestBallEnabled: row.bestBallEnabled,
      startupDraftType: row.startupDraftType as 'snake' | 'linear',
      rookieDraftType: row.rookieDraftType as 'snake' | 'linear',
      devyDraftType: row.devyDraftType as 'snake' | 'linear',
      maxYearlyDevyPromotions: row.maxYearlyDevyPromotions,
      earlyDeclareBehavior: row.earlyDeclareBehavior as DevyCommissionerSettings['earlyDeclareBehavior'],
      rookiePickOrderMethod: row.rookiePickOrderMethod as DevyCommissionerSettings['rookiePickOrderMethod'],
      devyPickOrderMethod: row.devyPickOrderMethod as DevyCommissionerSettings['devyPickOrderMethod'],
      devyPickTradeRules: row.devyPickTradeRules as DevyCommissionerSettings['devyPickTradeRules'],
      rookiePickTradeRules: row.rookiePickTradeRules as DevyCommissionerSettings['rookiePickTradeRules'],
      nflDevyExcludeKDST: row.nflDevyExcludeKDST,
      promotionTiming: (row as any).promotionTiming ?? 'manager_choice_before_rookie_draft',
      supplementalDevyFAEnabled: (row as any).supplementalDevyFAEnabled ?? false,
      rightsExpirationEnabled: (row as any).rightsExpirationEnabled ?? false,
      returnToSchoolHandling: ((row as any).returnToSchoolHandling ?? 'restore_rights') as DevyCommissionerSettings['returnToSchoolHandling'],
      taxiProRookiesScoreInBestBall: (row as any).taxiProRookiesScoreInBestBall ?? false,
      bestBallSuperflex: (row as any).bestBallSuperflex ?? false,
    }
  }

  if (league.leagueVariant !== DEVY_DYNASTY_VARIANT) return null

  const defaults = defaultCommissionerSettings(sport)
  return {
    leagueId: league.id,
    sport,
    sportAdapterId,
    ...DEFAULT_CAPABILITIES,
    ...defaults,
  }
}

export async function upsertDevyConfig(
  leagueId: string,
  input: Partial<{
    devySlotCount: number
    devyIRSlots: number
    taxiSize: number
    devyScoringEnabled: boolean
    collegeSports: string[]
    rookieDraftRounds: number
    devyDraftRounds: number
    startupVetRounds: number | null
    bestBallEnabled: boolean
    startupDraftType: string
    rookieDraftType: string
    devyDraftType: string
    maxYearlyDevyPromotions: number | null
    earlyDeclareBehavior: string
    rookiePickOrderMethod: string
    devyPickOrderMethod: string
    devyPickTradeRules: string
    rookiePickTradeRules: string
    nflDevyExcludeKDST: boolean
    promotionTiming: string
    supplementalDevyFAEnabled: boolean
    rightsExpirationEnabled: boolean
    returnToSchoolHandling: string
    taxiProRookiesScoreInBestBall: boolean
    bestBallSuperflex: boolean
  }>
): Promise<DevyLeagueConfigShape | null> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { sport: true },
  })
  if (!league) return null
  const sport = normalizeToSupportedSport(league.sport) as LeagueSport
  const defaults = defaultCommissionerSettings(sport)

  await prisma.devyLeagueConfig.upsert({
    where: { leagueId },
    create: {
      leagueId,
      dynastyOnly: true,
      supportsStartupVetDraft: true,
      supportsRookieDraft: true,
      supportsDevyDraft: true,
      supportsBestBall: true,
      supportsSnakeDraft: true,
      supportsLinearDraft: true,
      supportsTaxi: true,
      supportsFuturePicks: true,
      supportsTradeableDevyPicks: true,
      supportsTradeableRookiePicks: true,
      devySlotCount: input.devySlotCount ?? defaults.devySlotCount,
      devyIRSlots: input.devyIRSlots ?? defaults.devyIRSlots,
      taxiSize: input.taxiSize ?? defaults.taxiSize,
      devyScoringEnabled: input.devyScoringEnabled ?? defaults.devyScoringEnabled,
      collegeSports: input.collegeSports ?? defaults.collegeSports,
      rookieDraftRounds: input.rookieDraftRounds ?? defaults.rookieDraftRounds,
      devyDraftRounds: input.devyDraftRounds ?? defaults.devyDraftRounds,
      startupVetRounds: input.startupVetRounds ?? null,
      bestBallEnabled: input.bestBallEnabled ?? false,
      startupDraftType: input.startupDraftType ?? 'snake',
      rookieDraftType: input.rookieDraftType ?? 'snake',
      devyDraftType: input.devyDraftType ?? 'snake',
      maxYearlyDevyPromotions: input.maxYearlyDevyPromotions ?? null,
      earlyDeclareBehavior: input.earlyDeclareBehavior ?? 'allow',
      rookiePickOrderMethod: input.rookiePickOrderMethod ?? 'reverse_standings',
      devyPickOrderMethod: input.devyPickOrderMethod ?? 'reverse_standings',
      devyPickTradeRules: input.devyPickTradeRules ?? 'allowed',
      rookiePickTradeRules: input.rookiePickTradeRules ?? 'allowed',
      nflDevyExcludeKDST: input.nflDevyExcludeKDST ?? false,
      promotionTiming: input.promotionTiming ?? 'manager_choice_before_rookie_draft',
      supplementalDevyFAEnabled: input.supplementalDevyFAEnabled ?? false,
      rightsExpirationEnabled: input.rightsExpirationEnabled ?? false,
      returnToSchoolHandling: input.returnToSchoolHandling ?? 'restore_rights',
      taxiProRookiesScoreInBestBall: input.taxiProRookiesScoreInBestBall ?? false,
      bestBallSuperflex: input.bestBallSuperflex ?? false,
    },
    update: {
      ...(input.devySlotCount !== undefined && { devySlotCount: input.devySlotCount }),
      ...(input.devyIRSlots !== undefined && { devyIRSlots: input.devyIRSlots }),
      ...(input.taxiSize !== undefined && { taxiSize: input.taxiSize }),
      ...(input.devyScoringEnabled !== undefined && { devyScoringEnabled: input.devyScoringEnabled }),
      ...(input.collegeSports !== undefined && { collegeSports: input.collegeSports }),
      ...(input.rookieDraftRounds !== undefined && { rookieDraftRounds: input.rookieDraftRounds }),
      ...(input.devyDraftRounds !== undefined && { devyDraftRounds: input.devyDraftRounds }),
      ...(input.startupVetRounds !== undefined && { startupVetRounds: input.startupVetRounds }),
      ...(input.bestBallEnabled !== undefined && { bestBallEnabled: input.bestBallEnabled }),
      ...(input.startupDraftType !== undefined && { startupDraftType: input.startupDraftType }),
      ...(input.rookieDraftType !== undefined && { rookieDraftType: input.rookieDraftType }),
      ...(input.devyDraftType !== undefined && { devyDraftType: input.devyDraftType }),
      ...(input.maxYearlyDevyPromotions !== undefined && { maxYearlyDevyPromotions: input.maxYearlyDevyPromotions }),
      ...(input.earlyDeclareBehavior !== undefined && { earlyDeclareBehavior: input.earlyDeclareBehavior }),
      ...(input.rookiePickOrderMethod !== undefined && { rookiePickOrderMethod: input.rookiePickOrderMethod }),
      ...(input.devyPickOrderMethod !== undefined && { devyPickOrderMethod: input.devyPickOrderMethod }),
      ...(input.devyPickTradeRules !== undefined && { devyPickTradeRules: input.devyPickTradeRules }),
      ...(input.rookiePickTradeRules !== undefined && { rookiePickTradeRules: input.rookiePickTradeRules }),
      ...(input.nflDevyExcludeKDST !== undefined && { nflDevyExcludeKDST: input.nflDevyExcludeKDST }),
      ...(input.promotionTiming !== undefined && { promotionTiming: input.promotionTiming }),
      ...(input.supplementalDevyFAEnabled !== undefined && { supplementalDevyFAEnabled: input.supplementalDevyFAEnabled }),
      ...(input.rightsExpirationEnabled !== undefined && { rightsExpirationEnabled: input.rightsExpirationEnabled }),
      ...(input.returnToSchoolHandling !== undefined && { returnToSchoolHandling: input.returnToSchoolHandling }),
      ...(input.taxiProRookiesScoreInBestBall !== undefined && { taxiProRookiesScoreInBestBall: input.taxiProRookiesScoreInBestBall }),
      ...(input.bestBallSuperflex !== undefined && { bestBallSuperflex: input.bestBallSuperflex }),
    },
  })
  return getDevyConfig(leagueId)
}
