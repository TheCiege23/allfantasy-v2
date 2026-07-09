/**
 * Fantasy OS Suite — Phase OS-A2: League Context Wiring.
 *
 * GET: read a league's financial context. Session-gated like every sibling Decision OS read route
 * (`/mission-control`, `/league-analytics`, `/user-os`) — no per-league role check, matching that
 * exact existing precedent (see `leagueContextAuthorization.ts`'s own header comment for why).
 *
 * POST: confirm free/paid, or reset to unknown. Gated by `authorizeLeagueContextMutation` — the
 * league's own commissioner/co-commissioner, or a site admin. Never infers, never touches
 * LeagueSafe/FanCred/any real escrow provider — this route only records what a real person explicitly
 * states.
 */
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  resolveLeagueFinancialContext,
  persistLeagueFinancialConfirmation,
  LeagueContextStoreUnavailableError,
} from '@/lib/decision-os/leagueContext'
import { authorizeLeagueContextMutation } from '@/lib/decision-os/leagueContextAuthorization'
import type { LeagueEscrowProvider } from '@/lib/decision-os/leagueFinancialContext'

export const dynamic = 'force-dynamic'

async function getSessionUserId(): Promise<string | null> {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  return session?.user?.id ?? null
}

export async function GET(request: Request) {
  const userId = await getSessionUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const leagueId = new URL(request.url).searchParams.get('leagueId')?.trim()
  if (!leagueId) {
    return NextResponse.json({ error: 'leagueId is required' }, { status: 400 })
  }

  const context = await resolveLeagueFinancialContext(leagueId)
  return NextResponse.json(context)
}

const VALID_ACTIONS = new Set(['confirm_free', 'confirm_paid', 'reset'])

interface LeagueContextMutationBody {
  leagueId?: string
  action?: string
  buyInAmount?: number | null
  buyInCurrency?: string | null
  financialNotes?: string | null
  escrowProvider?: LeagueEscrowProvider
}

export async function POST(request: Request) {
  const userId = await getSessionUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: LeagueContextMutationBody
  try {
    body = (await request.json()) as LeagueContextMutationBody
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 })
  }

  const leagueId = body.leagueId?.trim()
  if (!leagueId) {
    return NextResponse.json({ error: 'leagueId is required' }, { status: 400 })
  }
  if (!body.action || !VALID_ACTIONS.has(body.action)) {
    return NextResponse.json(
      { error: `action must be one of: ${Array.from(VALID_ACTIONS).join(', ')}` },
      { status: 400 },
    )
  }

  const gate = await authorizeLeagueContextMutation(leagueId, userId)
  if (!gate.authorized) {
    return NextResponse.json(
      { error: gate.status === 403 ? 'Forbidden — only this league\'s commissioner or a site admin can confirm its financial context.' : 'Unauthorized' },
      { status: gate.status },
    )
  }

  try {
    const context =
      body.action === 'reset'
        ? await persistLeagueFinancialConfirmation(leagueId, { type: 'reset' })
        : await persistLeagueFinancialConfirmation(leagueId, {
            type: 'confirm',
            input: {
              financialStatus: body.action === 'confirm_free' ? 'FREE' : 'PAID',
              buyInAmount: body.buyInAmount,
              buyInCurrency: body.buyInCurrency,
              financialNotes: body.financialNotes,
              escrowProvider: body.escrowProvider,
            },
          })
    return NextResponse.json(context)
  } catch (err) {
    if (err instanceof LeagueContextStoreUnavailableError) {
      return NextResponse.json({ error: 'context_store_unavailable' }, { status: 503 })
    }
    throw err
  }
}
