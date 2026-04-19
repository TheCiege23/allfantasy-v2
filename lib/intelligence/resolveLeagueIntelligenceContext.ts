import 'server-only'

import type { LeagueToolAccessErrorCode } from '@/lib/ai-tools/league-tool-context-types'
import { resolveNormalizedLeagueContext } from '@/lib/league-context-engine'
import type { LeagueSourceKind, ResolvedLeagueIntelligenceContext } from '@/lib/intelligence/types'

function toSourceKind(sourceType: string): LeagueSourceKind {
  if (sourceType === 'native_af') return 'native_af'
  if (sourceType.startsWith('imported')) return 'imported'
  return 'unknown'
}

/**
 * Validates membership and returns dashboard/intelligence league context.
 * Delegates to the League Context Engine for a single normalized contract.
 */
export async function resolveLeagueIntelligenceContext(
  userId: string,
  leagueId: string | null | undefined,
): Promise<
  { ok: true; context: ResolvedLeagueIntelligenceContext } | { ok: false; code: LeagueToolAccessErrorCode }
> {
  const trimmed = leagueId?.trim()
  if (!trimmed) {
    return { ok: false, code: 'MISSING_LEAGUE_CONTEXT' }
  }

  const engine = await resolveNormalizedLeagueContext({ userId, leagueId: trimmed })
  if (!engine.ok) {
    return { ok: false, code: engine.code }
  }

  const n = engine.context
  const sk = toSourceKind(n.sourceType)

  const context: ResolvedLeagueIntelligenceContext = {
    leagueId: n.leagueId,
    userId: n.userId,
    leagueName: n.leagueName,
    sport: n.sport,
    platform: n.platform,
    platformLeagueId: n.platformLeagueId,
    sourceKind: sk,
    season: n.season,
    leagueStatus: n.leagueStatus,
    leagueTimezone: n.timezone,
    membershipValidated: true,
    userTeamId: n.team?.teamId ?? null,
    userTeamExternalId: n.team?.externalId ?? null,
    userTeamName: n.team?.teamName ?? null,
    scoringSettings: { raw: n.scoring.rawSources.leagueScoringColumn ?? null },
    rosterSettings: {
      rosterSize: n.roster.rosterSize,
      starters: n.roster.starters,
      irSlots: n.roster.irSlots,
      taxiSlots: n.roster.taxiSlots,
    },
    leagueRules: {
      leagueType: n.leagueType,
      isDynasty: n.flags.isDynasty,
      waiverType: n.waiver.waiverType,
      waiverBudget: n.waiver.waiverBudget,
      tradeReviewHours: n.trade.tradeReviewHours,
    },
    importedMappingInfo:
      sk === 'imported'
        ? {
            importedAt: n.importHealth.importedAt,
            syncStatus: n.importHealth.syncStatus,
            lastSyncedAt: n.importHealth.lastSyncedAt,
          }
        : null,
    normalizedLeagueContext: n,
  }

  return { ok: true, context }
}
