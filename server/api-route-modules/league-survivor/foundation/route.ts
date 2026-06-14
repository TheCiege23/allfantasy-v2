import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildSurvivorStateForUser } from '@/lib/survivor/survivorStateService'
import { resolveSurvivorAccessContext } from '@/lib/survivor/survivorAccessControl'
import {
  buildSurvivorLeagueColumnPatch,
  buildSurvivorSettingsSnapshotPatch,
  normalizeSurvivorFoundationSettings,
} from '@/lib/survivor/normalizeSurvivorSettings'
import { upsertSurvivorConfig } from '@/lib/survivor/SurvivorLeagueConfig'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type RouteParams = { leagueId?: string; action?: string }
type RouteContext = { params: Promise<RouteParams> | RouteParams }
type JsonRecord = Record<string, unknown>

async function readParams(ctx: RouteContext): Promise<RouteParams> {
  return typeof (ctx.params as Promise<RouteParams>)?.then === 'function'
    ? await (ctx.params as Promise<RouteParams>)
    : (ctx.params as RouteParams)
}

async function requireUserId(): Promise<string | null> {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  return session?.user?.id ?? null
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : {}
}

function actionFromBody(body: JsonRecord, fallback: string | undefined): string {
  const raw = typeof body.action === 'string' ? body.action : fallback
  return String(raw ?? 'get-state').trim().toLowerCase()
}

function validateTribeSettings(input: JsonRecord) {
  const normalized = normalizeSurvivorFoundationSettings(input)
  const errors: string[] = []
  const warnings: string[] = []
  if (normalized.defaultTeamCount < normalized.minTeamCount || normalized.defaultTeamCount > normalized.maxTeamCount) {
    errors.push(`Cast size must stay between ${normalized.minTeamCount} and ${normalized.maxTeamCount}.`)
  }
  if (normalized.tribeCount !== 4) {
    warnings.push('Phase 1 canonical setup recommends four tribes.')
  }
  if (normalized.defaultTeamCount % normalized.tribeCount !== 0) {
    warnings.push('Cast size is not evenly divisible by tribe count; tribe assignment will need manual review.')
  }
  if (Math.ceil(normalized.defaultTeamCount / normalized.tribeCount) > 5) {
    warnings.push('More than five players per tribe is outside the Phase 1 default shell.')
  }
  return { ok: errors.length === 0, settings: normalized, errors, warnings }
}

async function readLeagueSettings(leagueId: string): Promise<JsonRecord | null> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { settings: true },
  })
  if (!league) return null
  return asRecord(league.settings)
}

async function updateFoundationSettings(leagueId: string, body: JsonRecord) {
  const current = await readLeagueSettings(leagueId)
  if (!current) {
    return NextResponse.json({ error: 'League not found' }, { status: 404 })
  }
  const incoming = asRecord(body.settings)
  const mergedInput = { ...current, ...incoming, ...body }
  const settings = normalizeSurvivorFoundationSettings(mergedInput)
  const settingsPatch = buildSurvivorSettingsSnapshotPatch(settings as unknown as JsonRecord)
  const columnPatch = buildSurvivorLeagueColumnPatch(settings)

  await prisma.league.update({
    where: { id: leagueId },
    data: {
      settings: { ...current, ...settingsPatch },
      ...columnPatch,
    },
  })

  await upsertSurvivorConfig(leagueId, {
    tribeCount: settings.tribeCount,
    tribeSize: Math.max(1, Math.ceil(settings.defaultTeamCount / settings.tribeCount)),
    tribeFormation: settings.tribeAssignmentMode,
    mergeTrigger: settings.mergeTriggerType === 'active_player_count' ? 'player_count' : 'week',
    mergeWeek: settings.mergeWeek,
    mergePlayerCount: settings.mergeActivePlayerCount,
    selfVoteDisallowed: !settings.selfVotesAllowed,
    exileReturnEnabled: settings.exileIslandEnabled,
    idolCount: settings.defaultTeamCount + settings.tribeCount,
    tribalCouncilTimeUtc: settings.tribalCouncilTime,
    minigameFrequency: 'none',
    challengesSystemRun: false,
  })

  return NextResponse.json({ ok: true, settings, noFakeGameplayState: true })
}

