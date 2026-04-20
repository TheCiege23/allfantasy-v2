import { NextRequest, NextResponse } from 'next/server'
import { requireCronAuth } from '@/app/api/cron/_auth'
import { prisma } from '@/lib/prisma'
import { resolveSpecialtyConceptKey, isSpecialtyConcept } from '@/lib/specialty-automation/types'
import { dispatchSpecialtyAutomationTrigger } from '@/lib/specialty-automation/triggerDispatcher'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

function readInt(v: string | null, fallback: number): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

/**
 * Scheduled pass: specialty leagues only — `onScheduledPass` trigger.
 * Auth: CRON_SECRET / x-cron-secret (see `app/api/cron/_auth.ts`).
 */
export async function GET(req: NextRequest) {
  if (!requireCronAuth(req, 'CRON_SECRET')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const season = readInt(req.nextUrl.searchParams.get('season'), new Date().getUTCFullYear())
  const week = readInt(req.nextUrl.searchParams.get('week'), 1)
  const take = Math.min(500, Math.max(1, readInt(req.nextUrl.searchParams.get('take'), 100)))

  const leagues = await prisma.league.findMany({
    where: {
      OR: [{ status: null }, { status: { notIn: ['archived', 'deleted'] } }],
    },
    select: {
      id: true,
      season: true,
      settings: true,
      leagueType: true,
      leagueVariant: true,
      guillotineMode: true,
      survivorMode: true,
    },
    take,
  })

  const results: Array<{ leagueId: string; ok: boolean; error?: string }> = []

  for (const l of leagues) {
    if (!isSpecialtyConcept(resolveSpecialtyConceptKey(l))) continue
    try {
      await dispatchSpecialtyAutomationTrigger({
        trigger: 'onScheduledPass',
        leagueId: l.id,
        season: l.season ?? season,
        week,
        source: 'cron_specialty_automation',
      })
      results.push({ leagueId: l.id, ok: true })
    } catch (e) {
      results.push({
        leagueId: l.id,
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      })
    }
  }

  return NextResponse.json({
    ok: true,
    season,
    week,
    processed: results.filter((r) => r.ok).length,
    failures: results.filter((r) => !r.ok).length,
    results,
  })
}
