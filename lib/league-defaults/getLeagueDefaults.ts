import type { LeagueSport } from '@prisma/client'
import { mapCanonicalDraftTypeToEngineCore } from '@/lib/draft-types/draftTypeRegistry'
import { CONCEPT_PRESET_CATALOG } from '@/lib/league-concepts/conceptPresetCatalog'
import type { ConceptPresetSeed } from '@/lib/league-concepts/conceptPresetCatalog'
import { normalizeConceptToFormat } from '@/lib/league-creation/canonical/normalizeConcept'
import { resolveLeagueFormat, type LeagueFormatId } from '@/lib/league/format-engine'
import { normalizeToSupportedSport } from '@/lib/sport-scope'

export type LeagueFoundationDefaultsInput = {
  sport: LeagueSport | string
  format: string
  draftType: string
  managerCount?: number | null
  scoringPreset?: string | null
}

export type LeagueFoundationDefaults = {
  sport: LeagueSport
  format: LeagueFormatId
  draftType: string
  engineDraftType: 'snake' | 'linear' | 'auction'
  managerCount: number
  rosterSettings: Record<string, unknown>
  scoringSettings: Record<string, unknown>
  draftSettings: Record<string, unknown>
  waiverSettings: Record<string, unknown>
  playoffSettings: Record<string, unknown>
  scheduleSettings: Record<string, unknown>
  conceptPreset: {
    presetKey: string | null
    readiness: string
    isLaunchReady: boolean
    requiredDataFeeds: string[]
    aiEnabledFeatures: string[]
  }
}

function scorePresetMatch(args: {
  preset: ConceptPresetSeed
  sport: LeagueSport
  format: LeagueFormatId
  draftType: string
  engineDraftType: string
  scoringPreset: string
  modifiers: readonly string[]
}): number {
  const { preset, sport, format, draftType, engineDraftType, scoringPreset, modifiers } = args
  if (preset.sport !== sport || preset.leagueType !== format) return -1

  let score = 0
  if (preset.draftTypesAllowed.includes(draftType)) score += 20
  if (preset.draftTypesAllowed.includes(engineDraftType)) score += 12
  if (preset.scoringPreset === scoringPreset) score += 10

  const presetModifiers = new Set((preset.metadata.modifiers ?? []).map((m) => String(m)))
  for (const modifier of modifiers) {
    if (presetModifiers.has(String(modifier))) score += 4
  }
  if (preset.isLaunchReady) score += 1
  return score
}

function findBestConceptPreset(args: {
  sport: LeagueSport
  format: LeagueFormatId
  draftType: string
  engineDraftType: string
  scoringPreset: string
  modifiers: readonly string[]
}): ConceptPresetSeed | null {
  let best: { preset: ConceptPresetSeed; score: number } | null = null
  for (const preset of CONCEPT_PRESET_CATALOG) {
    const score = scorePresetMatch({ preset, ...args })
    if (score < 0) continue
    if (!best || score > best.score) best = { preset, score }
  }
  return best?.preset ?? null
}

function normalizeFormat(raw: string): LeagueFormatId {
  const normalized = normalizeConceptToFormat(raw)
  return (normalized?.formatId ?? 'redraft') as LeagueFormatId
}

function numericOr(value: unknown, fallback: number): number {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback
}

export function getLeagueDefaults(input: LeagueFoundationDefaultsInput): LeagueFoundationDefaults {
  const sport = normalizeToSupportedSport(input.sport)
  const format = normalizeFormat(input.format)
  const engineDraftType = mapCanonicalDraftTypeToEngineCore(input.draftType)
  const scoringPreset = String(input.scoringPreset ?? '').trim()
  const resolution = resolveLeagueFormat({
    sport,
    leagueType: format,
    draftType: input.draftType,
    leagueVariant: String(input.format).toLowerCase().includes('idp') ? 'IDP' : null,
  })
  const preset = findBestConceptPreset({
    sport,
    format,
    draftType: String(input.draftType).trim().toLowerCase(),
    engineDraftType,
    scoringPreset,
    modifiers: resolution.modifiers,
  })
  const managerCount = numericOr(
    input.managerCount,
    preset?.defaultTeamCount ?? resolution.leagueDefaults.default_team_count ?? 12,
  )
  const rounds = numericOr(resolution.draftDefaults.rounds_default, engineDraftType === 'auction' ? 15 : 15)
  const timerSeconds = numericOr(resolution.draftDefaults.timer_seconds_default, 90)
  const playoff = resolution.playoffDefaults as unknown as Record<string, unknown>
  const scoring = resolution.scoring as unknown as Record<string, unknown>
  const roster = resolution.roster as unknown as Record<string, unknown>
  const waiverDefaults = resolution.waiverDefaults as unknown as Record<string, unknown>
  const scheduleDefaults = resolution.scheduleDefaults as unknown as Record<string, unknown>

  return {
    sport,
    format,
    draftType: String(input.draftType).trim().toLowerCase(),
    engineDraftType,
    managerCount,
    rosterSettings: {
      ...roster,
      rosterSlots: preset?.rosterSlots,
      benchSlots: preset?.benchSlots,
      irSlots: preset?.irSlots,
      taxiSlots: preset?.taxiSlots,
      collegeRosterSlots: preset?.collegeRosterSlots,
    },
    scoringSettings: {
      ...scoring,
      preset: scoringPreset || preset?.scoringPreset || scoring.scoringTemplateId,
      scoringTemplateId: scoringPreset || preset?.scoringPreset || scoring.scoringTemplateId,
      scoringMode: scoring.scoringMode ?? 'points',
      rules: {
        ...(scoring.rules && typeof scoring.rules === 'object' ? scoring.rules : {}),
        ...(preset?.idpRules ? { idp: preset.idpRules } : {}),
      },
    },
    draftSettings: {
      ...resolution.draftDefaults,
      draftType: engineDraftType,
      requestedDraftType: String(input.draftType).trim().toLowerCase(),
      rounds,
      timerSeconds,
      auctionBudgetPerTeam: engineDraftType === 'auction' ? 200 : null,
      devyConfig: format === 'devy' ? { enabled: true, devyRounds: [Math.max(1, rounds - 1), rounds] } : null,
      c2cConfig: format === 'c2c' ? { enabled: true, collegeRounds: [Math.max(1, rounds - 1), rounds] } : null,
    },
    waiverSettings: waiverDefaults,
    playoffSettings: {
      ...playoff,
      playoffTeams: numericOr(playoff.playoffTeams ?? playoff.teams, format === 'guillotine' ? 1 : 6),
      playoffStartWeek: playoff.playoffStartWeek ?? playoff.startWeek ?? (format === 'guillotine' ? null : 15),
      playoffWeeksPerRound: playoff.playoffWeeksPerRound ?? playoff.weeksPerRound ?? 1,
      seedingRule: playoff.seedingRule ?? playoff.seeding ?? 'record_then_points',
      lowerBracket: playoff.lowerBracket ?? 'consolation',
    },
    scheduleSettings: scheduleDefaults,
    conceptPreset: {
      presetKey: preset?.presetKey ?? null,
      readiness: preset?.readiness ?? 'launch_ready',
      isLaunchReady: preset?.isLaunchReady ?? true,
      requiredDataFeeds: preset?.requiredDataFeeds ?? [],
      aiEnabledFeatures: preset?.aiEnabledFeatures ?? [],
    },
  }
}
