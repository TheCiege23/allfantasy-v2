import type { LeagueSport } from '@prisma/client'

export type FootballRedraftSport = 'NFL' | 'NCAAF'
export type RedraftDraftType =
  | 'snake'
  | 'linear'
  | 'auction'
  | 'slow_draft'
  | 'offline'
  | 'auto'
  | 'mock_draft'

export type RedraftDraftSurface = 'live' | 'mock'

type EngineDraftType = 'snake' | 'linear' | 'auction'

export interface RedraftRosterTemplate {
  rosterMode: 'redraft'
  starterSlots: Record<string, number>
  flexDefinitions: Array<{ slotName: string; allowedPositions: string[] }>
  benchSlots: number
  irSlots: number
  taxiSlots: 0
  keeperSlots: 0
  rosterSlots: number
  draftableRosterSlots: number
  totalRosterSlots: number
  rosterPositions: string[]
  draftablePlayerPositions: string[]
  defensePosition: 'DST' | 'DEF'
}

export interface RedraftDraftSettings {
  draftType: EngineDraftType
  requestedDraftType: RedraftDraftType
  rounds: number
  fallbackRounds: number
  timerSeconds: number
  slowTimerSeconds: number
  pickOrderRules: 'snake' | 'linear'
  snakeOrLinear: 'snake' | 'linear'
  thirdRoundReversal: false
  autopickBehavior: 'queue-first'
  autopickBehaviorAlias: 'queue_first'
  queueSizeLimit: number
  preDraftRankingSource: string
  rosterFillOrder: string
  positionFilterBehavior: string
  auctionBudgetPerTeam: number | null
}

export interface RedraftDefaultContract {
  sport: FootballRedraftSport
  league_type: 'redraft'
  leagueType: 'redraft'
  draft_type: EngineDraftType
  requested_draft_type: RedraftDraftType
  teams: number
  rounds: number
  timer_seconds: number
  scoring_preset_id: string
  scoringPresetAliases: string[]
  roster_mode: 'redraft'
  rosterTemplate: RedraftRosterTemplate
  scoringSettings: Record<string, unknown>
  draftSettings: RedraftDraftSettings
  playerPoolRules: Record<string, unknown>
  tabsEnabled: Record<string, true | 'commissioner'>
  mockDraftRules: Record<string, unknown>
  liveDraftRules: Record<string, unknown>
  disabledSettings: Record<string, unknown>
}

export const REDRAFT_DRAFT_TYPE_IDS: readonly RedraftDraftType[] = [
  'snake',
  'linear',
  'auction',
  'slow_draft',
  'offline',
  'auto',
  'mock_draft',
] as const

const NFL_STARTERS = { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, K: 1, DST: 1 } as const
const NCAAF_STARTERS = { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, K: 1, DEF: 1 } as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asPositiveInt(value: unknown, fallback: number): number {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback
}

function starterCount(starters: Record<string, number>): number {
  return Object.values(starters).reduce((total, count) => total + count, 0)
}

function unique(values: string[]): string[] {
  return [...new Set(values)]
}

export function isFootballRedraftDefaultsSport(sport: unknown): sport is FootballRedraftSport {
  const normalized = String(sport ?? '').trim().toUpperCase()
  return normalized === 'NFL' || normalized === 'NCAAF'
}

export function normalizeRedraftDraftType(value: unknown): RedraftDraftType {
  const raw = String(value ?? '').trim().toLowerCase()
  const normalized =
    raw === 'slow'
      ? 'slow_draft'
      : raw === 'mock'
        ? 'mock_draft'
        : raw
  return (REDRAFT_DRAFT_TYPE_IDS as readonly string[]).includes(normalized)
    ? (normalized as RedraftDraftType)
    : 'snake'
}

export function getRedraftEngineDraftType(draftType: unknown): EngineDraftType {
  const normalized = normalizeRedraftDraftType(draftType)
  if (normalized === 'auction') return 'auction'
  if (normalized === 'linear') return 'linear'
  return 'snake'
}

