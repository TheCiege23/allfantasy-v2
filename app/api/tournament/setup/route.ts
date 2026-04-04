import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  assignParticipantsToLeagues,
  buildConferencesAndLeagues,
  launchTournamentShell,
  openRegistration,
} from '@/lib/tournament/setupEngine'
import { assertTournamentCommissioner } from '@/lib/tournament/shellAccess'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { tournamentId?: string; action?: string }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const tournamentId = body.tournamentId?.trim()
  if (!tournamentId) return NextResponse.json({ error: 'tournamentId required' }, { status: 400 })

  try {
    await assertTournamentCommissioner(tournamentId, userId)
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const shell = await prisma.tournamentShell.findUnique({ where: { id: tournamentId } })
  if (!shell) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    switch (body.action) {
      case 'build_leagues':
        await buildConferencesAndLeagues(tournamentId, shell.namingMode)
        break
      case 'open_registration':
        await openRegistration(tournamentId)
        break
      case 'assign_participants':
        await assignParticipantsToLeagues(tournamentId)
        break
      case 'launch':
        await launchTournamentShell(tournamentId)
        break
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Setup failed'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const next = await prisma.tournamentShell.findUnique({ where: { id: tournamentId } })
  return NextResponse.json({ ok: true, shell: next })
}
