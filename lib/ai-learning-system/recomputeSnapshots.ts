import 'server-only'

import { Prisma } from '@prisma/client'

import { prisma } from '@/lib/prisma'
import { SUPPORTED_SPORTS } from '@/lib/sport-scope'
import type {
  AfLearningExplainV1,
  AppLearningFeaturesV1,
  LeagueLearningFeaturesV1,
  UserLearningFeaturesV1,
} from '@/lib/ai-learning-system/types'

const DEFAULT_WINDOW_DAYS = Number(process.env.AF_LEARNING_RECOMPUTE_WINDOW_DAYS ?? 90) || 90

/** Minimum raw events before we publish non-zero confidence at app level. */
const APP_MIN_EVENTS = 25
/** Minimum league-scoped events before league snapshot is trusted. */
const LEAGUE_MIN_EVENTS = 6
/** Minimum user events before user profile is trusted. */
const USER_MIN_EVENTS = 4

function confidenceFromSample(sampleSize: number, minForFull: number): number {
  if (sampleSize <= 0) return 0
  return Math.min(1, sampleSize / (minForFull * 2))
}

function platformActivityIndex(eventsPerDay: number): number {
  return Math.min(1, Math.log1p(Math.max(0, eventsPerDay)) / Math.log1p(10))
}

function lineupTier(lineupPerWeek: number): UserLearningFeaturesV1['managerLineupActivityTier'] {
  if (lineupPerWeek < 0.25) return 'low'
  if (lineupPerWeek < 1.5) return 'medium'
  return 'high'
}

function buildExplain(partial: Omit<AfLearningExplainV1, 'version'>): AfLearningExplainV1 {
  return { version: 1, ...partial }
}

function pickCount(c: Record<string, number>, k: string): number {
  return c[k] ?? 0
}

/** Two-party trade outcomes emit one row per manager; platform rate uses pair normalization. */
function appTradeResolvedAcceptRate(counts: Record<string, number>): number | null {
  const ta = pickCount(counts, 'trade_accepted')
  const tr = pickCount(counts, 'trade_rejected')
  const tv = pickCount(counts, 'trade_vetoed')
  const pairs = ta / 2 + tr / 2 + tv / 2
  if (pairs < 1) return null
  return (ta / 2) / pairs
}

function userTradeResolutionAcceptRate(counts: Record<string, number>): number | null {
  const ta = pickCount(counts, 'trade_accepted')
  const tr = pickCount(counts, 'trade_rejected')
  const tv = pickCount(counts, 'trade_vetoed')
  const d = ta + tr + tv
  if (d < 1) return null
  return ta / d
}

export type RecomputeAfLearningResult = {
  windowDays: number
  appSports: number
  leagues: number
  users: number
  cutoff: string
}

/**
 * Idempotent batch recompute: rebuilds all snapshot tables from `af_learning_events`
 * for the rolling window. Safe to run on a schedule or after backfill.
 */