function pickOrderForDraftType(draftType: unknown): 'snake' | 'linear' {
  return getRedraftEngineDraftType(draftType) === 'linear' ? 'linear' : 'snake'
}

function defaultScoringPresetId(sport: FootballRedraftSport): string {
  return sport === 'NCAAF' ? 'ncaaf_half_ppr' : 'fb_half_ppr'
}

function scoringPprValue(presetId: string): number {
  const id = presetId.toLowerCase()
  if (id.includes('standard') || id.endsWith('_std') || id === 'fb_std') return 0
  if (id.includes('half')) return 0.5
  if (id.includes('ppr')) return 1
  return 0.5
}

function scoringFormatForPreset(presetId: string): string {
  const ppr = scoringPprValue(presetId)
  if (ppr === 0) return 'standard'
  if (ppr === 1) return 'ppr'
  return 'half_ppr'
}

function scoringTemplateId(sport: FootballRedraftSport, presetId: string): string {
  const format = scoringFormatForPreset(presetId)
  if (sport === 'NCAAF') {
    if (format === 'standard') return 'default-NCAAF-standard'
    if (format === 'ppr') return 'default-NCAAF-PPR'
    return 'default-NCAAF-HALF_PPR'
  }
  if (format === 'standard') return 'default-NFL-standard'
  if (format === 'ppr') return 'default-NFL-PPR'
  return 'default-NFL-HALF_PPR'
}

function scoringAliasesForPreset(sport: FootballRedraftSport, presetId: string): string[] {
  const format = scoringFormatForPreset(presetId)
  if (sport === 'NCAAF') {
    if (format === 'standard') return ['standard_college', 'ncaaf_standard_college']
    if (format === 'ppr') return ['ppr_college', 'ncaaf_ppr_college']
    return ['half_ppr_college', 'ncaaf_half_ppr_college']
  }
  if (format === 'standard') return ['standard', 'fb_standard']
  if (format === 'ppr') return ['ppr', 'fb_full_ppr', 'fb_ppr']
  return ['half_ppr', 'fb_half_ppr']
}

function buildRosterTemplate(sport: FootballRedraftSport): RedraftRosterTemplate {
  const starterSlots = sport === 'NCAAF' ? { ...NCAAF_STARTERS } : { ...NFL_STARTERS }
  const rosterPositions = Object.keys(starterSlots)
  const draftablePlayerPositions =
    sport === 'NCAAF'
      ? ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']
      : ['QB', 'RB', 'WR', 'TE', 'K', 'DST']
  const benchSlots = sport === 'NCAAF' ? 8 : 6
  const irSlots = 1
  const rosterSlots = starterCount(starterSlots)
  return {
    rosterMode: 'redraft',
    starterSlots,
    flexDefinitions: [{ slotName: 'FLEX', allowedPositions: ['RB', 'WR', 'TE'] }],
    benchSlots,
    irSlots,
    taxiSlots: 0,
    keeperSlots: 0,
    rosterSlots,
    draftableRosterSlots: rosterSlots + benchSlots,
    totalRosterSlots: rosterSlots + benchSlots + irSlots,
    rosterPositions,
    draftablePlayerPositions,
    defensePosition: sport === 'NCAAF' ? 'DEF' : 'DST',
  }
}

function buildScoringSettings(
  sport: FootballRedraftSport,
  scoringPresetId: string,
): Record<string, unknown> {
  const format = scoringFormatForPreset(scoringPresetId)
  const ppr = scoringPprValue(scoringPresetId)
  return {
    source: 'af',
    sport,
    preset: scoringPresetId,
    scoringPresetId,
    scoringTemplateId: scoringTemplateId(sport, scoringPresetId),
    scoringMode: 'points',
    scoringFormat: sport === 'NCAAF' ? `${format}_college` : format,
    format,
    ppr,
    superflex: false,
    tePremium: false,
    tePremiumMultiplier: 1,
    idp: false,
    rules: {
      ppr,
      passingTouchdown: 4,
      receivingTouchdown: 6,
      rushingTouchdown: 6,
      fieldGoalMade: 3,
      teamDefenseTouchdown: 6,
    },
  }
}

