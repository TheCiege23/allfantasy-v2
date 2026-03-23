import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { handleInvalidationTrigger } from '@/lib/trade-engine/caching'
import { isRosterChopped } from '@/lib/guillotine/guillotineGuard'
import { getSpecialtySpecByVariant } from '@/lib/specialty-league/registry'
import { recordTrendSignalsAndUpdate } from '@/lib/player-trend'
import { resolveSportForTrend } from '@/lib/player-trend/SportTrendContextResolver'
import { prisma } from '@/lib/prisma'
import { getFormatTypeForVariant } from '@/lib/sport-defaults/LeagueVariantRegistry'
import { getRosterTemplateForLeague } from '@/lib/multi-sport/MultiSportRosterService'
import { validateRosterSectionsAgainstTemplate } from '@/lib/roster/LineupTemplateValidation'
import { validateAiActionExecution } from '@/lib/ai/action-validation'

// Guillotine: chopped (eliminated) rosters cannot change lineup/roster.
// Salary cap: when persisting roster changes for a salary_cap league, call
// SalaryCapTradeValidator.validateTradeCap for trades and enforce cap legality
// (getOrCreateLedger / checkCapLegality) before saving adds/drops.
type RosterSectionKey = 'starters' | 'bench' | 'ir' | 'taxi' | 'devy'

function toPlayerId(raw: unknown): string | null {
  if (typeof raw === 'string') return raw.trim() || null
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>
    const id = obj.id ?? obj.player_id
    if (typeof id === 'string' && id.trim()) return id.trim()
  }
  return null
}

function normalizeLineupSection(section: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(section)) return []
  const out: Array<Record<string, unknown>> = []
  const seen = new Set<string>()
  for (const item of section) {
    const id = toPlayerId(item)
    if (!id || seen.has(id)) continue
    seen.add(id)
    const obj = item && typeof item === 'object' ? (item as Record<string, unknown>) : {}
    out.push({
      id,
      name: String(obj.name ?? obj.full_name ?? id),
      team: String(obj.team ?? obj.team_abbreviation ?? '—'),
      position: String(obj.position ?? 'UTIL').toUpperCase(),
      opponent: String(obj.opponent ?? '—'),
      gameTime: String(obj.gameTime ?? obj.game_time ?? '—'),
      projection: Number(obj.projection ?? 0) || 0,
      actual: obj.actual == null ? null : Number(obj.actual),
      status: String(obj.status ?? obj.injury_status ?? 'healthy').toLowerCase(),
    })
  }
  return out
}

function buildPersistedRosterData(
  rosterState: unknown,
  existingPlayerData: unknown
): Record<string, unknown> {
  const base =
    existingPlayerData && typeof existingPlayerData === 'object' && !Array.isArray(existingPlayerData)
      ? (existingPlayerData as Record<string, unknown>)
      : {}
  const rawObj =
    rosterState && typeof rosterState === 'object' && !Array.isArray(rosterState)
      ? (rosterState as Record<string, unknown>)
      : {}

  const lineupSections: Record<RosterSectionKey, Array<Record<string, unknown>>> = {
    starters: normalizeLineupSection(rawObj.starters),
    bench: normalizeLineupSection(rawObj.bench),
    ir: normalizeLineupSection(rawObj.ir),
    taxi: normalizeLineupSection(rawObj.taxi),
    devy: normalizeLineupSection(rawObj.devy),
  }
  const allIds = [
    ...lineupSections.starters.map((p) => String(p.id)),
    ...lineupSections.bench.map((p) => String(p.id)),
    ...lineupSections.ir.map((p) => String(p.id)),
    ...lineupSections.taxi.map((p) => String(p.id)),
    ...lineupSections.devy.map((p) => String(p.id)),
  ]
  const players = [...new Set(allIds)]

  return {
    ...base,
    players,
    starters: lineupSections.starters.map((p) => p.id),
    reserve: lineupSections.ir.map((p) => p.id),
    taxi: lineupSections.taxi.map((p) => p.id),
    devy: lineupSections.devy.map((p) => p.id),
    lineup_sections: lineupSections,
    lineup_updated_at: new Date().toISOString(),
  }
}

function extractStarterIds(body: unknown, playerData: unknown): string[] {
  const bodyObj = body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
  const pdObj =
    playerData && typeof playerData === 'object' && !Array.isArray(playerData)
      ? (playerData as Record<string, unknown>)
      : {}
  const lineupSections =
    pdObj.lineup_sections && typeof pdObj.lineup_sections === 'object'
      ? (pdObj.lineup_sections as Record<string, unknown>)
      : {}

  const startersRaw =
    (Array.isArray(bodyObj.starters) ? bodyObj.starters : null) ??
    (Array.isArray(bodyObj.lineup) ? bodyObj.lineup : null) ??
    (Array.isArray(bodyObj.startingPlayerIds) ? bodyObj.startingPlayerIds : null) ??
    (Array.isArray((bodyObj.roster as Record<string, unknown> | null | undefined)?.starters)
      ? (bodyObj.roster as Record<string, unknown>).starters
      : null) ??
    (Array.isArray(pdObj.starters) ? pdObj.starters : null) ??
    (Array.isArray(lineupSections.starters) ? lineupSections.starters : null)

  if (!Array.isArray(startersRaw)) return []
  return [...new Set(startersRaw.map((v) => toPlayerId(v)).filter(Boolean) as string[])]
}

