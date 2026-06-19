import type { RedraftDraftRoomModeContract } from './draftRoomModeContract'
import type { RedraftWarRoomPlayer, RedraftWarRoomSuggestionOutput } from './warRoomSuggestions'

export type ChimmyDraftPlayerContext = {
  playerId?: string | null
  name: string
  position: string
  team?: string | null
  adp?: number | null
  byeWeek?: number | null
  injuryStatus?: string | null
  weeklyProjection?: number | null
  restOfSeasonProjection?: number | null
  projectionConfidence?: number | null
}

export type GroundedChimmyDraftContextInput = {
  leagueId: string
  leagueName?: string | null
  sport: string
  scoringPreset?: string | null
  modeContract: RedraftDraftRoomModeContract
  currentPick?: { round: number; pick: number; overall?: number | null; rosterName?: string | null } | null
  rosterSlots?: string[]
  availablePlayers: RedraftWarRoomPlayer[]
  draftedPlayers?: Array<{ playerId?: string | null; name: string; position: string; team?: string | null }>
  queue?: ChimmyDraftPlayerContext[]
  warRoom?: RedraftWarRoomSuggestionOutput | null
  dataUpdatedAt?: string | null
}

export type GroundedChimmyDraftContext = {
  scope: 'redraft_draft_room'
  league: { leagueId: string; leagueName?: string | null; sport: string; scoringPreset?: string | null }
  mode: Pick<RedraftDraftRoomModeContract, 'mode' | 'engineCore' | 'safeState' | 'reasonCodes'>
  currentPick: GroundedChimmyDraftContextInput['currentPick']
  rosterSlots: string[]
  availablePlayers: ChimmyDraftPlayerContext[]
  draftedPlayers: ChimmyDraftPlayerContext[]
  queue: ChimmyDraftPlayerContext[]
  warRoom: {
    bestPick: ChimmyDraftPlayerContext | null
    alternatives: ChimmyDraftPlayerContext[]
    warnings: string[]
    evidence: string[]
  } | null
  dataQuality: {
    labels: string[]
    updatedAt: string | null
  }
  prompt: string
}

const RAW_PROVIDER_KEYS = [
  'raw',
  'payload',
  'providerPayload',
  'rollingInsightsPayload',
  'rolling_insights_payload',
  'riRaw',
  'sourcePayload',
]

function sanitizePlayer(player: Partial<RedraftWarRoomPlayer> & { name?: string }): ChimmyDraftPlayerContext {
  return {
    playerId: player.playerId ?? null,
    name: String(player.name ?? '').trim(),
    position: String(player.position ?? '').trim(),
    team: player.team ?? null,
    adp: player.adp ?? null,
    byeWeek: player.byeWeek ?? null,
    injuryStatus: player.injuryStatus ?? null,
    weeklyProjection: player.projectedFantasyPoints ?? null,
    restOfSeasonProjection: player.restOfSeasonProjection ?? null,
    projectionConfidence: player.projectionConfidence ?? null,
  }
}

function normalizeName(value: string | null | undefined): string {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
}

export function containsRawProviderPayload(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false
  if (Array.isArray(value)) return value.some((entry) => containsRawProviderPayload(entry))
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (RAW_PROVIDER_KEYS.includes(key)) return true
    if (containsRawProviderPayload(nested)) return true
  }
  return false
}

export function buildGroundedChimmyDraftContext(input: GroundedChimmyDraftContextInput): GroundedChimmyDraftContext {
  const draftedNames = new Set((input.draftedPlayers ?? []).map((player) => normalizeName(player.name)))
  const draftedIds = new Set((input.draftedPlayers ?? []).map((player) => player.playerId).filter(Boolean).map(String))
  const availablePlayers = input.availablePlayers
    .filter((player) => !draftedNames.has(normalizeName(player.name)) && (!player.playerId || !draftedIds.has(player.playerId)))
    .slice(0, 24)
    .map(sanitizePlayer)

  const draftedPlayers = (input.draftedPlayers ?? []).slice(-24).map((player) => sanitizePlayer({
    playerId: player.playerId ?? null,
    name: player.name,
    position: player.position,
    team: player.team ?? null,
  }))
  const queue = (input.queue ?? []).slice(0, 12).map((player) => sanitizePlayer(player))
  const labels = new Set<string>()

  if (availablePlayers.some((player) => player.weeklyProjection == null)) labels.add('weekly projection fallback')
  if (availablePlayers.some((player) => player.restOfSeasonProjection == null)) labels.add('ROS projection fallback')
  if (availablePlayers.some((player) => player.projectionConfidence == null)) labels.add('projection confidence missing')
  for (const label of input.warRoom?.missingDataLabels ?? []) labels.add(label)

  const warRoom = input.warRoom
    ? {
        bestPick: input.warRoom.bestPick ? sanitizePlayer(input.warRoom.bestPick) : null,
        alternatives: input.warRoom.alternatives.slice(0, 5).map(sanitizePlayer),
        warnings: input.warRoom.warnings,
        evidence: input.warRoom.evidence,
      }
    : null

  const current = input.currentPick
    ? `Round ${input.currentPick.round}, Pick ${input.currentPick.pick}${input.currentPick.rosterName ? ` for ${input.currentPick.rosterName}` : ''}.`
    : 'No active pick.'
  const topAvailable = availablePlayers.slice(0, 5).map((player) => `${player.name} ${player.position}`).join(', ') || 'none'
  const bestPick = warRoom?.bestPick ? `${warRoom.bestPick.name} ${warRoom.bestPick.position}` : 'none'
  const prompt = [
    `Use grounded redraft draft-room context only for ${input.leagueName ?? 'this league'}.`,
    `Sport: ${input.sport}. Mode: ${input.modeContract.mode}/${input.modeContract.engineCore}. State: ${input.modeContract.safeState}.`,
    current,
    `Top available: ${topAvailable}.`,
    `War Room best pick: ${bestPick}.`,
    labels.size ? `Data quality labels: ${[...labels].join(', ')}.` : 'Data quality labels: none.',
    'Do not reference players outside available, drafted, queue, or War Room context.',
  ].join(' ')

  return {
    scope: 'redraft_draft_room',
    league: {
      leagueId: input.leagueId,
      leagueName: input.leagueName ?? null,
      sport: input.sport,
      scoringPreset: input.scoringPreset ?? null,
    },
    mode: {
      mode: input.modeContract.mode,
      engineCore: input.modeContract.engineCore,
      safeState: input.modeContract.safeState,
      reasonCodes: input.modeContract.reasonCodes,
    },
    currentPick: input.currentPick ?? null,
    rosterSlots: input.rosterSlots ?? [],
    availablePlayers,
    draftedPlayers,
    queue,
    warRoom,
    dataQuality: {
      labels: [...labels],
      updatedAt: input.dataUpdatedAt ?? null,
    },
    prompt,
  }
}
