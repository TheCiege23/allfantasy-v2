import type { Prisma, PrismaClient } from '@prisma/client'
import {
  SPORT_CONFIGS,
  estimateMaxRosterSize,
  toLegacyDefaultPositions,
  toLegacyStatCategories,
} from '../../lib/sportConfig'

function asJson(v: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue
}

export async function seedSportConfigs(prisma: PrismaClient) {
  for (const config of Object.values(SPORT_CONFIGS)) {
    const statCategories = toLegacyStatCategories(config)
    const defaultPositions = toLegacyDefaultPositions(config)
    const maxRosterSize = estimateMaxRosterSize(config)

    await prisma.sportConfig.upsert({
      where: { sport: config.sport },
      create: {
        sport: config.sport,
        displayName: config.displayName,
        slug: config.slug,
        lineupFrequency: config.lineupFrequency ?? 'weekly',
        scoringType: config.defaultScoringSystem,
        defaultScoringSystem: config.defaultScoringSystem,
        scoringCategories: asJson(config.scoringCategories),
        scoringPresets: asJson(config.scoringPresets),
        defaultRosterSlots: asJson(config.defaultRosterSlots),
        defaultBenchSlots: config.defaultBenchSlots,
        defaultIRSlots: config.defaultIRSlots,
        defaultTaxiSlots: config.defaultTaxiSlots,
        defaultDevySlots: config.defaultDevySlots,
        positionEligibility: asJson(config.positionEligibility),
        defaultSeasonWeeks: config.defaultSeasonWeeks,
        defaultPlayoffStartWeek: config.defaultPlayoffStartWeek,
        defaultPlayoffTeams: config.defaultPlayoffTeams,
        defaultMatchupPeriodDays: config.defaultMatchupPeriodDays,
        lineupLockType: config.lineupLockType,
        supportsRedraft: config.supportsRedraft,
        supportsDynasty: config.supportsDynasty,
        supportsKeeper: config.supportsKeeper,
        supportsDevy: config.supportsDevy,
        supportsC2C: config.supportsC2C,
        supportsIDP: config.supportsIDP,
        supportsSuperflex: config.supportsSuperflex,
        supportsTEPremium: config.supportsTEPremium,
        supportsPPR: config.supportsPPR,
        supportsCategories: config.supportsCategories,
        supportsDailyLineups: config.supportsDailyLineups,
        commissionerSettings: asJson(config.commissionerSettings),
        aiMetadata: asJson(config.aiMetadata),
        hasIR: config.defaultIRSlots > 0,
        hasTaxi: config.defaultTaxiSlots > 0,
        hasBye: config.hasBye ?? false,
        maxRosterSize,
        defaultPositions: asJson(defaultPositions),
        statCategories: asJson(statCategories),
      },
      update: {
        displayName: config.displayName,
        slug: config.slug,
        lineupFrequency: config.lineupFrequency ?? 'weekly',
        scoringType: config.defaultScoringSystem,
        defaultScoringSystem: config.defaultScoringSystem,
        scoringCategories: asJson(config.scoringCategories),
        scoringPresets: asJson(config.scoringPresets),
        defaultRosterSlots: asJson(config.defaultRosterSlots),
        defaultBenchSlots: config.defaultBenchSlots,
        defaultIRSlots: config.defaultIRSlots,
        defaultTaxiSlots: config.defaultTaxiSlots,
        defaultDevySlots: config.defaultDevySlots,
        positionEligibility: asJson(config.positionEligibility),
        defaultSeasonWeeks: config.defaultSeasonWeeks,
        defaultPlayoffStartWeek: config.defaultPlayoffStartWeek,
        defaultPlayoffTeams: config.defaultPlayoffTeams,
        defaultMatchupPeriodDays: config.defaultMatchupPeriodDays,
        lineupLockType: config.lineupLockType,
        supportsRedraft: config.supportsRedraft,
        supportsDynasty: config.supportsDynasty,
        supportsKeeper: config.supportsKeeper,
        supportsDevy: config.supportsDevy,
        supportsC2C: config.supportsC2C,
        supportsIDP: config.supportsIDP,
        supportsSuperflex: config.supportsSuperflex,
        supportsTEPremium: config.supportsTEPremium,
        supportsPPR: config.supportsPPR,
        supportsCategories: config.supportsCategories,
        supportsDailyLineups: config.supportsDailyLineups,
        commissionerSettings: asJson(config.commissionerSettings),
        aiMetadata: asJson(config.aiMetadata),
        hasIR: config.defaultIRSlots > 0,
        hasTaxi: config.defaultTaxiSlots > 0,
        hasBye: config.hasBye ?? false,
        maxRosterSize,
        defaultPositions: asJson(defaultPositions),
        statCategories: asJson(statCategories),
      },
    })
  }
}
