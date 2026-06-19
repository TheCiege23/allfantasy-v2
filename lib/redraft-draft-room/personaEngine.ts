import {
  NPC_DRAFT_PERSONALITIES,
  type NpcDraftPersonalityId,
  isNpcDraftPersonalityId,
} from '@/lib/live-draft-engine/npcDraftPersonalityTypes'

export const REDRAFT_DRAFT_PERSONA_IDS = NPC_DRAFT_PERSONALITIES
export type RedraftDraftPersonaId = NpcDraftPersonalityId

export type RedraftPersonaPlayer = {
  playerId: string
  name: string
  position: string
  team?: string | null
  sport?: string | null
  adp?: number | null
  projectedFantasyPoints?: number | null
  ceilingProjection?: number | null
  floorProjection?: number | null
  projectionConfidence?: number | null
  byeWeek?: number | null
  injuryStatus?: string | null
  isRookie?: boolean
  age?: number | null
  eligible?: boolean | null
}

export type RedraftPersonaPickInput = {
  personaId: RedraftDraftPersonaId | string | null | undefined
  availablePlayers: RedraftPersonaPlayer[]
  draftedPlayerIds?: Iterable<string | null | undefined>
  draftedPlayerNames?: Iterable<string | null | undefined>
  rosterCounts?: Record<string, number>
  rosteredTeams?: Iterable<string | null | undefined>
  queuePlayerIds?: Iterable<string | null | undefined>
  leagueSport: 'NFL' | 'NCAAF' | string
  round: number
  overallPick: number
  isSuperflex?: boolean
  isTePremium?: boolean
  favoriteTeamAbbr?: string | null
}

export type RedraftPersonaRankedPlayer = {
  player: RedraftPersonaPlayer
  score: number
  reasons: string[]
}

export type RedraftPersonaPickResult = {
  personaId: RedraftDraftPersonaId
  selected: RedraftPersonaRankedPlayer | null
  ranked: RedraftPersonaRankedPlayer[]
  excluded: Array<{ playerId: string; reason: 'drafted' | 'wrong_sport' | 'ineligible' }>
}

