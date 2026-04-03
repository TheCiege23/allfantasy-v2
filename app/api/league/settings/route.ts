import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { Prisma } from '@prisma/client'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { assertLeagueCommissioner, assertLeagueMember } from '@/lib/league/league-access'
import { isValidIanaTimeZone } from '@/lib/timezone'
import { syncDraftSessionFromLeagueSettings } from '@/lib/league/league-settings-draft-sync'

export const dynamic = 'force-dynamic'

const DRAFT_TYPES = new Set(['snake', 'linear', '3rd_reversal', 'auction'])
const ORDER_METHODS = new Set([
  'manual',
  'randomized',
  'prev_standings',
  'worst_to_first',
  'reverse_max_pf',
  'custom_import',
])
const PLAYER_POOLS = new Set(['all', 'rookies_only', 'veterans_only'])
const AI_SCOPES = new Set(['everyone', 'per_user', 'commissioner_only', 'disabled'])
const TIMER_PRESETS = new Set([
  '30s',
  '60s',
  '90s',
  '120s',
  '300s',
  '600s',
  '1800s',
  '3600s',
  '3h',
  '8h',
  '24h',
  'custom',
])

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

function totalRosterSlotsForLeague(rosterSize: number | null): number {
  if (rosterSize != null && rosterSize > 0) return rosterSize
  return 15
}

export async function GET(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return jsonError('Unauthorized', 401)

  const leagueId = req.nextUrl.searchParams.get('leagueId')?.trim()
  if (!leagueId) return jsonError('leagueId required', 400)

  const gate = await assertLeagueMember(leagueId, userId)
  if (!gate.ok) return jsonError(gate.status === 404 ? 'League not found' : 'Forbidden', gate.status)

  const league = await prisma.league.findFirst({
    where: { id: leagueId },
    include: {
      teams: { orderBy: { externalId: 'asc' } },
      leagueSettings: true,
    },
  })
  if (!league) return jsonError('League not found', 404)

  const ls = league.leagueSettings
  const totalRosterSlots = totalRosterSlotsForLeague(league.rosterSize)

  return NextResponse.json({
    league: {
      id: league.id,
      name: league.name,
      sport: league.sport,
      season: league.season,
      timezone: ls?.timezone ?? 'America/New_York',
      teamCount: league.leagueSize ?? league.teams.length,
      isDynasty: league.isDynasty,
      rosterSize: league.rosterSize,
      totalRosterSlots,
      teams: league.teams.map((t) => ({
        id: t.id,
        externalId: t.externalId,
        teamName: t.teamName,
        ownerName: t.ownerName,
        avatarUrl: t.avatarUrl,
        role: t.role,
        claimedByUserId: t.claimedByUserId ?? null,
        wins: t.wins,
        losses: t.losses,
        pointsFor: t.pointsFor,
      })),
    },
    settings: ls
      ? {
          ...ls,
          draftDateUtc: ls.draftDateUtc?.toISOString() ?? null,
          updatedAt: ls.updatedAt.toISOString(),
        }
      : null,
  })
}

type PatchBody = Record<string, unknown> & { leagueId: string }

