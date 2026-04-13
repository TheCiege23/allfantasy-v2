/**
 * [NEW] lib/ncaab-scoring/NcaabScoringConfigService.ts
 */
import { prisma } from '@/lib/prisma'
import { getNcaabScoringPreset, detectNcaabPresetMatch, buildFullNcaabScoringConfig, type NcaabScoringPresetKey, type NcaabScoringSource } from './NcaabScoringPresets'

const PREFIX = 'ncaab_scoring_'

export interface LeagueNcaabScoringConfig {
  presetKey: NcaabScoringPresetKey; presetLabel: string; source: NcaabScoringSource
  rules: Record<string, number>; matchesPreset: boolean; premiumFeaturesUsed: boolean
  lastUpdatedAt: string | null; lastUpdatedBy: string | null; warningFlags: string[]
}

export async function getLeagueNcaabScoringConfig(leagueId: string): Promise<LeagueNcaabScoringConfig> {
  const league = await prisma.league.findUnique({ where: { id: leagueId }, select: { settings: true, sport: true } })
  if (!league || league.sport !== 'NCAAB') {
    const af = getNcaabScoringPreset('af_default')
    return { presetKey: 'af_default', presetLabel: af.label, source: 'AF_DEFAULT', rules: buildFullNcaabScoringConfig('af_default'), matchesPreset: true, premiumFeaturesUsed: false, lastUpdatedAt: null, lastUpdatedBy: null, warningFlags: [] }
  }
  const s = (league.settings as Record<string, unknown>) ?? {}
  const raw = s[`${PREFIX}config`] as Record<string, unknown> | undefined
  if (!raw) { const af = getNcaabScoringPreset('af_default'); return { presetKey: 'af_default', presetLabel: af.label, source: 'AF_DEFAULT', rules: buildFullNcaabScoringConfig('af_default'), matchesPreset: true, premiumFeaturesUsed: false, lastUpdatedAt: null, lastUpdatedBy: null, warningFlags: [] } }
  const rules = (raw.rules as Record<string, number>) ?? buildFullNcaabScoringConfig('af_default')
  const pk = (raw.presetKey as NcaabScoringPresetKey) ?? 'af_default'
  return { presetKey: pk, presetLabel: getNcaabScoringPreset(pk).label, source: (raw.source as NcaabScoringSource) ?? 'AF_DEFAULT', rules, matchesPreset: detectNcaabPresetMatch(rules) === pk, premiumFeaturesUsed: Boolean(raw.premiumFeaturesUsed), lastUpdatedAt: (raw.lastUpdatedAt as string) ?? null, lastUpdatedBy: (raw.lastUpdatedBy as string) ?? null, warningFlags: Array.isArray(raw.warningFlags) ? raw.warningFlags as string[] : [] }
}

export async function saveLeagueNcaabScoringConfig(leagueId: string, config: { presetKey: NcaabScoringPresetKey; rules: Record<string, number>; source?: NcaabScoringSource; userId?: string; premiumFeaturesUsed?: boolean }): Promise<void> {
  const league = await prisma.league.findUnique({ where: { id: leagueId }, select: { settings: true } })
  const cs = (league?.settings as Record<string, unknown>) ?? {}
  const p = getNcaabScoringPreset(config.presetKey); const wf: string[] = []; if (p.warning) wf.push('external_preset')
  await prisma.league.update({ where: { id: leagueId }, data: { settings: { ...cs, [`${PREFIX}config`]: { presetKey: config.presetKey, source: config.source ?? (config.presetKey === 'af_default' ? 'AF_DEFAULT' : config.presetKey === 'custom' ? 'CUSTOM' : 'PLATFORM_PRESET'), rules: config.rules, matchesPreset: detectNcaabPresetMatch(config.rules) === config.presetKey, premiumFeaturesUsed: config.premiumFeaturesUsed ?? false, lastUpdatedAt: new Date().toISOString(), lastUpdatedBy: config.userId ?? null, warningFlags: wf } } } })
}

export async function applyDefaultNcaabScoringOnCreate(leagueId: string): Promise<void> {
  await saveLeagueNcaabScoringConfig(leagueId, { presetKey: 'af_default', rules: buildFullNcaabScoringConfig('af_default'), source: 'AF_DEFAULT' })
}