function buildDraftSettings(
  sport: FootballRedraftSport,
  draftType: RedraftDraftType,
  rosterTemplate: RedraftRosterTemplate,
): RedraftDraftSettings {
  const engineDraftType = getRedraftEngineDraftType(draftType)
  const pickOrderRules = pickOrderForDraftType(draftType)
  return {
    draftType: engineDraftType,
    requestedDraftType: draftType,
    rounds: rosterTemplate.draftableRosterSlots,
    fallbackRounds: sport === 'NCAAF' ? 20 : 15,
    timerSeconds: 90,
    slowTimerSeconds: 28_800,
    pickOrderRules,
    snakeOrLinear: pickOrderRules,
    thirdRoundReversal: false,
    autopickBehavior: 'queue-first',
    autopickBehaviorAlias: 'queue_first',
    queueSizeLimit: sport === 'NCAAF' ? 70 : 50,
    preDraftRankingSource: sport === 'NCAAF' ? 'adp_projection_rank_fallback' : 'adp',
    rosterFillOrder: sport === 'NCAAF' ? 'position_scarcity' : 'starter_first',
    positionFilterBehavior: 'by_eligibility',
    auctionBudgetPerTeam: engineDraftType === 'auction' ? 200 : null,
  }
}

function buildPlayerPoolRules(
  sport: FootballRedraftSport,
  rosterTemplate: RedraftRosterTemplate,
): Record<string, unknown> {
  const positions = rosterTemplate.draftablePlayerPositions
  if (sport === 'NCAAF') {
    return {
      sport: 'NCAAF',
      poolKey: 'ncaaf_active_college_fantasy_players',
      source: 'sports_player',
      includeActiveOnly: true,
      includeCollegePlayers: true,
      includeNflPlayers: false,
      collegeOnly: true,
      rookieOnly: false,
      excludeRookieOnlyPool: true,
      positions,
      positionAliases: { DEF: ['DST'] },
      rankingSource: 'adp_projection_rank_fallback',
    }
  }
  return {
    sport: 'NFL',
    poolKey: 'nfl_active_fantasy_players',
    source: 'sports_player',
    includeActiveOnly: true,
    includeCollegePlayers: false,
    includeNflPlayers: true,
    collegeOnly: false,
    rookieOnly: false,
    excludeRookieOnlyPool: true,
    positions,
    positionAliases: { DST: ['DEF'] },
    rankingSource: 'adp',
  }
}

function buildDisabledSettings(): Record<string, unknown> {
  return {
    taxi: false,
    taxi_slots: 0,
    taxiSlots: 0,
    keepers: false,
    keepers_enabled: false,
    keeper_carryover_enabled: false,
    devy: false,
    devy_enabled: false,
    c2c: false,
    c2c_enabled: false,
    contracts: false,
    contracts_enabled: false,
    salary_cap: false,
    salary_cap_enabled: false,
    rookie_only: false,
    rookie_only_pool: false,
    isDynasty: false,
  }
}

function buildTabsEnabled(): Record<string, true | 'commissioner'> {
  return {
    overview: true,
    teams: true,
    roster: true,
    standings: true,
    matchups: true,
    draft: true,
    mock_draft: true,
    live_draft: true,
    waivers: true,
    settings: 'commissioner',
  }
}

