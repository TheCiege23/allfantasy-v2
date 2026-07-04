import { prisma } from '@/lib/prisma'
import { callDecisionOS } from '../../adapter/transport'
import { isLiveReady } from '../../liveReadiness'
import { resolveActiveLeagueId } from '../../resolveActiveLeagueId'
import type { CommissionerErrorContract } from '../../contracts'
import type { ManagerIntelligenceClient } from './types'

/**
 * Phase 3.6 — Manager Intelligence's first real (gated) integration attempt,
 * following Mission Control's and League Health's established pattern
 * (see MISSION_CONTROL_COMPLETION_REPORT.md, LEAGUE_HEALTH_LIVE_INTEGRATION_REPORT.md).
 *
 * Unlike those two modules, `getManagerDirectory()` cannot honestly complete
 * *at all* today — verified field-by-field, not assumed. `ManagerDnaProfile`'s
 * required fields are `id`, `managerName`, `archetype`, `tenureSeasons`,
 * `engagementTrend`, `reliabilityScore`. Only `id` (managerId) and
 * `managerName` (resolved the same way Mission Control resolves it, via
 * `prisma.appUser`) have a real source:
 *
 * - `archetype`, `engagementTrend`, `reliabilityScore` have no analog anywhere
 *   in the currently-exposed Decision OS output (`ManagerBehavioralIntelligence`/
 *   `ManagerSummaryV1` — participationTier is a *frequency* tier, not a
 *   behavioral archetype; presenting it as one would misrepresent what the
 *   field actually measures). The one thing that conceptually matches
 *   "archetype" is Decision OS's own Phase 6.2 "Manager DNA / Identity"
 *   classifier (`lib/decision-os/phase6/dna/` on `g15-event-foundation` —
 *   its own `ManagerDnaProfile.primaryIdentity` enum, e.g. `serial_trader`/
 *   `committed_grinder`/`ghost_manager`, maps remarkably well onto this
 *   module's "Active Trader"/"Steady Operator"/etc. demo archetypes). That
 *   system genuinely exists, but was deliberately excluded from the Phase
 *   3.1 port manifest and has no exposed route today — porting it and
 *   adding a route would be introducing a new backend capability, which
 *   this phase's own constraints forbid. Flagged as the clear next
 *   capability-expansion candidate, not built here.
 * - `tenureSeasons` isn't a Decision OS concept at all (it's a roster-history
 *   fact), and there is no season-continuity query already established in
 *   this app's live.ts files to reuse the way `resolveActiveLeagueId`/name
 *   resolution were — inventing one now would be new business logic beyond
 *   this phase's scope, not a `live.ts` wiring task.
 *
 * The real calls below are still made and their results still used — proving
 * the pipeline (league resolution, the `/league/managers` call, batched name
 * resolution) actually works — but the method still returns the honest
 * "insufficient backend capability" error even on a fully successful call,
 * because the *directory* as `ManagerDnaProfile[]` cannot be honestly
 * constructed without archetype/engagementTrend/reliabilityScore/tenureSeasons.
 * This mirrors Mission Control's Phase 3.2 shape exactly, before Phase 3.3
 * closed its gap — real, tested, ready for the day Phase 6.2 is ported.
 */
function notYetIntegrated(): CommissionerErrorContract {
  return {
    category: 'upstream_unavailable',
    message: 'The live Decision OS backend is not yet integrated in this environment.',
    moduleId: 'managers',
    retryable: false,
    timestamp: new Date().toISOString(),
  }
}

/** A specific, honest degradation — the backend is reachable, but does not yet compute a manager DNA/archetype classification. */
function dnaClassificationUnavailable(): CommissionerErrorContract {
  return {
    category: 'upstream_unavailable',
    message: 'The Decision OS backend does not yet expose manager archetype, trend, or reliability classification for this directory.',
    moduleId: 'managers',
    retryable: false,
    timestamp: new Date().toISOString(),
  }
}

interface ManagerSummaryShape {
  managerId: string
}
interface LeagueManagersShape {
  data: ManagerSummaryShape[]
}

/** Batch-resolves manager display names — one query for all managers, not N+1. Same pattern as Mission Control's live.ts. */
async function resolveManagerDisplayNames(managerIds: string[]): Promise<Map<string, string>> {
  if (managerIds.length === 0) return new Map()
  const users = await prisma.appUser.findMany({
    where: { id: { in: managerIds } },
    select: { id: true, displayName: true, username: true },
  })
  const map = new Map<string, string>()
  for (const u of users) map.set(u.id, u.displayName ?? u.username)
  return map
}

export const liveManagerIntelligenceClient: ManagerIntelligenceClient = {
  async getManagerDirectory() {
    if (!(await isLiveReady('managers'))) {
      return { data: null, error: notYetIntegrated(), source: 'live', timestamp: new Date().toISOString() }
    }
    const timestamp = new Date().toISOString()
    const leagueId = await resolveActiveLeagueId()
    if (!leagueId) {
      return { data: null, error: notYetIntegrated(), source: 'live', timestamp }
    }

    const { data, error } = await callDecisionOS<LeagueManagersShape>(
      'managers',
      `/api/v1/intelligence/league/managers?leagueId=${encodeURIComponent(leagueId)}`,
    )
    if (error || !data) {
      return { data: null, error: error ?? notYetIntegrated(), source: 'live', timestamp }
    }

    // Proves the real pipeline works (league resolution, the batch managers
    // call, batched name resolution) even though the result is still
    // discarded below — nothing here is dead code once Phase 6.2's DNA
    // classifier is ported; completing this method becomes a small,
    // well-understood extension of what's already wired, not a rewrite.
    await resolveManagerDisplayNames(data.data.map((m) => m.managerId))

    return { data: null, error: dnaClassificationUnavailable(), source: 'live', timestamp }
  },
}
