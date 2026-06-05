import { NextResponse } from 'next/server'
import { processWaiverWindow } from '@/lib/redraft/waiverEngine'
import { prisma } from '@/lib/prisma'
import { requireAdminOrBearer } from '@/lib/adminAuth'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: Request) {
  const gate = await requireAdminOrBearer(request)
  if (!gate.ok) return gate.res

  const seasons = await prisma.redraftSeason.findMany({
    where: { status: { in: ['active', 'drafting'] } },
    take: 20,
  })
  const results: { seasonId: string; processed: unknown[] }[] = []
  for (const s of seasons) {
    const processed = await processWaiverWindow(s.leagueId, s.id)
    results.push({ seasonId: s.id, processed })
  }
  return NextResponse.json({ results })
}
