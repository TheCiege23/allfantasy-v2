/**
 * Phase 6F — Smart discovery rails.
 *
 * Pure ranking / selection helpers that take a pool of leagues
 * (and the candidate's own profile) and return curated rails for the
 * Find League surface. Each rail has a strict cap and a minimum fit
 * threshold to keep results trustworthy.
 *
 * No I/O. Caller supplies the candidate pool fetched via
 * `lib/resume/snapshot/matchmaking-lookup` or future league-index
 * lookups.
 */

import { rankLeaguesForCandidate, scoreLeagueFit } from "./compatibility"
import { DISCOVERY_RAIL_CAPS } from "./weights"
import type {
  DiscoveryRail,
  DiscoveryRailKind,
  LeagueDescriptor,
  LeagueFitCandidate,
  LeagueRecommendation,
} from "./types"

const RAIL_META: Record<DiscoveryRailKind, { title: string; description: string }> = {
  best_fit_for_you: {
    title: "Best fit for you",
    description: "Leagues whose competitiveness, format, and difficulty match your profile.",
  },
  high_competition: {
    title: "High-competition leagues",
    description: "Top-of-bracket leagues seeking elite, verified players.",
  },
  commissioner_verified: {
    title: "Commissioner verified",
    description: "Led by commissioners with strong reliability and verification.",
  },
  rising_competitors: {
    title: "Rising competitors",
    description: "Active leagues attracting fast-improving managers.",
  },
  dynasty_experts: {
    title: "Dynasty experts",
    description: "Long-horizon leagues for seasoned dynasty players.",
  },
  tournament_specialists: {
    title: "Tournament specialists",
    description: "Bracket / playoff / best-ball formats with sharp competition.",
  },
}

function isHighCompetition(l: LeagueDescriptor): boolean {
  return (
    l.desiredCompetitiveness >= 0.75 ||
    (l.commissionerPreferences?.competitivenessMin ?? 0) >= 0.7 ||
    l.difficulty >= 7000
  )
}

function isCommissionerVerified(l: LeagueDescriptor): boolean {
  if (!l.commissionerVerified) return false
  if (l.commissionerCredibility == null) return false
  return l.commissionerCredibility >= 0.7
}

function isDynasty(l: LeagueDescriptor): boolean {
  const t = l.leagueType.toLowerCase()
  return t === "dynasty" || t === "keeper"
}

function isTournament(l: LeagueDescriptor): boolean {
  const t = l.leagueType.toLowerCase()
  return t === "best_ball" || t === "bestball" || t === "tournament" || t === "bracket"
}

function isRising(l: LeagueDescriptor): boolean {
  return (
    l.desiredActivity >= 0.6 &&
    l.openSeats != null &&
    l.openSeats > 0 &&
    !isHighCompetition(l)
  )
}

function buildRail(
  kind: DiscoveryRailKind,
  candidate: LeagueFitCandidate,
  leagues: ReadonlyArray<LeagueDescriptor>
): DiscoveryRail {
  const meta = RAIL_META[kind]
  const ranked = rankLeaguesForCandidate(
    candidate,
    leagues,
    DISCOVERY_RAIL_CAPS.perRailMax
  )
  const items: LeagueRecommendation[] = ranked
    .filter((r) => r.score.score >= DISCOVERY_RAIL_CAPS.minFitToInclude)
    .map((r) => ({ league: r.league, score: r.score, railKind: kind }))
  return { kind, title: meta.title, description: meta.description, items }
}

/**
 * Assemble all six rails from a single league pool. The candidate
 * pool is filtered per-rail with cheap predicates BEFORE scoring, so
 * scoring stays O(rail-size) rather than O(pool * 6).
 */
export function buildDiscoveryRails(
  candidate: LeagueFitCandidate,
  leagues: ReadonlyArray<LeagueDescriptor>
): DiscoveryRail[] {
  const pool = leagues.slice(0, DISCOVERY_RAIL_CAPS.candidatePoolMax)
  const rails: DiscoveryRail[] = []

  rails.push(buildRail("best_fit_for_you", candidate, pool))
  rails.push(buildRail("high_competition", candidate, pool.filter(isHighCompetition)))
  rails.push(
    buildRail("commissioner_verified", candidate, pool.filter(isCommissionerVerified))
  )
  rails.push(buildRail("rising_competitors", candidate, pool.filter(isRising)))
  rails.push(buildRail("dynasty_experts", candidate, pool.filter(isDynasty)))
  rails.push(buildRail("tournament_specialists", candidate, pool.filter(isTournament)))

  // Strip empty rails — nothing worse than a blank section.
  return rails.filter((r) => r.items.length > 0)
}

/** Convenience: top-level recommendations across rails. */
export function topRecommendations(
  candidate: LeagueFitCandidate,
  leagues: ReadonlyArray<LeagueDescriptor>,
  limit = 5
): LeagueRecommendation[] {
  const scored = leagues
    .map((l) => ({ league: l, score: scoreLeagueFit(candidate, l) }))
    .filter((r) => !r.score.hardRejected && r.score.score >= DISCOVERY_RAIL_CAPS.minFitToInclude)
  scored.sort((a, b) => b.score.score - a.score.score)
  return scored.slice(0, Math.max(1, limit)).map((r) => ({
    league: r.league,
    score: r.score,
    railKind: "best_fit_for_you",
  }))
}