function buildSurfaceRules(
  surface: RedraftDraftSurface,
  draftSettings: RedraftDraftSettings,
): Record<string, unknown> {
  return {
    enabled: true,
    surface,
    draftConfigSource: 'League.settings',
    useResolvedDraftSettings: true,
    sharesResolvedDraftConfig: true,
    draftType: draftSettings.draftType,
    requestedDraftType: draftSettings.requestedDraftType,
    rounds: draftSettings.rounds,
    timerSeconds: draftSettings.timerSeconds,
    queueSizeLimit: draftSettings.queueSizeLimit,
    autopickBehavior: draftSettings.autopickBehavior,
    positionFilterBehavior: draftSettings.positionFilterBehavior,
  }
}

export function getRedraftDefaultContract(input: {
  sport: LeagueSport | string
  draftType?: unknown
  scoringPresetId?: string | null
  teamCount?: number | null
}): RedraftDefaultContract | null {
  const normalizedSport = String(input.sport ?? '').trim().toUpperCase()
  if (!isFootballRedraftDefaultsSport(normalizedSport)) return null

  const sport = normalizedSport
  const requestedDraftType = normalizeRedraftDraftType(input.draftType)
  const rosterTemplate = buildRosterTemplate(sport)
  const draftSettings = buildDraftSettings(sport, requestedDraftType, rosterTemplate)
  const scoringPresetId =
    typeof input.scoringPresetId === 'string' && input.scoringPresetId.trim()
      ? input.scoringPresetId.trim()
      : defaultScoringPresetId(sport)
  const scoringSettings = buildScoringSettings(sport, scoringPresetId)
  const playerPoolRules = buildPlayerPoolRules(sport, rosterTemplate)
  const tabsEnabled = buildTabsEnabled()
  const disabledSettings = buildDisabledSettings()

  return {
    sport,
    league_type: 'redraft',
    leagueType: 'redraft',
    draft_type: draftSettings.draftType,
    requested_draft_type: requestedDraftType,
    teams: asPositiveInt(input.teamCount, 12),
    rounds: draftSettings.rounds,
    timer_seconds: draftSettings.timerSeconds,
    scoring_preset_id: scoringPresetId,
    scoringPresetAliases: scoringAliasesForPreset(sport, scoringPresetId),
    roster_mode: 'redraft',
    rosterTemplate,
    scoringSettings,
    draftSettings,
    playerPoolRules,
    tabsEnabled,
    mockDraftRules: buildSurfaceRules('mock', draftSettings),
    liveDraftRules: buildSurfaceRules('live', draftSettings),
    disabledSettings,
  }
}

export function getRedraftDraftSettingsForSurface(
  contract: RedraftDefaultContract,
  surface: RedraftDraftSurface,
): RedraftDraftSettings {
  const surfaceRules = surface === 'mock' ? contract.mockDraftRules : contract.liveDraftRules
  return {
    ...contract.draftSettings,
    draftType: surfaceRules.draftType as EngineDraftType,
    requestedDraftType: surfaceRules.requestedDraftType as RedraftDraftType,
  }
}

