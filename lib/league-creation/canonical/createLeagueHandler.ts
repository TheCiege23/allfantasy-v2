/**
 * POST /api/leagues — shared handler (Next.js Route Handler).
 * Auth: session user → AppUser.id (never trust client commissioner id).
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  stripForbiddenCreateLeagueFields,
  validateCreatePayload,
} from '@/lib/league-creation/canonical/validateCreateLeague'
import type { CreateLeagueErrorResponse, CreateLeagueSuccessResponse } from '@/lib/league-creation/canonical/types'
import { resolveAppUserIdForLeagueCreate } from '@/lib/redraft-creation/resolve-app-user-for-league'
import { executeCanonicalLeagueCreation } from '@/lib/league-creation/canonical/executeCanonicalLeagueCreation'

const LOG_PREFIX = '[create-league-canonical]'

function log(event: string, payload: Record<string, unknown>) {
  console.info(`${LOG_PREFIX} ${event}`, payload)
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

  const exec = await executeCanonicalLeagueCreation({
    appUserId: resolvedUser.appUserId,
    body: validated.data,
  })

  if (!exec.ok) {
    return NextResponse.json(exec.response, { status: exec.status })
  }

  return NextResponse.json(exec.response)
}
