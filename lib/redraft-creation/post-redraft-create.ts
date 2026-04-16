/**
 * Shared POST handler for redraft league creation (used by /api/leagues/redraft/create and legacy path).
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import type { LeagueSport, Prisma } from '@prisma/client'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createRedraftLeagueInTransaction } from '@/lib/redraft-creation/create-redraft-league'
import { resolveAppUserIdForLeagueCreate } from '@/lib/redraft-creation/resolve-app-user-for-league'
import { validateRedraftCreatePayload } from '@/lib/redraft-creation/validate'

const LOG_PREFIX = '[redraft-create]'

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

export async function postRedraftCreate(req: Request): Promise<NextResponse> {
  const session = (await getServerSession(authOptions as never)) as {
    user?: { id?: string; email?: string | null; name?: string | null }
  } | null

  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const resolvedUser = await resolveAppUserIdForLeagueCreate(session.user)
  log('pre_league_create_app_user', {
    hasSessionUserId: true,
    sessionUserIdPrefix: String(session.user.id).slice(0, 8),
    hasSessionEmail: typeof session.user.email === 'string' && session.user.email.length > 0,
    resolveOk: resolvedUser.ok,
    resolvedVia: resolvedUser.ok ? resolvedUser.resolvedVia : undefined,
    reason: resolvedUser.ok ? undefined : resolvedUser.reason,
  })

  if (!resolvedUser.ok) {
    log('app_user_missing_for_league_create', {
      reason: resolvedUser.reason,
      sessionUserIdPrefix: String(session.user.id).slice(0, 8),
    })
    return NextResponse.json(
      {
        success: false,
        error: 'Authenticated user not found in app_users',
        issues: [{ path: 'session', message: 'No matching AppUser for this session. Sign out and sign in again, or finish account setup.' }],
      },
      { status: 403 }
    )
  }

  if (resolvedUser.resolvedVia === 'email_fallback') {
    console.warn(`${LOG_PREFIX} session user id did not match app_users.id; using AppUser id from email`, {
      sessionIdPrefix: String(session.user.id).slice(0, 8),
      appUserIdPrefix: resolvedUser.appUserId.slice(0, 8),
    })
  }

  const appUserId = resolvedUser.appUserId

  const appUser = await prisma.appUser.findUnique({
    where: { id: appUserId },
    select: { id: true },
  })
  if (!appUser) {
    log('app_user_find_unique_failed', { appUserIdPrefix: appUserId.slice(0, 8) })
    return NextResponse.json(
      {
        success: false,
        error: 'Authenticated user not found in app_users',
        issues: [{ path: 'app_users', message: 'Authenticated user not found in app_users' }],
      },
      { status: 403 }
    )
  }

  console.log('CREATE LEAGUE USER DEBUG', {
    sessionUser: session?.user,
    userIdBeingUsed: appUserId,
  })

  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid JSON body',
        issues: [{ path: 'body', message: 'Request body must be valid JSON' }],
      },
      { status: 400 }
    )
  }

  log('payload_received', { keys: raw && typeof raw === 'object' ? Object.keys(raw as object) : [] })

  const validated = validateRedraftCreatePayload(raw)
  if (!validated.ok) {
    log('validation_failed', { error: validated.error, issues: validated.issues })
    return NextResponse.json(
      {
        success: false,
        error: validated.error,
        issues: validated.issues,
      },
      { status: validated.status }
    )
  }

  const body = validated.data
  let createdLeagueId = ''
  let homepageUrl = ''

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        return createRedraftLeagueInTransaction(
          tx as Prisma.TransactionClient,
          appUserId,
          body,
          (ev, payload) => log(ev, payload)
        )
      },
      { maxWait: 20000, timeout: 25000 }
    )
    createdLeagueId = result.leagueId
    homepageUrl = result.homepageUrl
  } catch (e) {
    const detail = prismaErrorDetail(e)
    log('transaction_failed', { detail, appUserId })
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create league',
        detail,
      },
      { status: 500 }
    )
  }

  try {
    const { runPostCreateInitialization } = await import(
      '@/lib/league-defaults-orchestrator/LeagueDefaultsOrchestrator'
    )
    await runPostCreateInitialization(createdLeagueId, body.sport as LeagueSport, null)
  } catch (e) {
    console.warn(`${LOG_PREFIX} post_create_bootstrap_non_fatal`, e)
  }

  try {
    const { generateLeagueConstitutionArtifact } = await import('@/lib/league/format-artifact-service')
    await generateLeagueConstitutionArtifact(createdLeagueId)
  } catch (e) {
    console.warn(`${LOG_PREFIX} constitution_non_fatal`, e)
  }

  log('success', { homepageUrl, leagueId: createdLeagueId })

  return NextResponse.json({
    success: true,
    leagueId: createdLeagueId,
    homepageUrl,
  })
}