export function buildRedraftSettingsSnapshot(input: {
  sport: LeagueSport | string
  draftType?: unknown
  scoringPresetId?: string | null
  teamCount?: number | null
}): Record<string, unknown> | null {
  const contract = getRedraftDefaultContract(input)
  if (!contract) return null

  const { draftSettings, rosterTemplate } = contract
  return {
    redraftDefaultsVersion: 1,
    sport: contract.sport,
    sport_type: contract.sport,
    leagueType: 'redraft',
    league_type: 'redraft',
    roster_mode: 'redraft',
    teams: contract.teams,
    default_team_count: contract.teams,
    scoring_preset_id: contract.scoring_preset_id,
    scoringPreset: contract.scoring_preset_id,
    scoringPresetAliases: contract.scoringPresetAliases,
    scoring_mode: 'points',
    scoring_format: contract.scoringSettings.scoringFormat,
    scoring_template_id: contract.scoringSettings.scoringTemplateId,
    draft_type: draftSettings.draftType,
    requested_draft_type: draftSettings.requestedDraftType,
    draft_rounds: draftSettings.rounds,
    draft_timer_seconds: draftSettings.timerSeconds,
    draft_slow_timer_seconds: draftSettings.slowTimerSeconds,
    draft_pick_order_rules: draftSettings.pickOrderRules,
    draft_snake_or_linear: draftSettings.snakeOrLinear,
    draft_third_round_reversal: draftSettings.thirdRoundReversal,
    draft_autopick_behavior: draftSettings.autopickBehavior,
    draft_autopick_behavior_alias: draftSettings.autopickBehaviorAlias,
    draft_queue_size_limit: draftSettings.queueSizeLimit,
    queue_size_limit: draftSettings.queueSizeLimit,
    draft_pre_draft_ranking_source: draftSettings.preDraftRankingSource,
    draft_roster_fill_order: draftSettings.rosterFillOrder,
    draft_position_filter_behavior: draftSettings.positionFilterBehavior,
    draft_order: draftSettings.pickOrderRules,
    third_round_reversal: false,
    rounds: draftSettings.rounds,
    timer_seconds: draftSettings.timerSeconds,
    roster_size: rosterTemplate.draftableRosterSlots,
    rosterSize: rosterTemplate.draftableRosterSlots,
    starter_slots: rosterTemplate.starterSlots,
    bench_slots: rosterTemplate.benchSlots,
    ir_slots: rosterTemplate.irSlots,
    taxi_slots: 0,
    rosterTemplate,
    rosterSettings: {
      rosterMode: 'redraft',
      starterSlots: rosterTemplate.starterSlots,
      flexDefinitions: rosterTemplate.flexDefinitions,
      benchSlots: rosterTemplate.benchSlots,
      irSlots: rosterTemplate.irSlots,
      taxiSlots: 0,
      rosterSlots: rosterTemplate.rosterSlots,
      rosterSize: rosterTemplate.draftableRosterSlots,
      rosterPositions: rosterTemplate.rosterPositions,
      draftablePlayerPositions: rosterTemplate.draftablePlayerPositions,
    },
    scoringSettings: contract.scoringSettings,
    draftSettings,
    playerPoolRules: contract.playerPoolRules,
    player_pool_rules: contract.playerPoolRules,
    player_pool: contract.playerPoolRules.poolKey,
    tabsEnabled: contract.tabsEnabled,
    tabs_enabled: contract.tabsEnabled,
    mockDraftRules: contract.mockDraftRules,
    mock_draft_rules: contract.mockDraftRules,
    liveDraftRules: contract.liveDraftRules,
    live_draft_rules: contract.liveDraftRules,
    ...contract.disabledSettings,
    devyConfig: { enabled: false },
    c2cConfig: { enabled: false },
    keeperSettings: { enabled: false },
    salaryCapSettings: { enabled: false },
    contractSettings: { enabled: false },
  }
}