export async function PATCH(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return jsonError('Unauthorized', 401)

  let body: PatchBody
  try {
    body = (await req.json()) as PatchBody
  } catch {
    return jsonError('Invalid JSON', 400)
  }

  const leagueId = typeof body.leagueId === 'string' ? body.leagueId.trim() : ''
  if (!leagueId) return jsonError('leagueId required', 400)

  const gate = await assertLeagueCommissioner(leagueId, userId)
  if (!gate.ok) return jsonError(gate.status === 404 ? 'League not found' : 'Forbidden', gate.status)

  const league = await prisma.league.findFirst({
    where: { id: leagueId },
    include: { leagueSettings: true, teams: true },
  })
  if (!league) return jsonError('League not found', 404)

  if (body.timezone != null) {
    const tz = String(body.timezone)
    if (!isValidIanaTimeZone(tz)) return jsonError('Invalid timezone', 400)
  }

  if (body.draftType != null && !DRAFT_TYPES.has(String(body.draftType))) {
    return jsonError('Invalid draftType', 400)
  }

  if (body.draftOrderMethod != null && !ORDER_METHODS.has(String(body.draftOrderMethod))) {
    return jsonError('Invalid draftOrderMethod', 400)
  }

  const nextDraftType = body.draftType != null ? String(body.draftType) : league.leagueSettings?.draftType
  const nextOrderMethod =
    body.draftOrderMethod != null
      ? String(body.draftOrderMethod)
      : league.leagueSettings?.draftOrderMethod
  if (nextDraftType === 'auction' && nextOrderMethod === 'reverse_max_pf') {
    return jsonError('Reverse Max PF is unavailable for auction drafts', 400)
  }

  if (body.playerPool != null && !PLAYER_POOLS.has(String(body.playerPool))) {
    return jsonError('Invalid playerPool', 400)
  }

  if (body.aiScope != null && !AI_SCOPES.has(String(body.aiScope))) {
    return jsonError('Invalid aiScope', 400)
  }

  if (body.rounds != null) {
    const r = Number(body.rounds)
    if (!Number.isFinite(r) || r < 1 || r > 50) return jsonError('rounds must be 1–50', 400)
  }

  const preset = body.pickTimerPreset != null ? String(body.pickTimerPreset) : undefined
  if (preset != null && !TIMER_PRESETS.has(preset)) {
    return jsonError('Invalid pickTimerPreset', 400)
  }
  if (preset === 'custom' && body.pickTimerCustomValue != null) {
    const sec = Number(body.pickTimerCustomValue)
    if (!Number.isFinite(sec) || sec < 10 || sec > 604800) {
      return jsonError('pickTimerCustomValue must be 10–604800 seconds', 400)
    }
  }

  if (body.randomizeCount != null) {
    const c = Number(body.randomizeCount)
    if (!Number.isFinite(c) || c < 1 || c > 50) return jsonError('randomizeCount must be 1–50', 400)
  }

  if (body.keeperCount != null) {
    const k = Number(body.keeperCount)
    if (!Number.isFinite(k) || k < 0 || k > 10) return jsonError('keeperCount must be 0–10', 400)
  }

  const update: Prisma.LeagueSettingsUpdateInput = { updatedBy: userId }

  if (body.draftDateUtc !== undefined) {
    update.draftDateUtc =
      body.draftDateUtc === null ? null : new Date(String(body.draftDateUtc as string))
  }
  if (body.timezone !== undefined) update.timezone = body.timezone === null ? null : String(body.timezone)
  if (body.autostart !== undefined) update.autostart = Boolean(body.autostart)
  if (body.slowDraftPause !== undefined) update.slowDraftPause = Boolean(body.slowDraftPause)
  if (body.slowPauseFrom !== undefined) update.slowPauseFrom = body.slowPauseFrom === null ? null : String(body.slowPauseFrom)
  if (body.slowPauseUntil !== undefined)
    update.slowPauseUntil = body.slowPauseUntil === null ? null : String(body.slowPauseUntil)
  if (body.cpuAutoPick !== undefined) update.cpuAutoPick = Boolean(body.cpuAutoPick)
  if (body.aiAutoPick !== undefined) update.aiAutoPick = Boolean(body.aiAutoPick)
  if (body.draftType !== undefined) update.draftType = String(body.draftType)
  if (body.pickTimerPreset !== undefined) update.pickTimerPreset = String(body.pickTimerPreset)
  if (body.pickTimerCustomValue !== undefined)
    update.pickTimerCustomValue =
      body.pickTimerCustomValue === null ? null : Number(body.pickTimerCustomValue)
  if (body.rounds !== undefined) update.rounds = Number(body.rounds)
  if (body.draftOrderMethod !== undefined) update.draftOrderMethod = String(body.draftOrderMethod)
  if (body.randomizeCount !== undefined)
    update.randomizeCount = body.randomizeCount === null ? null : Number(body.randomizeCount)
  if (body.draftOrderSlots !== undefined)
    update.draftOrderSlots = body.draftOrderSlots === null ? Prisma.JsonNull : (body.draftOrderSlots as Prisma.InputJsonValue)
  if (body.draftOrderLocked !== undefined) update.draftOrderLocked = Boolean(body.draftOrderLocked)
  if (body.keeperCount !== undefined) update.keeperCount = Number(body.keeperCount)
  if (body.keeperRoundCost !== undefined) update.keeperRoundCost = Boolean(body.keeperRoundCost)
  if (body.keeperSlots !== undefined)
    update.keeperSlots = body.keeperSlots === null ? Prisma.JsonNull : (body.keeperSlots as Prisma.InputJsonValue)
  if (body.dynastyCarryover !== undefined) update.dynastyCarryover = Boolean(body.dynastyCarryover)
  if (body.playerPool !== undefined) update.playerPool = String(body.playerPool)
  if (body.alphabeticalSort !== undefined) update.alphabeticalSort = Boolean(body.alphabeticalSort)
  if (body.aiQueueSuggestions !== undefined) update.aiQueueSuggestions = Boolean(body.aiQueueSuggestions)
  if (body.aiBestAvailable !== undefined) update.aiBestAvailable = Boolean(body.aiBestAvailable)
  if (body.aiRosterGuidance !== undefined) update.aiRosterGuidance = Boolean(body.aiRosterGuidance)
  if (body.aiScarcityAlerts !== undefined) update.aiScarcityAlerts = Boolean(body.aiScarcityAlerts)
  if (body.aiDraftGrade !== undefined) update.aiDraftGrade = Boolean(body.aiDraftGrade)
  if (body.aiSleeperAlerts !== undefined) update.aiSleeperAlerts = Boolean(body.aiSleeperAlerts)
  if (body.aiByeAwareness !== undefined) update.aiByeAwareness = Boolean(body.aiByeAwareness)
  if (body.aiStackSuggestions !== undefined) update.aiStackSuggestions = Boolean(body.aiStackSuggestions)
  if (body.aiRiskUpsideNotes !== undefined) update.aiRiskUpsideNotes = Boolean(body.aiRiskUpsideNotes)
  if (body.aiScope !== undefined) update.aiScope = String(body.aiScope)

  const { updatedBy: _u, ...createRest } = update
  const updated = await prisma.leagueSettings.upsert({
    where: { leagueId },
    create: {
      leagueId,
      updatedBy: userId,
      ...createRest,
    },
    update,
  })

  try {
    await syncDraftSessionFromLeagueSettings(leagueId, updated, league.leagueSize ?? league.teams.length)
  } catch (e) {
    console.warn('[league/settings PATCH] syncDraftSessionFromLeagueSettings', e)
  }

  return NextResponse.json({
    settings: {
      ...updated,
      draftDateUtc: updated.draftDateUtc?.toISOString() ?? null,
      updatedAt: updated.updatedAt.toISOString(),
    },
  })
}
