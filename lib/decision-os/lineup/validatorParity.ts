/**
 * Decision OS — validator parity for `manager.lineup.set` (Slice 1, Ticket #5).
 *
 * Compares the two legacy validators (now composed behind the Rule Framework) on a normalized
 * category vocabulary. They are COMPLEMENTARY — they share some categories and each covers some the
 * other doesn't — so parity here means "do they agree where they overlap", and retirement is only
 * safe if neither has unique coverage (it doesn't, today). Pure; no I/O.
 */
import type { RuleVerdict } from '@/lib/decision-os/core/decision'

/** Map each validator's raw code → a normalized legality category. */
const CATEGORY: Record<string, string> = {
  // shared (both validators check these)
  starter_position_ineligible: 'position_ineligible',
  duplicate_player: 'duplicate',
  bench_slot_overflow: 'section_overflow',
  ir_slot_overflow: 'section_overflow',
  starter_slot_overflow: 'section_overflow',
  section_overflow: 'section_overflow',
  roster_over_max: 'roster_total',
  roster_total_over_limit: 'roster_total',
  // redraft-only coverage
  missing_required_position: 'required_slot',
  missing_starter_slot: 'required_slot',
  illegal_lineup_slot: 'move_validity',
  invalid_lineup_move: 'move_validity',
  lineup_move_source_mismatch: 'move_validity',
  player_not_on_roster: 'move_validity',
  starter_ineligible_injury: 'status',
  starter_injury_risk: 'status',
  starter_on_bye: 'status',
  locked_player_move: 'lock',
  // canonical-only coverage
  ir_ineligible_status: 'ir_eligibility',
  taxi_disabled: 'taxi',
  taxi_non_rookie_disallowed: 'taxi',
  taxi_too_experienced: 'taxi',
  devy_ineligible: 'devy',
  lifecycle_locked: 'lifecycle',
  league_lock_all: 'lifecycle',
  concept_lineup_frozen: 'lifecycle',
  concept_ir_blocked: 'lifecycle',
  concept_devy_blocked: 'lifecycle',
}

/** Categories both validators are expected to cover (the parity scope). */
const SHARED_CATEGORIES = new Set(['position_ineligible', 'duplicate', 'section_overflow', 'roster_total'])

function codeFromRule(rule: string): string {
  const m = /^lineup\.(?:legality|canonical)\.(.+)$/.exec(rule)
  return m ? m[1] : rule
}

function illegalCategories(verdicts: RuleVerdict[]): Set<string> {
  const out = new Set<string>()
  for (const v of verdicts) {
    if (v.verdict !== 'illegal') continue
    const code = codeFromRule(v.rule)
    out.add(CATEGORY[code] ?? code)
  }
  return out
}

export interface ValidatorParity {
  /** Do the validators agree on the categories they BOTH cover? */
  agreeOnSharedScope: boolean
  /** Shared categories where the two validators disagree (a real parity concern). */
  sharedDisagreements: string[]
  /** Categories only one validator covers (expected — they are complementary). */
  coverageDifferences: string[]
  diffs: string[]
  /** Safe to retire one validator only if there are no disagreements AND no unique coverage. */
  retirementSafe: boolean
  reason: 'equivalent' | 'complementary_coverage' | 'shared_disagreement' | 'canonical_validator_error'
  canonicalError?: string
}

export function compareValidatorParity(
  primary: RuleVerdict[],
  canonical: RuleVerdict[],
  canonicalError?: string,
): ValidatorParity {
  const p = illegalCategories(primary)
  const c = illegalCategories(canonical)

  const sharedDisagreements: string[] = []
  for (const cat of SHARED_CATEGORIES) {
    if (p.has(cat) !== c.has(cat)) sharedDisagreements.push(cat)
  }
  const coverageDifferences: string[] = []
  for (const cat of new Set([...p, ...c])) {
    if (SHARED_CATEGORIES.has(cat)) continue
    if (p.has(cat) !== c.has(cat)) coverageDifferences.push(cat)
  }

  const diffs = [
    ...sharedDisagreements.map((cat) => `shared category '${cat}' differs (primary=${p.has(cat)}, canonical=${c.has(cat)})`),
    ...coverageDifferences.map((cat) => `category '${cat}' covered by only one validator`),
  ]

  const agreeOnSharedScope = sharedDisagreements.length === 0
  const retirementSafe = agreeOnSharedScope && coverageDifferences.length === 0 && !canonicalError
  const reason: ValidatorParity['reason'] = canonicalError
    ? 'canonical_validator_error'
    : !agreeOnSharedScope
      ? 'shared_disagreement'
      : coverageDifferences.length
        ? 'complementary_coverage'
        : 'equivalent'

  return { agreeOnSharedScope, sharedDisagreements, coverageDifferences, diffs, retirementSafe, reason, canonicalError }
}
