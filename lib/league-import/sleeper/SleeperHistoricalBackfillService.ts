import { runDynastyBackfill } from '@/lib/dynasty-import'
import { buildLeagueGraph } from '@/lib/league-intelligence-graph'
import { rebuildHallOfFame } from '@/lib/rankings-engine/hall-of-fame'

export interface SleeperHistoricalBackfillSummary {
  attempted: boolean
  skipped: boolean
  reason?: string
  backfill?: {
    success: boolean
    status: string
    seasonsDiscovered: number
    seasonsImported: number
    seasonsSkipped: number
    tradesPersisted: number
    failureMessage?: string
  }
  graph?: {
    refreshed: boolean
    nodeCount?: number
    edgeCount?: number
    snapshotId?: string
    error?: string
  }
  hallOfFame?: {
    refreshed: boolean
    count?: number
    error?: string
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return 'Unknown error'
}

/**
 * Reuse the existing dynasty backfill pipeline after a Sleeper league import so
 * standings/trades history actually lands in the core models used by the app.
 */
export async function syncSleeperHistoricalBackfillAfterImport(args: {
  leagueId: string
  isDynasty: boolean
}): Promise<SleeperHistoricalBackfillSummary> {
  if (!args.isDynasty) {
    return {
      attempted: false,
      skipped: true,
      reason: 'Historical auto-backfill currently runs only for Sleeper dynasty leagues.',
    }
  }

  try {
    const backfill = await runDynastyBackfill({
      leagueId: args.leagueId,
      skipExistingSeasons: true,
    })

    const summary: SleeperHistoricalBackfillSummary = {
      attempted: true,
      skipped: false,
      backfill: {
        success: backfill.success,
        status: backfill.status,
        seasonsDiscovered: backfill.seasonsDiscovered,
        seasonsImported: backfill.seasonsImported,
        seasonsSkipped: backfill.seasonsSkipped,
        tradesPersisted: backfill.tradesPersisted,
        failureMessage: backfill.failureMessage,
      },
    }

    const shouldRefreshDerivedData =
      backfill.seasonsImported > 0 || backfill.seasonsSkipped > 0

    if (!shouldRefreshDerivedData) {
      summary.graph = {
        refreshed: false,
        error: 'No historical seasons were imported or detected, so graph refresh was skipped.',
      }
      summary.hallOfFame = {
        refreshed: false,
        error: 'No historical seasons were imported or detected, so hall of fame refresh was skipped.',
      }
      return summary
    }

    try {
      const graph = await buildLeagueGraph({
        leagueId: args.leagueId,
        season: null,
        includeTrades: true,
        includeRivalries: true,
      })
      summary.graph = {
        refreshed: true,
        nodeCount: graph.nodeCount,
        edgeCount: graph.edgeCount,
        snapshotId: graph.snapshotId,
      }
    } catch (error) {
      summary.graph = {
        refreshed: false,
        error: getErrorMessage(error),
      }
    }

    try {
      const hallOfFame = await rebuildHallOfFame({ leagueId: args.leagueId })
      summary.hallOfFame = {
        refreshed: true,
        count: hallOfFame.count,
      }
    } catch (error) {
      summary.hallOfFame = {
        refreshed: false,
        error: getErrorMessage(error),
      }
    }

    return summary
  } catch (error) {
    return {
      attempted: true,
      skipped: false,
      backfill: {
        success: false,
        status: 'failed',
        seasonsDiscovered: 0,
        seasonsImported: 0,
        seasonsSkipped: 0,
        tradesPersisted: 0,
        failureMessage: getErrorMessage(error),
      },
      graph: {
        refreshed: false,
      },
      hallOfFame: {
        refreshed: false,
      },
    }
  }
}