export async function recomputeAfLearningSnapshots(
  options?: { windowDays?: number },
): Promise<RecomputeAfLearningResult> {
  const windowDays = Math.max(7, Math.min(365, options?.windowDays ?? DEFAULT_WINDOW_DAYS))
  const cutoff = new Date(Date.now() - windowDays * 86_400_000)

  const sportRows = await prisma.$queryRaw<
    Array<{ sport: string; event_type: string; c: bigint }>
  >(
    Prisma.sql`
      SELECT sport::text AS sport, event_type::text AS event_type, COUNT(*)::bigint AS c
      FROM af_learning_events
      WHERE created_at >= ${cutoff}
      GROUP BY sport, event_type
    `,
  )

  const sportTotals = await prisma.$queryRaw<
    Array<{ sport: string; total: bigint; leagues: bigint; users: bigint }>
  >(
    Prisma.sql`
      SELECT
        sport::text AS sport,
        COUNT(*)::bigint AS total,
        COUNT(DISTINCT league_id)::bigint AS leagues,
        COUNT(DISTINCT user_id)::bigint AS users
      FROM af_learning_events
      WHERE created_at >= ${cutoff}
      GROUP BY sport
    `,
  )

  const eventCountsBySport = new Map<string, Record<string, number>>()
  for (const row of sportRows) {
    const s = row.sport
    const m = eventCountsBySport.get(s) ?? {}
    m[row.event_type] = Number(row.c)
    eventCountsBySport.set(s, m)
  }

  const totalsBySport = new Map<string, { total: number; leagues: number; users: number }>()
  for (const row of sportTotals) {
    totalsBySport.set(row.sport, {
      total: Number(row.total),
      leagues: Number(row.leagues),
      users: Number(row.users),
    })
  }

  const avgEventsPerDayBySport = new Map<string, number>()
  for (const sport of SUPPORTED_SPORTS) {
    const t = totalsBySport.get(sport)?.total ?? 0
    avgEventsPerDayBySport.set(sport, t / windowDays)
  }

  let appCount = 0
  for (const sport of SUPPORTED_SPORTS) {
    const counts = eventCountsBySport.get(sport) ?? {}
    const totals = totalsBySport.get(sport) ?? { total: 0, leagues: 0, users: 0 }
    const totalEvents = totals.total
    const eventsPerDay = totalEvents / windowDays
    const lineupEvents = counts['lineup_change'] ?? 0
    const lineupShare = totalEvents > 0 ? lineupEvents / totalEvents : null

    const features: AppLearningFeaturesV1 = {
      version: 1,
      windowDays,
      eventCounts: counts,
      totalEvents,
      distinctLeagues: totals.leagues,
      distinctUsers: totals.users,
      eventsPerDay,
      platformActivityIndex: platformActivityIndex(eventsPerDay),
      lineupChangeShare: lineupShare,
      tradeResolvedAcceptRate: appTradeResolvedAcceptRate(counts),
    }

    const conf = confidenceFromSample(totalEvents, APP_MIN_EVENTS)
    const explain = buildExplain({
      topFactors: [
        { key: 'totalEvents', value: totalEvents, detail: 'All learning events in window for this sport.' },
        { key: 'distinctLeagues', value: totals.leagues, detail: 'Leagues that produced at least one event.' },
        { key: 'distinctUsers', value: totals.users, detail: 'Users with at least one event.' },
        { key: 'platformActivityIndex', value: features.platformActivityIndex, detail: 'Log-scaled activity rate.' },
        ...(features.tradeResolvedAcceptRate != null
          ? [
              {
                key: 'tradeResolvedAcceptRate',
                value: features.tradeResolvedAcceptRate,
                detail: 'Pair-normalized accepted share among resolved trade outcomes.',
              },
            ]
          : []),
      ],
      sampleSize: totalEvents,
      windowDays,
      computedAt: new Date().toISOString(),
      sources: Object.keys(counts),
      notes:
        totalEvents < APP_MIN_EVENTS
          ? ['Low sample: confidence capped; aggregates still deterministic.']
          : undefined,
    })

    await prisma.afAppLearningSnapshot.upsert({
      where: { sport },
      create: {
        sport,
        features: features as object,
        explain: explain as object,
        confidence: conf,
        sampleSize: totalEvents,
        windowDays,
      },
      update: {
        features: features as object,
        explain: explain as object,
        confidence: conf,
        sampleSize: totalEvents,
        windowDays,
        computedAt: new Date(),
      },
    })
    appCount += 1
  }

  const leaguePivot = await prisma.$queryRaw<
    Array<{ league_id: string; sport: string; event_type: string; c: bigint }>
  >(
    Prisma.sql`
      SELECT league_id::text AS league_id, sport::text AS sport, event_type::text AS event_type, COUNT(*)::bigint AS c
      FROM af_learning_events
      WHERE created_at >= ${cutoff} AND league_id IS NOT NULL
      GROUP BY league_id, sport, event_type
    `,
  )

  const leagueBuckets = new Map<string, { sport: string; counts: Record<string, number> }>()
  for (const row of leaguePivot) {
    const prev = leagueBuckets.get(row.league_id) ?? { sport: row.sport, counts: {} as Record<string, number> }
    prev.sport = row.sport
    prev.counts[row.event_type] = Number(row.c)
    leagueBuckets.set(row.league_id, prev)
  }

  const leagueCreates: Prisma.AfLeagueLearningSnapshotCreateManyInput[] = []
  for (const [leagueId, { sport, counts }] of leagueBuckets) {
    const totalEvents = Object.values(counts).reduce((a, b) => a + b, 0)
    if (totalEvents < LEAGUE_MIN_EVENTS) continue

    const lineupChanges = pickCount(counts, 'lineup_change')
    const appAvg = avgEventsPerDayBySport.get(sport) ?? 0
    const leaguePerDay = totalEvents / windowDays
    const ratio = appAvg > 1e-6 ? leaguePerDay / appAvg : null

    const perWeek = (n: number) => (n / windowDays) * 7
    const waiverN =
      pickCount(counts, 'waiver_claim_submitted') + pickCount(counts, 'waiver_claim_awarded')

    const features: LeagueLearningFeaturesV1 = {
      version: 1,
      windowDays,
      eventCounts: counts,
      totalEvents,
      lineupChangesPerWeek: perWeek(lineupChanges),
      eventsPerWeek: perWeek(totalEvents),
      activityVsAppAverage: ratio,
      leagueActivityIndex: platformActivityIndex(leaguePerDay),
      tradeResolvedAcceptRate: appTradeResolvedAcceptRate(counts),
      waiverIntensityPerWeek: perWeek(waiverN),
    }

    const explain = buildExplain({
      topFactors: [
        { key: 'totalEvents', value: totalEvents, detail: 'League-scoped events in window.' },
        { key: 'lineupChangesPerWeek', value: features.lineupChangesPerWeek, detail: 'Derived from lineup_change events.' },
        { key: 'activityVsAppAverage', value: ratio ?? 'n/a', detail: 'Compared to same-sport app average per day.' },
        ...(features.tradeResolvedAcceptRate != null
          ? [
              {
                key: 'tradeResolvedAcceptRate',
                value: features.tradeResolvedAcceptRate,
                detail: 'Pair-normalized among trade outcomes in this league.',
              },
            ]
          : []),
      ],
      sampleSize: totalEvents,
      windowDays,
      computedAt: new Date().toISOString(),
      sources: Object.keys(counts),
    })

    leagueCreates.push({
      leagueId,
      sport,
      features: features as object,
      explain: explain as object,
      confidence: confidenceFromSample(totalEvents, LEAGUE_MIN_EVENTS),
      sampleSize: totalEvents,
      windowDays,
    })
  }

  await prisma.$transaction(async (tx) => {
    await tx.afLeagueLearningSnapshot.deleteMany({})
    const chunk = 500
    for (let i = 0; i < leagueCreates.length; i += chunk) {
      await tx.afLeagueLearningSnapshot.createMany({ data: leagueCreates.slice(i, i + chunk) })
    }
  })
  const leagueUpserts = leagueCreates.length

  const userPivot = await prisma.$queryRaw<
    Array<{ user_id: string; event_type: string; c: bigint }>
  >(
    Prisma.sql`
      SELECT user_id::text AS user_id, event_type::text AS event_type, COUNT(*)::bigint AS c
      FROM af_learning_events
      WHERE created_at >= ${cutoff} AND user_id IS NOT NULL
      GROUP BY user_id, event_type
    `,
  )

  const userBuckets = new Map<string, Record<string, number>>()
  for (const row of userPivot) {
    const m = userBuckets.get(row.user_id) ?? {}
    m[row.event_type] = Number(row.c)
    userBuckets.set(row.user_id, m)
  }

  const userCreates: Prisma.AfUserLearningProfileCreateManyInput[] = []
  for (const [uid, counts] of userBuckets) {
    const totalEvents = Object.values(counts).reduce((a, b) => a + b, 0)
    if (totalEvents < USER_MIN_EVENTS) continue

    const lineupChanges = pickCount(counts, 'lineup_change')
    const perWeek = (n: number) => (n / windowDays) * 7
    const lineupPerWeek = perWeek(lineupChanges)
    const tier = lineupTier(lineupPerWeek)
    const propensity = Math.min(1, lineupPerWeek / 4)

    const tradeProposals = pickCount(counts, 'trade_proposal_created')
    const waiverN = pickCount(counts, 'waiver_claim_submitted') + pickCount(counts, 'waiver_claim_awarded')
    const draftPicks = pickCount(counts, 'draft_pick_made')

    const features: UserLearningFeaturesV1 = {
      version: 1,
      windowDays,
      eventCounts: counts,
      totalEvents,
      lineupChangesPerWeek: lineupPerWeek,
      managerLineupActivityTier: tier,
      lineupEditPropensity: propensity,
      tradeProposalsInWindow: tradeProposals,
      userTradeResolutionAcceptRate: userTradeResolutionAcceptRate(counts),
      userTradeAggressionScore: Math.min(1, tradeProposals / 12),
      waiverClaimEventsInWindow: waiverN,
      userWaiverAggressionScore: Math.min(1, waiverN / 24),
      draftPicksInWindow: draftPicks,
      userDraftActivityScore: Math.min(1, draftPicks / 40),
    }

    const explain = buildExplain({
      topFactors: [
        { key: 'lineup_change', value: lineupChanges, detail: 'Starter set changes recorded.' },
        { key: 'managerLineupActivityTier', value: tier, detail: 'From lineup changes per week.' },
        { key: 'lineupEditPropensity', value: propensity, detail: 'Normalized 0–1 (soft signal).' },
        { key: 'tradeProposalsInWindow', value: tradeProposals, detail: 'trade_proposal_created events.' },
        ...(features.userTradeResolutionAcceptRate != null
          ? [
              {
                key: 'userTradeResolutionAcceptRate',
                value: features.userTradeResolutionAcceptRate,
                detail: 'Accepted share among this user’s trade outcome events.',
              },
            ]
          : []),
        { key: 'waiverClaimEventsInWindow', value: waiverN, detail: 'Submitted + awarded waiver claims.' },
        { key: 'draftPicksInWindow', value: draftPicks, detail: 'Draft pick events (live + mock).' },
      ],
      sampleSize: totalEvents,
      windowDays,
      computedAt: new Date().toISOString(),
      sources: Object.keys(counts),
      notes: [
        'User learning is a soft personalization layer; it does not override injuries, locks, or rules.',
      ],
    })

    userCreates.push({
      userId: uid,
      features: features as object,
      explain: explain as object,
      confidence: confidenceFromSample(totalEvents, USER_MIN_EVENTS),
      sampleSize: totalEvents,
      windowDays,
    })
  }

  await prisma.$transaction(async (tx) => {
    await tx.afUserLearningProfile.deleteMany({})
    const chunk = 500
    for (let i = 0; i < userCreates.length; i += chunk) {
      await tx.afUserLearningProfile.createMany({ data: userCreates.slice(i, i + chunk) })
    }
  })
  const userUpserts = userCreates.length

  return {
    windowDays,
    appSports: appCount,
    leagues: leagueUpserts,
    users: userUpserts,
    cutoff: cutoff.toISOString(),
  }
}
