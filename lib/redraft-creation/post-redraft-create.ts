/**
 * Shared POST handler for redraft league creation (used by /api/leagues/redraft/create and legacy path).
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import type { LeagueSport, Prisma } from '@prisma/client'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createRedraftLeagueInTransaction } from '@/lib/redraft-creation/create-redraft-league'
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
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
  const userId = session.user.id

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
          userId,
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
    log('transaction_failed', { detail, userId })
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