function placeholder(action: string, detail: string) {
  return NextResponse.json(
    {
      ok: true,
      action,
      status: 'deferred',
      noMutation: true,
      noFakeGameplayState: true,
      detail,
    },
    { status: 202 },
  )
}

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const userId = await requireUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId } = await readParams(ctx)
  if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

  const result = await buildSurvivorStateForUser(leagueId, userId)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json(result.state)
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  const userId = await requireUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const params = await readParams(ctx)
  const leagueId = params.leagueId
  if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

  const body = asRecord(await req.json().catch(() => ({})))
  const action = actionFromBody(body, params.action)
  const access = await resolveSurvivorAccessContext(leagueId, userId)
  if (!access) return NextResponse.json({ error: 'League not found' }, { status: 404 })
  if (!access.isLeagueMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (action === 'get-state') {
    const result = await buildSurvivorStateForUser(leagueId, userId)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
    return NextResponse.json(result.state)
  }

  if (action === 'privacy-check') {
    return NextResponse.json({
      ok: true,
      access: {
        role: access.role,
        isParticipant: access.isParticipant,
        isCommissionerParticipating: access.isCommissionerParticipating,
        isNonParticipatingCommissionerHost: access.isNonParticipatingCommissionerHost,
        decisions: access.decisions,
        warnings: access.privacyWarnings,
      },
      noFakeGameplayState: true,
    })
  }

  if (action === 'validate-tribe-settings' || action === 'assign-tribes-placeholder') {
    return NextResponse.json({
      ...validateTribeSettings({ ...access.settings, ...body }),
      action,
      assignmentStatus: 'not_started',
      noMutation: true,
      noFakeGameplayState: true,
    })
  }

  if (action === 'update-settings' || action === 'set-commissioner-participation-mode') {
    if (!access.decisions.canUpdateSettings) {
      return NextResponse.json({ error: 'Commissioner access required' }, { status: 403 })
    }
    if (action === 'set-commissioner-participation-mode') {
      const mode =
        body.mode === 'participating_player' || body.commissionerParticipationMode === 'participating_player'
          ? 'participating_player'
          : 'non_participating_host'
      return updateFoundationSettings(leagueId, {
        settings: { ...access.settings, commissionerParticipationMode: mode },
      })
    }
    return updateFoundationSettings(leagueId, body)
  }

  if (action === 'audit-log') {
    if (!access.decisions.canPerformAdminAction) {
      return NextResponse.json({ error: 'Commissioner access required' }, { status: 403 })
    }
    const entries = await prisma.survivorAuditEntry.findMany({
      where: access.decisions.canSeeHiddenIdolAssignments
        ? { leagueId }
        : {
            leagueId,
            OR: [{ isVisibleToPublic: true }, { actorUserId: userId }, { targetUserId: userId }],
          },
      orderBy: { createdAt: 'desc' },
      take: 25,
      select: {
        id: true,
        week: true,
        category: true,
        action: true,
        actorUserId: true,
        targetUserId: true,
        targetTribeId: true,
        relatedEntityId: true,
        relatedEntityType: true,
        data: true,
        isVisibleToPublic: true,
        createdAt: true,
      },
    })
    return NextResponse.json({ ok: true, entries, noFakeGameplayState: true })
  }

  if (action === 'open-vote-window-placeholder') {
    return placeholder(action, 'Vote windows are DB-scaffolded, but Phase 1 does not create councils or ballots.')
  }
  if (action === 'submit-vote-placeholder') {
    return placeholder(action, 'Vote submission remains on the existing vote engine route; Phase 1 does not fake ballots.')
  }
  if (action === 'close-vote-window-placeholder') {
    return placeholder(action, 'Vote closing and reveal require the Phase 2 vote engine.')
  }

  return NextResponse.json({ error: 'Unsupported Survivor foundation action', action }, { status: 400 })
}
