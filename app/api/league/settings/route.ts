import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { Prisma } from '@prisma/client'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { assertLeagueMember } from '@/lib/league/league-access'
import {
  buildLeagueUpdateFromBody,
  commissionerLeagueFieldsFromRow,
} from '@/lib/league/commissioner-league-patch'
import { getLeagueRole, requireCommissionerRole } from '@/lib/league/permissions'
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

/** Keys stored on `LeagueSettings` (draft / draft-room row). */
const LEAGUE_SETTINGS_PATCH_KEYS = new Set([
  'draftDateUtc',
  'timezone',
  'autostart',
  'slowDraftPause',
  'slowPauseFrom',
  'slowPauseUntil',
  'cpuAutoPick',
  'aiAutoPick',
  'draftType',
  'pickTimerPreset',
  'pickTimerCustomValue',
  'rounds',
  'draftOrderMethod',
  'randomizeCount',
  'draftOrderSlots',
  'draftOrderLocked',
  'keeperCount',
  'keeperRoundCost',
  'keeperSlots',
  'dynastyCarryover',
  'playerPool',
  'alphabeticalSort',
  'aiQueueSuggestions',
  'aiBestAvailable',
  'aiRosterGuidance',
  'aiScarcityAlerts',
  'aiDraftGrade',
  'aiSleeperAlerts',
  'aiByeAwareness',
  'aiStackSuggestions',
  'aiRiskUpsideNotes',
  'aiScope',
])

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

function totalRosterSlotsForLeague(rosterSize: number | null): number {
  if (rosterSize != null && rosterSize > 0) return rosterSize
  return 15
}

function hasLeagueSettingsPatch(body: Record<string, unknown>): boolean {
  return Object.keys(body).some((k) => LEAGUE_SETTINGS_PATCH_KEYS.has(k))
}