export function normalizeRedraftSettingsSnapshot(input: {
  sport: LeagueSport | string
  draftType?: unknown
  scoringPresetId?: string | null
  teamCount?: number | null
  settings?: Record<string, unknown> | null
}): Record<string, unknown> {
  const incoming = input.settings ?? {}
  const requestedDraftType = normalizeRedraftDraftType(
    input.draftType ?? incoming.requested_draft_type ?? incoming.draft_type,
  )
  const scoringPresetId =
    typeof incoming.scoring_preset_id === 'string'
      ? incoming.scoring_preset_id
      : typeof incoming.scoringPreset === 'string'
        ? incoming.scoringPreset
        : input.scoringPresetId
  const teamCount =
    typeof incoming.default_team_count === 'number'
      ? incoming.default_team_count
      : typeof incoming.teams === 'number'
        ? incoming.teams
        : input.teamCount
  const defaults =
    buildRedraftSettingsSnapshot({
      sport: input.sport,
      draftType: requestedDraftType,
      scoringPresetId,
      teamCount,
    }) ?? {}
  const resolvedScoringPresetId =
    typeof scoringPresetId === 'string' && scoringPresetId.trim()
      ? scoringPresetId.trim()
      : String(defaults.scoring_preset_id ?? '')

  const merged: Record<string, unknown> = {
    ...defaults,
    ...incoming,
  }
  const draftSettings = isRecord(incoming.draftSettings) ? incoming.draftSettings : {}
  const defaultDraftSettings = (defaults.draftSettings as RedraftDraftSettings | undefined) ?? null
  const defaultRounds = defaultDraftSettings?.rounds ?? asPositiveInt(defaults.draft_rounds, 15)
  const defaultTimer = defaultDraftSettings?.timerSeconds ?? 90
  const defaultSlowTimer = defaultDraftSettings?.slowTimerSeconds ?? 28_800
  const rounds = asPositiveInt(merged.draft_rounds ?? draftSettings.rounds, defaultRounds)
  const timerSeconds = asPositiveInt(merged.draft_timer_seconds ?? draftSettings.timerSeconds, defaultTimer)
  const queueSizeLimit = asPositiveInt(
    merged.draft_queue_size_limit ?? draftSettings.queueSizeLimit,
    defaultDraftSettings?.queueSizeLimit ?? 50,
  )
  const engineDraftType = getRedraftEngineDraftType(requestedDraftType)
  const pickOrderRules = pickOrderForDraftType(requestedDraftType)

  merged.draft_type = engineDraftType
  merged.requested_draft_type = requestedDraftType
  merged.draft_rounds = rounds
  merged.rounds = rounds
  merged.draft_timer_seconds = timerSeconds
  merged.timer_seconds = timerSeconds
  merged.draft_slow_timer_seconds = asPositiveInt(
    merged.draft_slow_timer_seconds ?? draftSettings.slowTimerSeconds,
    defaultSlowTimer,
  )
  merged.draft_pick_order_rules = pickOrderRules
  merged.draft_snake_or_linear = pickOrderRules
  merged.draft_third_round_reversal = false
  merged.third_round_reversal = false
  merged.draft_queue_size_limit = queueSizeLimit
  merged.queue_size_limit = queueSizeLimit
  merged.draft_autopick_behavior =
    typeof merged.draft_autopick_behavior === 'string' && merged.draft_autopick_behavior.trim()
      ? merged.draft_autopick_behavior
      : defaultDraftSettings?.autopickBehavior ?? 'queue-first'
  merged.draft_pre_draft_ranking_source =
    typeof merged.draft_pre_draft_ranking_source === 'string' && merged.draft_pre_draft_ranking_source.trim()
      ? merged.draft_pre_draft_ranking_source
      : defaultDraftSettings?.preDraftRankingSource ?? 'adp'
  merged.draft_roster_fill_order =
    typeof merged.draft_roster_fill_order === 'string' && merged.draft_roster_fill_order.trim()
      ? merged.draft_roster_fill_order
      : defaultDraftSettings?.rosterFillOrder ?? 'starter_first'
  merged.draft_position_filter_behavior =
    typeof merged.draft_position_filter_behavior === 'string' && merged.draft_position_filter_behavior.trim()
      ? merged.draft_position_filter_behavior
      : defaultDraftSettings?.positionFilterBehavior ?? 'by_eligibility'
  merged.scoring_preset_id = resolvedScoringPresetId
  merged.scoringPreset = resolvedScoringPresetId
  merged.scoring_template_id = defaults.scoring_template_id
  merged.scoring_format = defaults.scoring_format
  merged.scoring_mode = 'points'

  const defaultRosterTemplate = defaults.rosterTemplate as RedraftRosterTemplate | undefined
  merged.roster_mode = 'redraft'
  merged.league_type = 'redraft'
  merged.leagueType = 'redraft'
  merged.starter_slots = defaultRosterTemplate?.starterSlots ?? merged.starter_slots
  merged.bench_slots = defaultRosterTemplate?.benchSlots ?? merged.bench_slots
  merged.ir_slots = defaultRosterTemplate?.irSlots ?? merged.ir_slots
  merged.taxi_slots = 0
  merged.taxiSlots = 0
  merged.taxi = false
  merged.keepers = false
  merged.keepers_enabled = false
  merged.keeper_carryover_enabled = false
  merged.devy = false
  merged.devy_enabled = false
  merged.c2c = false
  merged.c2c_enabled = false
  merged.contracts = false
  merged.contracts_enabled = false
  merged.salary_cap = false
  merged.salary_cap_enabled = false
  merged.rookie_only = false
  merged.rookie_only_pool = false
  merged.isDynasty = false

  merged.draftSettings = {
    ...(defaultDraftSettings ?? {}),
    ...draftSettings,
    draftType: engineDraftType,
    requestedDraftType,
    rounds,
    timerSeconds,
    slowTimerSeconds: merged.draft_slow_timer_seconds,
    pickOrderRules,
    snakeOrLinear: pickOrderRules,
    thirdRoundReversal: false,
    queueSizeLimit,
    autopickBehavior: merged.draft_autopick_behavior,
    preDraftRankingSource: merged.draft_pre_draft_ranking_source,
    rosterFillOrder: merged.draft_roster_fill_order,
    positionFilterBehavior: merged.draft_position_filter_behavior,
    auctionBudgetPerTeam: engineDraftType === 'auction' ? 200 : null,
  }
  merged.scoringSettings = {
    ...((defaults.scoringSettings as Record<string, unknown> | undefined) ?? {}),
    ...(isRecord(incoming.scoringSettings) ? incoming.scoringSettings : {}),
    preset: resolvedScoringPresetId,
    scoringPresetId: resolvedScoringPresetId,
    scoringTemplateId: defaults.scoring_template_id,
    scoringMode: 'points',
  }
  merged.rosterTemplate = defaultRosterTemplate
  merged.rosterSettings = defaults.rosterSettings
  merged.playerPoolRules = {
    ...(defaults.playerPoolRules as Record<string, unknown> | undefined),
    ...(isRecord(incoming.playerPoolRules) ? incoming.playerPoolRules : {}),
    sport: defaults.sport,
    includeNflPlayers: defaults.sport === 'NFL',
    includeCollegePlayers: defaults.sport === 'NCAAF',
    collegeOnly: defaults.sport === 'NCAAF',
    rookieOnly: false,
    excludeRookieOnlyPool: true,
    positions: unique(
      ((defaultRosterTemplate?.draftablePlayerPositions ?? []) as string[]).map((position) => String(position)),
    ),
  }
  merged.player_pool_rules = merged.playerPoolRules
  merged.devyConfig = { ...(isRecord(incoming.devyConfig) ? incoming.devyConfig : {}), enabled: false }
  merged.c2cConfig = { ...(isRecord(incoming.c2cConfig) ? incoming.c2cConfig : {}), enabled: false }
  merged.keeperSettings = { ...(isRecord(incoming.keeperSettings) ? incoming.keeperSettings : {}), enabled: false }
  merged.salaryCapSettings = { ...(isRecord(incoming.salaryCapSettings) ? incoming.salaryCapSettings : {}), enabled: false }
  merged.contractSettings = { ...(isRecord(incoming.contractSettings) ? incoming.contractSettings : {}), enabled: false }
  merged.tabsEnabled = defaults.tabsEnabled
  merged.tabs_enabled = defaults.tabs_enabled
  merged.mockDraftRules = buildSurfaceRules('mock', merged.draftSettings as RedraftDraftSettings)
  merged.mock_draft_rules = merged.mockDraftRules
  merged.liveDraftRules = buildSurfaceRules('live', merged.draftSettings as RedraftDraftSettings)
  merged.live_draft_rules = merged.liveDraftRules

  return merged
}
