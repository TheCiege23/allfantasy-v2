/**
 * [NEW] lib/soccer-scoring/SoccerScoringConfigService.ts
 */
import { prisma } from '@/lib/prisma'
import { getSoccerScoringPreset, detectSoccerPresetMatch, buildFullSoccerScoringConfig, type SoccerScoringPresetKey, type SoccerScoringSource } from './SoccerScoringPresets'

const PREFIX = 'soccer_scoring_'

export interface LeagueSoccerScoringConfig {
  presetKey: SoccerScoringPresetKey; presetLabel: string; source: SoccerScoringSource
  rules: Record<string, number>; matchesPreset: boolean; premiumFeaturesUsed: boolean
  lastUpdatedAt: string | null; lastUpdatedBy: string | null; warningFlags: string[]
}

export async function getLeagueSoccerScoringConfig(leagueId: string): Promise<LeagueSoccerScoringConfig> {
  const league = await prisma.league.findUnique({ where: { id: leagueId }, select: { settings: true, sport: true } })
  if (!league || league.sport !== 'SOCCER') {
    const af = getSoccerScoringPreset('af_default')
    return { presetKey: 'af_default', presetLabel: af.label, source: 'AF_DEFAULT', rules: buildFullSoccerScoringConfig('af_default'), matchesPreset: true, premiumFeaturesUsed: false, lastUpdatedAt: null, lastUpdatedBy: null, warningFlags: [] }
  }
  const s = (league.settings as Record<string, unknown>) ?? {}
  const raw = s[`${PREFIX}config`] as Record<string, unknown> | undefined
  if (!raw) { const af = getSoccerScoringPreset('af_default'); return { presetKey: 'af_default', presetLabel: af.label, source: 'AF_DEFAULT', rules: buildFullSoccerScoringConfig('af_default'), matchesPreset: true, premiumFeaturesUsed: false, lastUpdatedAt: null, lastUpdatedBy: null, warningFlags: [] } }
  const rules = (raw.rules as Record<string, number>) ?? buildFullSoccerScoringConfig('af_default')
  const pk = (raw.presetKey as SoccerScoringPresetKey) ?? 'af_default'
  return { presetKey: pk, presetLabel: getSoccerScoringPreset(pk).label, source: (raw.source as SoccerScoringSource) ?? 'AF_DEFAULT', rules, matchesPreset: detectSoccerPresetMatch(rules) === pk, premiumFeaturesUsed: Boolean(raw.premiumFeaturesUsed), lastUpdatedAt: (raw.lastUpdatedAt as string) ?? null, lastUpdatedBy: (raw.lastUpdatedBy as string) ?? null, warningFlags: Array.isArray(raw.warningFlags) ? raw.warningFlags as string[] : [] }
}

export async function saveLeagueSoccerScoringConfig(leagueId: string, config: { presetKey: SoccerScoringPresetKey; rules: Record<string, number>; source?: SoccerScoringSource; userId?: string; premiumFeaturesUsed?: boolean }): Promise<void> {
  const league = await prisma.league.findUnique({ where: { id: leagueId }, select: { settings: true } })
  const cs = (league?.settings as Record<string, unknown>) ?? {}
  const p = getSoccerScoringPreset(config.presetKey); const wf: string[] = []; if (p.warning) wf.push('external_preset')
  await prisma.league.update({ where: { id: leagueId }, data: { settings: { ...cs, [`${PREFIX}config`]: { presetKey: config.presetKey, source: config.source ?? (config.presetKey === 'af_default' ? 'AF_DEFAULT' : config.presetKey === 'custom' ? 'CUSTOM' : 'PLATFORM_PRESET'), rules: config.rules, matchesPreset: detectSoccerPresetMatch(config.rules) === config.presetKey, premiumFeaturesUsed: config.premiumFeaturesUsed ?? false, lastUpdatedAt: new Date().toISOString(), lastUpdatedBy: config.userId ?? null, warningFlags: wf } } } })
}

export async function applyDefaultSoccerScoringOnCreate(leagueId: string): Promise<void> {
  await saveLeagueSoccerScoringConfig(leagueId, { presetKey: 'af_default', rules: buildFullSoccerScoringConfig('af_default'), source: 'AF_DEFAULT' })
}
