/**
 * Fantasy OS Suite — Phase V8.1: evidence integrity checker (engineering-only, Part 5).
 *
 * Pure checks over the persisted corpus. Engineering diagnostics only — never customer-facing. Surfaces
 * problems for review; it does not repair or tune anything.
 */
import type { PersistedLeagueEvidence, PersistedPortfolio } from './evidenceStore'

export type IntegrityCode =
  | 'duplicate-league'
  | 'orphan-league'
  | 'broken-league-chain'
  | 'incomplete-roster'
  | 'transaction-inconsistency'
  | 'historical-continuity-gap'

export type IntegrityFinding = {
  code: IntegrityCode
  leagueReference?: string
  detail: string
}

export function checkEvidenceIntegrity(
  leagues: PersistedLeagueEvidence[],
  portfolios: PersistedPortfolio[],
): IntegrityFinding[] {
  const findings: IntegrityFinding[] = []
  const byRef = new Map<string, PersistedLeagueEvidence>()
  for (const l of leagues) {
    if (byRef.has(l.leagueReference)) {
      findings.push({ code: 'duplicate-league', leagueReference: l.leagueReference, detail: 'league reference persisted more than once' })
    }
    byRef.set(l.leagueReference, l)
  }

  // Orphan detection: a PERSISTED league that no portfolio references (a league with no owner in the
  // corpus). This is genuine corruption — distinct from "discovered-but-not-yet-imported", which is
  // expected under bounded/incremental import and is NOT flagged.
  const referenced = new Set<string>()
  for (const p of portfolios) for (const ref of p.leagueRefs) referenced.add(ref)
  for (const l of byRef.values()) {
    if (!referenced.has(l.leagueReference)) {
      findings.push({ code: 'orphan-league', leagueReference: l.leagueReference, detail: 'persisted league is referenced by no portfolio' })
    }
  }

  for (const l of byRef.values()) {
    // Broken chain: a prior-season reference not persisted. On a COMPLETE import this is a true break;
    // on a bounded/partial import it reflects the un-imported prior season (a coverage gap, expected).
    if (l.previousLeagueRef && !byRef.has(l.previousLeagueRef)) {
      findings.push({ code: 'broken-league-chain', leagueReference: l.leagueReference, detail: `previous-league ${l.previousLeagueRef} is not persisted (true break on a full import; a coverage gap on a partial one)` })
    }
    // Incomplete roster: facts were imported but the roster is empty/degenerate.
    if (l.facts && (l.facts.numTeams <= 0 || l.facts.activeManagers <= 0)) {
      findings.push({ code: 'incomplete-roster', leagueReference: l.leagueReference, detail: `numTeams=${l.facts.numTeams} activeManagers=${l.facts.activeManagers}` })
    }
    // Transaction consistency: total must cover trades + waiver claims.
    if (l.facts && l.facts.totalTransactions < l.facts.totalTrades + l.facts.totalWaiverClaims) {
      findings.push({ code: 'transaction-inconsistency', leagueReference: l.leagueReference, detail: `totalTransactions=${l.facts.totalTransactions} < trades(${l.facts.totalTrades})+waivers(${l.facts.totalWaiverClaims})` })
    }
  }

  // Historical-continuity gap: a chain whose linked seasons are not consecutive years.
  for (const l of byRef.values()) {
    if (l.previousLeagueRef && byRef.has(l.previousLeagueRef)) {
      const prev = byRef.get(l.previousLeagueRef)!
      const gap = Number(l.season) - Number(prev.season)
      if (Number.isFinite(gap) && gap !== 1) {
        findings.push({ code: 'historical-continuity-gap', leagueReference: l.leagueReference, detail: `season ${prev.season} → ${l.season} is not consecutive (gap ${gap})` })
      }
    }
  }

  return findings
}