export async function GET(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return jsonError('Unauthorized', 401)

  const leagueId = req.nextUrl.searchParams.get('leagueId')?.trim()
  if (!leagueId) return jsonError('leagueId required', 400)

  const gate = await assertLeagueMember(leagueId, userId)
  if (!gate.ok) return jsonError(gate.status === 404 ? 'League not found' : 'Forbidden', gate.status)

  const [league, userRole, profile] = await Promise.all([
    prisma.league.findFirst({
      where: { id: leagueId },
      include: {
        teams: { orderBy: { externalId: 'asc' } },
        leagueSettings: true,
      },
    }),
    getLeagueRole(leagueId, userId),
    prisma.userProfile.findFirst({
      where: { userId },
      select: { afCommissionerSub: true },
    }),
  ])

  if (!league) return jsonError('League not found', 404)

  const ls = league.leagueSettings
  const totalRosterSlots = totalRosterSlotsForLeague(league.rosterSize)
  const tz = league.timezone ?? ls?.timezone ?? 'America/New_York'
  const canEdit = userRole === 'commissioner' || userRole === 'co_commissioner'
  const comm = commissionerLeagueFieldsFromRow(league)
  const rawLeagueSettings = league.settings as Record<string, unknown> | null | undefined
  const sportConfig =
    rawLeagueSettings?.sportConfig && typeof rawLeagueSettings.sportConfig === 'object'
      ? rawLeagueSettings.sportConfig
      : {}

  return NextResponse.json({
    userRole,
    hasAfCommissionerSub: profile?.afCommissionerSub ?? false,
    canEdit,
    league: {
      id: league.id,
      name: league.name,
      sport: league.sport,
      season: league.season,
      timezone: tz,
      teamCount: league.leagueSize ?? league.teams.length,
      isDynasty: league.isDynasty,
      leagueVariant: league.leagueVariant ?? null,
      bestBallMode: league.bestBallMode ?? null,
      autoCoachEnabled: league.autoCoachEnabled ?? true,
      rosterSize: league.rosterSize,
      totalRosterSlots,
      sportConfig,
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
        isCommissioner: t.isCommissioner,
        isCoCommissioner: t.isCoCommissioner,
      })),
      ...comm,
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

  try {
    await requireCommissionerRole(leagueId, userId)
  } catch (err) {
    if (err instanceof Response) return err
    console.error('[league/settings PATCH]', err)
    return jsonError('Server error', 500)
  }

  const league = await prisma.league.findFirst({
    where: { id: leagueId },
    include: { leagueSettings: true, teams: true },
  })
  if (!league) return jsonError('League not found', 404)

  const profile = await prisma.userProfile.findFirst({
    where: { userId },
    select: { afCommissionerSub: true },
  })
  const hasSub = profile?.afCommissionerSub ?? false

  if (body.playoffTeams != null) {
    const pt = Number(body.playoffTeams)
    if ((pt === 7 || pt === 9) && !hasSub) {
      return jsonError('7- and 9-team playoff brackets require an AF Commissioner subscription.', 403)
    }
  }

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

  const updatedFieldNames: string[] = []

  const { data: leaguePatch, keys: leagueKeys } = buildLeagueUpdateFromBody(body)
  if (Object.keys(leaguePatch).length > 0) {
    await prisma.league.update({
      where: { id: leagueId },
      data: leaguePatch,
    })
    updatedFieldNames.push(...leagueKeys)
  }

  if (body.sportConfig !== undefined) {
    if (body.sportConfig !== null && typeof body.sportConfig !== 'object') {
      return jsonError('sportConfig must be an object or null', 400)
    }
    const prev = (league.settings as Record<string, unknown> | null) ?? {}
    await prisma.league.update({
      where: { id: leagueId },
      data: {
        settings: {
          ...prev,
          sportConfig:
            body.sportConfig === null ? Prisma.JsonNull : (body.sportConfig as Prisma.InputJsonValue),
        } as Prisma.InputJsonValue,
      },
    })
    updatedFieldNames.push('sportConfig')
  }

  const lsUpdate: Prisma.LeagueSettingsUpdateInput = { updatedBy: userId }

  if (body.draftDateUtc !== undefined) {
    lsUpdate.draftDateUtc =
      body.draftDateUtc === null ? null : new Date(String(body.draftDateUtc as string))
  }
  if (body.timezone !== undefined) {
    const tz = body.timezone === null ? null : String(body.timezone)
    lsUpdate.timezone = tz
  }
  if (body.autostart !== undefined) lsUpdate.autostart = Boolean(body.autostart)
  if (body.slowDraftPause !== undefined) lsUpdate.slowDraftPause = Boolean(body.slowDraftPause)
  if (body.slowPauseFrom !== undefined) lsUpdate.slowPauseFrom = body.slowPauseFrom === null ? null : String(body.slowPauseFrom)
  if (body.slowPauseUntil !== undefined)
    lsUpdate.slowPauseUntil = body.slowPauseUntil === null ? null : String(body.slowPauseUntil)
  if (body.cpuAutoPick !== undefined) lsUpdate.cpuAutoPick = Boolean(body.cpuAutoPick)
  if (body.aiAutoPick !== undefined) lsUpdate.aiAutoPick = Boolean(body.aiAutoPick)
  if (body.draftType !== undefined) lsUpdate.draftType = String(body.draftType)
  if (body.pickTimerPreset !== undefined) lsUpdate.pickTimerPreset = String(body.pickTimerPreset)
  if (body.pickTimerCustomValue !== undefined)
    lsUpdate.pickTimerCustomValue =
      body.pickTimerCustomValue === null ? null : Number(body.pickTimerCustomValue)
  if (body.rounds !== undefined) lsUpdate.rounds = Number(body.rounds)
  if (body.draftOrderMethod !== undefined) lsUpdate.draftOrderMethod = String(body.draftOrderMethod)
  if (body.randomizeCount !== undefined)
    lsUpdate.randomizeCount = body.randomizeCount === null ? null : Number(body.randomizeCount)
  if (body.draftOrderSlots !== undefined)
    lsUpdate.draftOrderSlots =
      body.draftOrderSlots === null ? Prisma.JsonNull : (body.draftOrderSlots as Prisma.InputJsonValue)
  if (body.draftOrderLocked !== undefined) lsUpdate.draftOrderLocked = Boolean(body.draftOrderLocked)
  if (body.keeperCount !== undefined) lsUpdate.keeperCount = Number(body.keeperCount)
  if (body.keeperRoundCost !== undefined) lsUpdate.keeperRoundCost = Boolean(body.keeperRoundCost)
  if (body.keeperSlots !== undefined)
    lsUpdate.keeperSlots =
      body.keeperSlots === null ? Prisma.JsonNull : (body.keeperSlots as Prisma.InputJsonValue)
  if (body.dynastyCarryover !== undefined) lsUpdate.dynastyCarryover = Boolean(body.dynastyCarryover)
  if (body.playerPool !== undefined) lsUpdate.playerPool = String(body.playerPool)
  if (body.alphabeticalSort !== undefined) lsUpdate.alphabeticalSort = Boolean(body.alphabeticalSort)
  if (body.aiQueueSuggestions !== undefined) lsUpdate.aiQueueSuggestions = Boolean(body.aiQueueSuggestions)
  if (body.aiBestAvailable !== undefined) lsUpdate.aiBestAvailable = Boolean(body.aiBestAvailable)
  if (body.aiRosterGuidance !== undefined) lsUpdate.aiRosterGuidance = Boolean(body.aiRosterGuidance)
  if (body.aiScarcityAlerts !== undefined) lsUpdate.aiScarcityAlerts = Boolean(body.aiScarcityAlerts)
  if (body.aiDraftGrade !== undefined) lsUpdate.aiDraftGrade = Boolean(body.aiDraftGrade)
  if (body.aiSleeperAlerts !== undefined) lsUpdate.aiSleeperAlerts = Boolean(body.aiSleeperAlerts)
  if (body.aiByeAwareness !== undefined) lsUpdate.aiByeAwareness = Boolean(body.aiByeAwareness)
  if (body.aiStackSuggestions !== undefined) lsUpdate.aiStackSuggestions = Boolean(body.aiStackSuggestions)
  if (body.aiRiskUpsideNotes !== undefined) lsUpdate.aiRiskUpsideNotes = Boolean(body.aiRiskUpsideNotes)
  if (body.aiScope !== undefined) lsUpdate.aiScope = String(body.aiScope)

  const shouldPatchLs = hasLeagueSettingsPatch(body)
  let updated = league.leagueSettings

  if (shouldPatchLs) {
    const { updatedBy: _ignore, ...createFields } = lsUpdate
    updated = await prisma.leagueSettings.upsert({
      where: { leagueId },
      create: {
        leagueId,
        updatedBy: userId,
        ...(createFields as Omit<Prisma.LeagueSettingsUncheckedCreateInput, 'leagueId' | 'updatedBy'>),
      },
      update: lsUpdate,
    })
    for (const k of LEAGUE_SETTINGS_PATCH_KEYS) {
      if (body[k] !== undefined) updatedFieldNames.push(k)
    }
  }

  if (shouldPatchLs && updated) {
    try {
      await syncDraftSessionFromLeagueSettings(
        leagueId,
        updated,
        league.leagueSize ?? league.teams.length,
      )
    } catch (e) {
      console.warn('[league/settings PATCH] syncDraftSessionFromLeagueSettings', e)
    }
  }

  const fresh = await prisma.league.findFirst({
    where: { id: leagueId },
    include: { leagueSettings: true },
  })
  const lsOut = fresh?.leagueSettings

  return NextResponse.json({
    success: true,
    updatedFields: [...new Set(updatedFieldNames)],
    settings: lsOut
      ? {
          ...lsOut,
          draftDateUtc: lsOut.draftDateUtc?.toISOString() ?? null,
          updatedAt: lsOut.updatedAt.toISOString(),
        }
      : null,
  })
}
