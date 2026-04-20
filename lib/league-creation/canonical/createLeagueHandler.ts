/**
 * POST /api/leagues — shared handler (Next.js Route Handler).
 * Auth: session user → AppUser.id (never trust client commissioner id).
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import type { LeagueSport, Prisma } from '@prisma/client'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { resolveAppUserIdForLeagueCreate } from '@/lib/redraft-creation/resolve-app-user-for-league'
import { runPresetEngine } from '@/lib/league-creation/preset-engine/runPresetEngine'
import { createCanonicalLeagueInTransaction } from '@/lib/league-creation/canonical/createCanonicalLeagueInTransaction'
import {
  normalizeDraftTypeForEngine,
  stripForbiddenCreateLeagueFields,
  validateCreatePayload,
} from '@/lib/league-creation/canonical/validateCreateLeague'
import type { CreateLeagueErrorResponse, CreateLeagueSuccessResponse } from '@/lib/league-creation/canonical/types'
import { logLeagueCreated } from '@/server/services/auditService'

const LOG_PREFIX = '[create-league-canonical]'

function log(event: string, payload: Record<string, unknown>) {
  console.info(`${LOG_PREFIX} ${event}`, payload)
}

function prismaErrorDetail(e: unknown): string {
  if (e && typeof e === 'object' && 'code' in e && 'message' in e) {
    const o = e as { code?: string; message?: string; meta?: unknown }
    const meta = o.meta && typeof o.meta === 'object' ? JSON.stringify(o.meta) : ''
    return [o.code, o.message, meta].filter(Boolean).join(' · ')
  }
  return e instanceof Error ? e.message : String(e)
}

export async function postCreateLeague(req: Request): Promise<NextResponse<CreateLeagueSuccessResponse | CreateLeagueErrorResponse>> {
  const session = (await getServerSession(authOptions as never)) as {
    user?: { id?: string; email?: string | null; name?: string | null }
  } | null

  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'Unauthorized', errors: [] }, { status: 401 })
  }

  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid JSON body',
        errors: [{ path: 'body', message: 'Request body must be valid JSON' }],
      },
      { status: 400 }
    )
  }

  const { body: sanitizedBody, strippedKeys } = stripForbiddenCreateLeagueFields(raw)
  if (strippedKeys.length > 0) {
    log('client_user_id_fields_stripped', { strippedKeys })
  }

  const validated = validateCreatePayload(sanitizedBody)
  if (!validated.ok) {
    return NextResponse.json(
      {
        success: false,
        error: validated.error,
        errors: validated.errors.map((e) => ({ path: e.path, message: e.message, code: e.code })),
      },
      { status: validated.status }
    )
  }

  const body = validated.data
  const engineDraft = normalizeDraftTypeForEngine(body.draftType)

  const resolvedUser = await resolveAppUserIdForLeagueCreate(session.user)
  if (!resolvedUser.ok) {
    return NextResponse.json(
      {
        success: false,
        error: 'Authenticated user not found in app_users',
        errors: [{ path: 'session', message: 'No matching AppUser for this session.' }],
      },
      { status: 403 }
    )
  }

  const appUserId = resolvedUser.appUserId

  let engine
  try {
    engine = runPresetEngine({
      concept: body.concept,
      sport: body.sport,
      teamCount: body.teamCount,
      draftType: engineDraft,
      scoringPreset: body.scoringPreset,
      leagueName: body.leagueName,
      commissionerId: appUserId,
      conceptSetup: body.conceptSetup ?? null,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    log('preset_engine_failed', { msg })
    return NextResponse.json(
      {
        success: false,
        error: 'Preset resolution failed',
        errors: [{ path: 'preset', message: msg }],
      },
      { status: 400 }
    )
  }

  let createdLeagueId = ''
  let homepageUrl = ''

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        return createCanonicalLeagueInTransaction(
          tx as Prisma.TransactionClient,
          appUserId,
          body,
          engine,
          (ev, payload) => log(ev, payload)
        )
      },
      { maxWait: 20000, timeout: 25000 }
    )
    createdLeagueId = result.leagueId
    homepageUrl = result.homepageUrl
  } catch (e) {
    const detail = prismaErrorDetail(e)
    console.error(`${LOG_PREFIX} transaction_failed`, detail)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create league',
        errors: [{ path: 'database', message: 'League creation failed' }],
        detail,
      },
      { status: 500 }
    )
  }

  try {
    await logLeagueCreated({
      leagueId: createdLeagueId,
      userId: appUserId,
      leagueName: body.leagueName,
      sport: String(body.sport),
      concept: engine.leagueFormatId,
      presetKey: engine.presetKey,
    })
  } catch (e) {
    console.error(`${LOG_PREFIX} audit_log_league_created_failed`, e)
  }

  void import('@/lib/league-events/publisher')
    .then(({ publishLeagueFanoutEvent }) =>
      publishLeagueFanoutEvent({
        leagueId: createdLeagueId,
        eventType: 'league_created',
        title: 'League created',
        message: `${body.leagueName} is ready to set up.`,
        category: 'league_announcements',
        visibility: 'all_members',
        actorUserId: appUserId,
        meta: { sport: String(body.sport), concept: engine.leagueFormatId, presetKey: engine.presetKey },
        dedupeKey: `league_created:${createdLeagueId}`,
      }),
    )
    .catch(() => {})

  try {
    const { runPostCreateInitialization } = await import('@/lib/league-defaults-orchestrator/LeagueDefaultsOrchestrator')
    await runPostCreateInitialization(createdLeagueId, body.sport as LeagueSport, engine.leagueFormatId)
  } catch (e) {
    console.warn(`${LOG_PREFIX} post_create_bootstrap_non_fatal`, e)
  }

  try {
    const { generateLeagueConstitutionArtifact } = await import('@/lib/league/format-artifact-service')
    await generateLeagueConstitutionArtifact(createdLeagueId)
  } catch (e) {
    console.warn(`${LOG_PREFIX} constitution_non_fatal`, e)
  }

  const resBody: CreateLeagueSuccessResponse = {
    success: true,
    league: {
      id: createdLeagueId,
      leagueName: body.leagueName,
      concept: engine.leagueFormatId,
      sport: String(body.sport),
      teamCount: body.teamCount,
      draftType: body.draftType,
      scoringPreset: body.scoringPreset,
      status: 'setup',
      presetKey: engine.presetKey,
    },
    homepageUrl,
  }

  if (engine.warnings.length > 0) {
    resBody.warnings = engine.warnings
  }

  log('success', { leagueId: createdLeagueId, homepageUrl })

  return NextResponse.json(resBody)
}
