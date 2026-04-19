import 'server-only'

import { buildAiTimeContextPayload } from '@/lib/time-engine/userContext'
import { estimateNextWaiversProcessUTC } from '@/lib/time-engine/estimateWaiverRun'
import type { FantasyTimeEngineExtras } from '@/lib/time-engine/fantasyTimePayload'
import { getServerNowISO, getServerNowUTC } from '@/lib/time-engine/serverClock'
import { computeIntelligencePlatformHealth } from '@/lib/intelligence/computePlatformHealth'
import { resolveLeagueIntelligenceContext } from '@/lib/intelligence/resolveLeagueIntelligenceContext'
import type { IntelligenceSnapshot } from '@/lib/intelligence/types'

/**
 * Single bundle for dashboard + AI tools: authoritative time (UTC + user TZ), platform health,
 * and optional validated league context.
 */
export async function buildIntelligenceSnapshot(args: {
  userId: string
  leagueId?: string | null
}): Promise<IntelligenceSnapshot> {
  const leagueResult = args.leagueId?.trim()
    ? await resolveLeagueIntelligenceContext(args.userId, args.leagueId)
    : null

  let timeExtras: FantasyTimeEngineExtras | undefined
  if (leagueResult?.ok) {
    const n = leagueResult.context.normalizedLeagueContext
    const nextWaiver = estimateNextWaiversProcessUTC({
      leagueTimezone: n.timezone,
      waiverProcessTime: n.waiver.waiverProcessTime,
      serverNow: getServerNowUTC(),
    })
    timeExtras = {
      sportHint: n.sport,
      waiversProcessAt: nextWaiver?.toISOString() ?? null,
    }
  }

  const [time, health] = await Promise.all([
    buildAiTimeContextPayload(args.userId, timeExtras),
    computeIntelligencePlatformHealth(),
  ])

  let league: IntelligenceSnapshot['league'] = null
  let leagueError: IntelligenceSnapshot['leagueError'] = null

  if (leagueResult) {
    if (leagueResult.ok) {
      league = leagueResult.context
    } else {
      leagueError = leagueResult.code
    }
  }

  return {
    ok: true,
    schemaVersion: 1,
    serverTimeUtc: getServerNowISO(),
    time,
    health,
    league,
    leagueError,
  }
}
