import { NextRequest, NextResponse } from 'next/server'
import { requireCronAuth } from '../_auth'
import { prisma } from '@/lib/prisma'
import { executeC2CPromotion } from '@/lib/merged-devy-c2c/promotion/C2CPromotionService'
import { getC2CConfig } from '@/lib/merged-devy-c2c/C2CLeagueConfig'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * C2C promotion auto-scanner. Finds devyRights in PROMOTION_ELIGIBLE state
 * with a mapped pro player id, and — for leagues configured with an
 * automatic promotion timing — executes the promotion. Leagues configured
 * for manager_choice remain manual.
 *
 * Upstream data pipelines (NFL/NBA draft ingest) are responsible for
 * transitioning rights into PROMOTION_ELIGIBLE and setting promotedProPlayerId.
 * This cron is the orchestration layer that closes the loop when the league
 * wants it automated.
 */
export async function GET(req: NextRequest) {
  if (!requireCronAuth(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }
  return run()
}

export async function POST(req: NextRequest) {
  if (!requireCronAuth(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }
  return run()
}

const AUTO_TIMINGS = new Set(['auto_on_declaration', 'auto_on_pro_draft', 'auto'])

async function run() {
  const startedAt = new Date()
  const candidates = await prisma.devyRights.findMany({
    where: {
      state: 'PROMOTION_ELIGIBLE',
      promotedProPlayerId: { not: null },
    },
    select: { id: true, leagueId: true, promotedProPlayerId: true },
    take: 1000,
  })

  const results: Array<{ rightsId: string; ok: boolean; reason?: string }> = []
  const configCache = new Map<string, Awaited<ReturnType<typeof getC2CConfig>>>()

  for (const right of candidates) {
    try {
      let cfg = configCache.get(right.leagueId)
      if (cfg === undefined) {
        cfg = await getC2CConfig(right.leagueId)
        configCache.set(right.leagueId, cfg)
      }
      if (!cfg) {
        results.push({ rightsId: right.id, ok: false, reason: 'not_c2c_league' })
        continue
      }
      if (!AUTO_TIMINGS.has(cfg.promotionTiming)) {
        results.push({ rightsId: right.id, ok: false, reason: 'manual_timing' })
        continue
      }
      const exec = await executeC2CPromotion({
        rightsId: right.id,
        promotedProPlayerId: right.promotedProPlayerId as string,
        addToRoster: true,
      })
      results.push({ rightsId: right.id, ok: exec.ok, reason: exec.error })
    } catch (err) {
      results.push({
        rightsId: right.id,
        ok: false,
        reason: err instanceof Error ? err.message : 'unknown',
      })
    }
  }

  return NextResponse.json({
    ok: true,
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    scanned: candidates.length,
    promoted: results.filter((r) => r.ok).length,
    results,
  })
}