function hashString(value: string): number {
  let hash = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function assignDeterministicRedraftPersona(seed: string | number): RedraftDraftPersonaId {
  const index = hashString(String(seed)) % REDRAFT_DRAFT_PERSONA_IDS.length
  return REDRAFT_DRAFT_PERSONA_IDS[index]!
}

function normalizeName(value: string | null | undefined): string {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
}

function normalizeTeam(value: string | null | undefined): string {
  return String(value ?? '').trim().toUpperCase()
}

function normalizePosition(value: string | null | undefined): string {
  const raw = String(value ?? '').trim().toUpperCase()
  if (raw === 'D/ST' || raw === 'DST') return 'DEF'
  if (raw.includes('QB')) return 'QB'
  if (raw.includes('RB')) return 'RB'
  if (raw.includes('WR')) return 'WR'
  if (raw.includes('TE')) return 'TE'
  if (raw === 'K') return 'K'
  if (raw === 'DEF') return 'DEF'
  if (['DE', 'DT', 'DL'].includes(raw)) return 'DL'
  if (raw === 'LB') return 'LB'
  if (['CB', 'S', 'SS', 'FS', 'DB'].includes(raw)) return 'DB'
  return raw || 'FLEX'
}

function injuryRisk(status: string | null | undefined): number {
  const value = String(status ?? '').trim().toLowerCase()
  if (!value) return 0
  if (value.includes('out') || value.includes('ir') || value.includes('suspend') || value.includes('pup')) return 90
  if (value.includes('doubt')) return 70
  if (value.includes('question') || value === 'q') return 35
  if (value.includes('prob')) return 10
  return 20
}

function needScore(pos: string, counts: Record<string, number>): number {
  const targets: Record<string, number> = { QB: 1, RB: 2, WR: 2, TE: 1, K: 1, DEF: 1, DL: 1, LB: 1, DB: 1 }
  const count = counts[pos] ?? 0
  const target = targets[pos] ?? 0
  if (count < target) return 42 + (target - count) * 18
  if ((pos === 'RB' || pos === 'WR') && count < 5) return 18
  if (pos === 'QB' && count < 2) return 12
  if (pos === 'TE' && count < 2) return 10
  return 4
}

function baseScore(player: RedraftPersonaPlayer, overallPick: number): { score: number; reasons: string[] } {
  const reasons: string[] = []
  const projection = Number(player.projectedFantasyPoints ?? 0)
  const confidence = Number(player.projectionConfidence ?? 0)
  const adp = Number(player.adp ?? 0)
  let score = 0
  if (projection > 0) {
    score += projection * 7
    reasons.push(`projection ${projection.toFixed(1)}`)
    if (confidence > 0) score += Math.min(18, confidence / 6)
  }
  if (adp > 0) {
    const value = Math.max(-25, Math.min(45, (overallPick - adp) * 1.15))
    score += Math.max(8, 190 - adp) * 0.45 + value
    reasons.push(value >= 0 ? 'ADP value' : 'ADP reach')
  } else {
    score += 32
    reasons.push('ADP fallback')
  }
  return { score, reasons }
}

function personaAdjustment(input: {
  personaId: RedraftDraftPersonaId
  player: RedraftPersonaPlayer
  pos: string
  round: number
  overallPick: number
  rosterCounts: Record<string, number>
  rosteredTeams: Set<string>
  queue: Set<string>
  isSuperflex: boolean
  isTePremium: boolean
  favoriteTeamAbbr: string | null
}): { adjustment: number; reasons: string[] } {
  const { personaId, player, pos, round, rosterCounts, rosteredTeams, isSuperflex, isTePremium } = input
  const reasons: string[] = []
  let adjustment = 0
  const risk = injuryRisk(player.injuryStatus)
  const team = normalizeTeam(player.team)
  const adp = Number(player.adp ?? 0)
  const adpEdge = adp > 0 ? input.overallPick - adp : 0

  switch (personaId) {
    case 'NEED_BASED':
      adjustment += needScore(pos, rosterCounts) * 1.1
      reasons.push('need fit')
      break
    case 'BEST_PLAYER_AVAILABLE':
      adjustment += Math.max(0, 120 - (adp || 120)) * 0.55
      reasons.push('BPA lean')
      break
    case 'ADP_VALUE_HUNTER':
      adjustment += Math.max(0, adpEdge) * 1.6
      reasons.push('ADP discount')
      break
    case 'UPSIDE_SWINGER':
      adjustment += Number(player.ceilingProjection ?? 0) * 2.4
      if (player.isRookie || (player.age != null && player.age <= 24)) adjustment += 20
      adjustment -= risk * 0.25
      reasons.push('upside')
      break
    case 'FLOOR_SAFE':
      adjustment += Number(player.floorProjection ?? 0) * 2.2
      adjustment -= risk * 1.4
      reasons.push('floor and health')
      break
    case 'ZERO_RB':
      if (pos === 'RB' && round <= 5) adjustment -= 70
      if (pos === 'WR' && round <= 5) adjustment += 38
      if (pos === 'RB' && round >= 6) adjustment += 32
      reasons.push('zero RB build')
      break
    case 'HERO_RB':
      if (pos === 'RB' && (rosterCounts.RB ?? 0) < 1 && round <= 3) adjustment += 78
      if (pos === 'RB' && (rosterCounts.RB ?? 0) >= 1 && round <= 5) adjustment -= 18
      reasons.push('anchor RB')
      break
    case 'RB_HEAVY':
      if (pos === 'RB') adjustment += 44
      reasons.push('RB lean')
      break
    case 'WR_HEAVY':
      if (pos === 'WR') adjustment += 44
      reasons.push('WR lean')
      break
    case 'ELITE_QB':
      if (pos === 'QB' && (isSuperflex || round <= 5)) adjustment += 64
      reasons.push('elite QB priority')
      break
    case 'LATE_QB':
      if (pos === 'QB' && !isSuperflex && round <= 8) adjustment -= 80
      if (pos === 'QB' && round >= 9) adjustment += 28
      reasons.push('late QB build')
      break
    case 'EARLY_TE':
      if (pos === 'TE' && (isTePremium || round <= 7)) adjustment += 54
      reasons.push('TE leverage')
      break
    case 'YOUTH_DYNASTY_UPSIDE':
      if (player.isRookie || (player.age != null && player.age <= 24)) adjustment += 38
      if (player.age != null && player.age >= 30) adjustment -= 22
      reasons.push('youth upside')
      break
    case 'WIN_NOW_VETERAN':
      if (player.age != null && player.age >= 27) adjustment += 28
      if (player.isRookie) adjustment -= 18
      reasons.push('veteran floor')
      break
    case 'STACK_TEAM_CORRELATION':
      if (team && rosteredTeams.has(team)) adjustment += 52
      reasons.push('stack correlation')
      break
    case 'BYE_WEEK_DIVERSIFIER':
      if (player.byeWeek != null && player.byeWeek > 0) adjustment += 6
      reasons.push('bye aware')
      break
    case 'INJURY_AVOIDANT':
      adjustment -= risk * 1.6
      reasons.push('injury avoidance')
      break
    case 'CONTRARIAN_CHAOS':
      adjustment += Math.abs(adpEdge) * 0.9 + ((hashString(player.playerId) % 25) - 6)
      reasons.push('contrarian')
      break
    case 'HOMER_TEAM_FAVORITE':
      if (team && input.favoriteTeamAbbr && team === input.favoriteTeamAbbr) adjustment += 68
      reasons.push('favorite team')
      break
    case 'IDP_SPECIALIST':
      if (pos === 'DL' || pos === 'LB' || pos === 'DB') adjustment += 58
      reasons.push('IDP specialist')
      break
    default:
      adjustment += 0
      break
  }

  return { adjustment, reasons }
}

export function rankRedraftPersonaPicks(input: RedraftPersonaPickInput): RedraftPersonaPickResult {
  const personaId = isNpcDraftPersonalityId(input.personaId) ? input.personaId : assignDeterministicRedraftPersona(input.personaId ?? 'redraft')
  const draftedIds = new Set(Array.from(input.draftedPlayerIds ?? []).filter(Boolean).map(String))
  const draftedNames = new Set(Array.from(input.draftedPlayerNames ?? []).filter(Boolean).map((name) => normalizeName(String(name))))
  const rosterCounts = input.rosterCounts ?? {}
  const rosteredTeams = new Set(Array.from(input.rosteredTeams ?? []).map((team) => normalizeTeam(team)).filter(Boolean))
  const queue = new Set(Array.from(input.queuePlayerIds ?? []).filter(Boolean).map(String))
  const sport = String(input.leagueSport ?? '').toUpperCase()
  const excluded: RedraftPersonaPickResult['excluded'] = []

  const ranked = input.availablePlayers.flatMap((player): RedraftPersonaRankedPlayer[] => {
    if (draftedIds.has(player.playerId) || draftedNames.has(normalizeName(player.name))) {
      excluded.push({ playerId: player.playerId, reason: 'drafted' })
      return []
    }
    if (player.eligible === false) {
      excluded.push({ playerId: player.playerId, reason: 'ineligible' })
      return []
    }
    if (player.sport && sport && String(player.sport).toUpperCase() !== sport) {
      excluded.push({ playerId: player.playerId, reason: 'wrong_sport' })
      return []
    }
    const pos = normalizePosition(player.position)
    const base = baseScore(player, input.overallPick)
    const need = needScore(pos, rosterCounts)
    const persona = personaAdjustment({
      personaId,
      player,
      pos,
      round: Math.max(1, input.round),
      overallPick: Math.max(1, input.overallPick),
      rosterCounts,
      rosteredTeams,
      queue,
      isSuperflex: Boolean(input.isSuperflex),
      isTePremium: Boolean(input.isTePremium),
      favoriteTeamAbbr: normalizeTeam(input.favoriteTeamAbbr) || null,
    })
    const queueBoost = queue.has(player.playerId) ? 100 : 0
    const score = base.score + need + persona.adjustment + queueBoost - injuryRisk(player.injuryStatus) * 0.4
    return [{
      player,
      score,
      reasons: [...base.reasons, need > 20 ? 'roster need' : 'depth', ...persona.reasons, queueBoost ? 'queue priority' : ''].filter(Boolean),
    }]
  })

  ranked.sort((a, b) => b.score - a.score || normalizeName(a.player.name).localeCompare(normalizeName(b.player.name)))
  return { personaId, selected: ranked[0] ?? null, ranked, excluded }
}
