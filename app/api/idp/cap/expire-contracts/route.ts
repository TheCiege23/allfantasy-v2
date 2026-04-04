import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requireCronAuth } from '@/app/api/cron/_auth'
import { prisma } from '@/lib/prisma'
import { assertLeagueMember } from '@/lib/league/league-access'
import { expireContractsForNewSeason } from '@/lib/idp/capEngine'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

async function runExpire(leagueId: string, newSeason: number) {
  return expireContractsForNewSeason(leagueId, newSeason)
}

export async function GET(req: NextRequest) {
  if (!requireCronAuth(req, 'CRON_SECRET')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const newSeasonRaw = req.nextUrl.searchParams.get('newSeason')
  const newSeason = newSeasonRaw ? Number(newSeasonRaw) : new Date().getFullYear()
  const leagueId = req.nextUrl.searchParams.get('leagueId')?.trim()

  if (!Number.isFinite(newSeason)) {
    return NextResponse.json({ error: 'newSeason invalid' }, { status: 400 })
  }

  try {
    if (leagueId) {
      const result = await runExpire(leagueId, newSeason)
      return NextResponse.json({ ok: true, leagueId, ...result })
    }

    const configs = await prisma.iDPCapConfig.findMany({ select: { leagueId: true } })
    const results: { leagueId: string; expired: number }[] = []
    for (const c of configs) {
      const result = await runExpire(c.leagueId, newSeason)
      results.push({ leagueId: c.leagueId, ...result })
    }
    return NextResponse.json({ ok: true, newSeason, results })
  } catch (e) {
    console.error('[idp/cap/expire-contracts]', e)
    return NextResponse.json({ error: 'Expire run failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id

  let body: { leagueId?: string; newSeason?: number }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const leagueId = body.leagueId?.trim()
  const newSeason = body.newSeason
  if (!leagueId || newSeason == null || !Number.isFinite(newSeason)) {
    return NextResponse.json({ error: 'leagueId and newSeason required' }, { status: 400 })
  }

  const cronOk = requireCronAuth(req as NextRequest, 'CRON_SECRET')
  if (!cronOk) {
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const gate = await assertLeagueMember(leagueId, userId)
    if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: gate.status })
  }

  try {
    const result = await runExpire(leagueId, newSeason)
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    console.error('[idp/cap/expire-contracts]', e)
    return NextResponse.json({ error: 'Expire run failed' }, { status: 500 })
  }
}
