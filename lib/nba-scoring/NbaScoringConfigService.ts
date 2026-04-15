/**
 * [NEW] lib/nba-scoring/NbaScoringConfigService.ts
 * Read/write NBA scoring configuration from League.settings JSON.
 * Handles preset application, custom overrides, and recalculation triggers.
 */

import { prisma } from '@/lib/prisma'
import {
  getNbaScoringPreset,
  getAfDefaultNbaScoring,
  detectPresetMatch,
  buildFullScoringConfig,
  type NbaScoringPresetKey,
  type NbaScoringSource,
} from './NbaScoringPresets'

const PREFIX = 'nba_scoring_'

export interface LeagueNbaScoringConfig {
  presetKey: NbaScoringPresetKey
  presetLabel: string
  source: NbaScoringSource
  rules: Record<string, number>
  matchesPreset: boolean
  premiumFeaturesUsed: boolean
  lastUpdatedAt: string | null
  lastUpdatedBy: string | null
  warningFlags: string[]
}

/** Read NBA scoring config from a league's settings JSON. */
export async function getLeagueNbaScoringConfig(leagueId: string): Promise<LeagueNbaScoringConfig> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { settings: true, sport: true },
  })

  if (!league || league.sport !== 'NBA') {
    const af = getAfDefaultNbaScoring()
    return {
      presetKey: 'af_default',
      presetLabel: af.label,
      source: 'AF_DEFAULT',
      rules: buildFullScoringConfig('af_default'),
      matchesPreset: true,
      premiumFeaturesUsed: false,
      lastUpdatedAt: null,
      lastUpdatedBy: null,
      warningFlags: [],
    }
  }

  const settings = (league.settings as Record<string, unknown>) ?? {}
  const raw = settings[`${PREFIX}config`] as Record<string, unknown> | undefined

  if (!raw) {
    // No scoring config saved yet — return AF default
    const af = getAfDefaultNbaScoring()
    return {
      presetKey: 'af_default',
      presetLabel: af.label,
      source: 'AF_DEFAULT',
      rules: buildFullScoringConfig('af_default'),
      matchesPreset: true,
      premiumFeaturesUsed: false,
      lastUpdatedAt: null,
      lastUpdatedBy: null,
      warningFlags: [],
    }
  }

  const rules = (raw.rules as Record<string, number>) ?? buildFullScoringConfig('af_default')
  const presetKey = (raw.presetKey as NbaScoringPresetKey) ?? 'af_default'
  const preset = getNbaScoringPreset(presetKey)

  return {
    presetKey,
    presetLabel: preset.label,
    source: (raw.source as NbaScoringSource) ?? 'AF_DEFAULT',
    rules,
    matchesPreset: detectPresetMatch(rules) === presetKey,
    premiumFeaturesUsed: Boolean(raw.premiumFeaturesUsed),
    lastUpdatedAt: (raw.lastUpdatedAt as string) ?? null,
    lastUpdatedBy: (raw.lastUpdatedBy as string) ?? null,
    warningFlags: Array.isArray(raw.warningFlags) ? raw.warningFlags as string[] : [],
  }
}

/** Save NBA scoring config to a league's settings JSON. */
export async function saveLeagueNbaScoringConfig(
  leagueId: string,
  config: {
    presetKey: NbaScoringPresetKey
    rules: Record<string, number>
    source?: NbaScoringSource
    userId?: string
    premiumFeaturesUsed?: boolean
  }
): Promise<void> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { settings: true },
  })
  const currentSettings = (league?.settings as Record<string, unknown>) ?? {}
  const preset = getNbaScoringPreset(config.presetKey)
  const warningFlags: string[] = []
  if (preset.warning) warningFlags.push('external_preset')

  await prisma.league.update({
    where: { id: leagueId },
    data: {
      settings: {
        ...currentSettings,
        [`${PREFIX}config`]: {
          presetKey: config.presetKey,
          source: config.source ?? (config.presetKey === 'af_default' ? 'AF_DEFAULT' : config.presetKey === 'custom' ? 'CUSTOM' : 'PLATFORM_PRESET'),
          rules: config.rules,
          matchesPreset: detectPresetMatch(config.rules) === config.presetKey,
          premiumFeaturesUsed: config.premiumFeaturesUsed ?? false,
          lastUpdatedAt: new Date().toISOString(),
          lastUpdatedBy: config.userId ?? null,
          warningFlags,
        },
      },
    },
  })
}

/** Apply AF default scoring to a new league during creation. */
export async function applyDefaultNbaScoringOnCreate(leagueId: string): Promise<void> {
  await saveLeagueNbaScoringConfig(leagueId, {
    presetKey: 'af_default',
    rules: buildFullScoringConfig('af_default'),
    source: 'AF_DEFAULT',
  })
}