export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id
  const body = await req.json().catch(() => ({}))
  const leagueId = typeof body?.leagueId === 'string' ? body.leagueId : null
  const rosterIdInput = typeof body?.rosterId === 'string' ? body.rosterId : null
  const rosterState = body?.roster
  const rosterDataInput =
    body?.rosterData && typeof body.rosterData === 'object' && !Array.isArray(body.rosterData)
      ? (body.rosterData as Record<string, unknown>)
      : null

  if (!leagueId) {
    return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })
  }

  const aiValidation = validateAiActionExecution({
    body,
    action: 'apply_lineup',
    leagueId,
  })
  if (!aiValidation.ok) {
    return NextResponse.json({ error: aiValidation.error }, { status: aiValidation.status })
  }

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { id: true, userId: true, leagueVariant: true, sport: true },
  })
  if (!league) {
    return NextResponse.json({ error: 'League not found' }, { status: 404 })
  }

  const memberRoster = await (prisma as any).roster.findFirst({
    where: { leagueId, platformUserId: userId },
    select: { id: true },
  })
  const canActAsCommissioner = league.userId === userId
  if (!memberRoster && !canActAsCommissioner) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let targetRosterId = rosterIdInput ?? memberRoster?.id ?? null
  if (!targetRosterId && canActAsCommissioner) {
    const firstRoster = await (prisma as any).roster.findFirst({
      where: { leagueId },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    })
    targetRosterId = firstRoster?.id ?? null
  }
  if (!targetRosterId) {
    return NextResponse.json({ error: 'Roster not found' }, { status: 404 })
  }

  const chopped = await isRosterChopped(leagueId, targetRosterId)
  if (chopped) {
    return NextResponse.json(
      { error: 'This team has been eliminated and cannot make roster changes.' },
      { status: 403 }
    )
  }

  const specialtySpec = getSpecialtySpecByVariant(league?.leagueVariant ?? null)
  if (specialtySpec?.rosterGuard) {
    const canAct = await specialtySpec.rosterGuard(leagueId, targetRosterId).catch(() => true)
    if (!canAct) {
      return NextResponse.json(
        { error: 'This roster is not allowed to make lineup or roster changes right now.' },
        { status: 403 }
      )
    }
  }

  const currentRoster = await (prisma as any).roster.findUnique({
    where: { id: targetRosterId },
    select: { id: true, leagueId: true, playerData: true },
  })
  if (!currentRoster || currentRoster.leagueId !== leagueId) {
    return NextResponse.json({ error: 'Roster not found or does not belong to this league.' }, { status: 404 })
  }

  let nextPlayerData = currentRoster.playerData
  if (rosterDataInput) {
    nextPlayerData = {
      ...(currentRoster.playerData && typeof currentRoster.playerData === 'object' && !Array.isArray(currentRoster.playerData)
        ? (currentRoster.playerData as Record<string, unknown>)
        : {}),
      ...rosterDataInput,
      lineup_updated_at: new Date().toISOString(),
    }
  } else if (rosterState && typeof rosterState === 'object') {
    nextPlayerData = buildPersistedRosterData(rosterState, currentRoster.playerData)
  }

  try {
    const formatType = getFormatTypeForVariant(
      String(league.sport ?? 'NFL'),
      (league.leagueVariant as string | null) ?? undefined
    )
    const template = await getRosterTemplateForLeague(
      String(league.sport ?? 'NFL') as any,
      formatType,
      leagueId
    )
    const validationError = validateRosterSectionsAgainstTemplate(nextPlayerData, template)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }
  } catch {
    // Non-fatal: do not block roster save if template lookup fails.
  }

  await (prisma as any).roster.update({
    where: { id: targetRosterId },
    data: { playerData: nextPlayerData as any },
  })

  // Best-effort lineup_start signals for trend engine if starter IDs are provided.
  const starterIds = extractStarterIds(body, nextPlayerData)
  if (starterIds.length > 0) {
    const sport = resolveSportForTrend(league?.sport)
    const players = await prisma.player.findMany({
      where: { id: { in: starterIds }, sport },
      select: { id: true },
    })
    if (players.length > 0) {
      void recordTrendSignalsAndUpdate(
        players.map((p) => ({
          playerId: p.id,
          sport,
          signalType: 'lineup_start',
          leagueId,
          value: 1,
        }))
      ).catch(() => {})
    }
  }

  handleInvalidationTrigger('roster_change', leagueId)

  return NextResponse.json({ ok: true, rosterId: targetRosterId })
}

