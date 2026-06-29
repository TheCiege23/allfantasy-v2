/**
 * Decision OS — shadow runner for `manager.lineup.set` (Slice 1 integration).
 *
 * Runs the Decision OS lineup path BESIDE the legacy path, compares parity, logs status, and NEVER
 * throws or affects the legacy response. Reuses the already-computed legacy summary as the
 * recommender (no second computeLineupActionsForUser call). Gated by DECISION_OS_LINEUP_SHADOW.
 */
import type { LineupActionSummaryPayload } from '@/lib/lineup-actions/types'
import type { LineupValidationContext } from '@/lib/roster-lineup-engine/types'
import type { RuleVerdict } from '@/lib/decision-os/core/decision'
import { emitShadowParity, emitValidatorParity } from '@/lib/decision-os/core/parity'
import { shouldRunShadow } from '@/lib/decision-os/core/shadow'
import { runLineupSetDecision, type LineupParityResult, type LineupWorld, type RunLineupSetInput } from './index'
import { defaultLineupRuleDeps, evaluateLineupRulesWithParity, type LineupRuleContext, type LineupRuleDeps } from './rules'
import type { ValidatorParity } from './validatorParity'
import { loadLineupSetInputs, loadCanonicalValidatorContext } from './loader'
import { buildProductionCanonicalValidatorDep } from './deps'

export function shouldRunLineupShadow(env: NodeJS.ProcessEnv = process.env): boolean {
  return shouldRunShadow('DECISION_OS_LINEUP_SHADOW', env)
}

export interface LineupShadowResult {
  ran: boolean
  leagueId: string
  parity?: LineupParityResult
  /** The SECOND-validator parity (canonical vs primary), when the canonical context was available. */
  validatorParity?: ValidatorParity
  error?: string
}

export interface LineupShadowDeps {
  loadInputs: (userId: string, leagueId: string) => Promise<RunLineupSetInput | null>
  ruleDeps: LineupRuleDeps
  newId?: () => string
  /**
   * Route-seam loader for the canonical validator context (template + league flags). When provided
   * and it returns a context, the shadow ALSO runs validator parity (primary vs canonical). When
   * absent or it returns null, validator parity is skipped — the decision/legacy are unaffected.
   */
  loadCanonicalContext?: (leagueId: string, week: number) => Promise<LineupValidationContext | null>
  /** Build the `validateCanonical` dep from a loaded context (injected so tests bypass the real validator). */
  buildCanonicalDep?: (ctx: LineupValidationContext) => (ruleCtx: LineupRuleContext) => RuleVerdict[]
}

const defaultShadowDeps: LineupShadowDeps = {
  loadInputs: (userId, leagueId) => loadLineupSetInputs(userId, leagueId),
  ruleDeps: defaultLineupRuleDeps,
  // Default-ON within shadow mode: the route already gates this whole path behind the shadow flag.
  loadCanonicalContext: (leagueId, week) => loadCanonicalValidatorContext(leagueId, week),
  buildCanonicalDep: (ctx) => buildProductionCanonicalValidatorDep(ctx),
}

/**
 * Shadow one league. The decision is fed the legacy summary as its recommender, and parity compares
 * the decision against that same summary — proving the Decision OS wrapper introduces NO drift.
 * Never throws.
 */
export async function runLineupShadow(
  args: { userId: string; leagueId: string; legacySummary: LineupActionSummaryPayload },
  deps: Partial<LineupShadowDeps> = {},
): Promise<LineupShadowResult> {
  const loadInputs = deps.loadInputs ?? defaultShadowDeps.loadInputs
  const ruleDeps = deps.ruleDeps ?? defaultShadowDeps.ruleDeps
  try {
    const input = await loadInputs(args.userId, args.leagueId)
    if (!input) {
      emitShadowParity('manager.lineup.set', { shadow: true, ran: false, reason: 'inputs_unavailable', leagueId: args.leagueId })
      return { ran: false, leagueId: args.leagueId, error: 'inputs_unavailable' }
    }
    const memo = args.legacySummary
    const result = await runLineupSetDecision(input, {
      decision: { recommend: async () => memo, ruleDeps, newId: deps.newId },
      shadow: { legacyRecommend: async () => memo },
    })
    emitShadowParity(
      'manager.lineup.set',
      { shadow: true, ran: true, leagueId: args.leagueId, parity_passed: result.parity?.passed, parity_failed: result.parity ? !result.parity.passed : undefined, diffs: result.parity?.diffs?.length ?? 0 },
      result.decision.decision_id,
    )

    // SECOND-VALIDATOR PARITY (shadow-only): compare primary vs canonical WITHOUT touching the
    // active gate (the decision above already issued unchanged). Never throws.
    const validatorParity = await runValidatorParityShadow(args.leagueId, input, result.world, ruleDeps, deps, result.decision.decision_id)

    return { ran: true, leagueId: args.leagueId, parity: result.parity, validatorParity }
  } catch (e) {
    emitShadowParity('manager.lineup.set', { shadow: true, ran: false, reason: 'shadow_error', leagueId: args.leagueId })
    return { ran: false, leagueId: args.leagueId, error: e instanceof Error ? e.message : 'shadow_error' }
  }
}

/**
 * Run the canonical-vs-primary validator parity beside the decision. Loads the canonical context at
 * the route seam, builds the `validateCanonical` dep, and runs `evaluateLineupRulesWithParity` (which
 * already isolates the canonical validator behind try/catch). Emits `validator_parity` telemetry.
 * Never throws and NEVER affects the decision or the legacy response. Returns undefined when the
 * canonical context isn't available (non-redraft / template unresolved).
 */
async function runValidatorParityShadow(
  leagueId: string,
  input: RunLineupSetInput,
  world: LineupWorld,
  ruleDeps: LineupRuleDeps,
  deps: Partial<LineupShadowDeps>,
  decisionId: string,
): Promise<ValidatorParity | undefined> {
  const loadCanonicalContext = deps.loadCanonicalContext ?? defaultShadowDeps.loadCanonicalContext
  const buildCanonicalDep = deps.buildCanonicalDep ?? defaultShadowDeps.buildCanonicalDep
  if (!loadCanonicalContext || !buildCanonicalDep) return undefined
  try {
    const vctx = await loadCanonicalContext(leagueId, world.week)
    if (!vctx) {
      emitValidatorParity('manager.lineup.set', { shadow: true, validator_parity_ran: false, reason: 'canonical_context_unavailable', leagueId }, decisionId)
      return undefined
    }
    const ruleCtx: LineupRuleContext = {
      sport: input.sport,
      week: world.week,
      players: input.players,
      rosterConfig: world.facts.rosterConfig,
      lockState: world.lock_state,
    }
    const evaluation = evaluateLineupRulesWithParity(ruleCtx, { ...ruleDeps, validateCanonical: buildCanonicalDep(vctx) })
    const { parity } = evaluation
    emitValidatorParity(
      'manager.lineup.set',
      {
        shadow: true,
        validator_parity_ran: true,
        validator_parity_shared_agreement: parity.agreeOnSharedScope,
        validator_parity_coverage_differences: parity.coverageDifferences.length,
        validator_retirement_safe: parity.retirementSafe,
        validator_parity_reason: parity.reason,
        ...(parity.canonicalError ? { canonical_validator_error: parity.canonicalError } : {}),
        leagueId,
      },
      decisionId,
    )
    return parity
  } catch (e) {
    // Canonical context/dep machinery failed — record, never throw, decision/legacy untouched.
    emitValidatorParity('manager.lineup.set', { shadow: true, validator_parity_ran: false, reason: 'validator_parity_error', canonical_validator_error: e instanceof Error ? e.message : 'validator_parity_error', leagueId }, decisionId)
    return undefined
  }
}

/**
 * Shadow up to `maxLeagues` leagues from a user summary (cost-bounded). Never throws.
 */
export async function runLineupShadowForSummary(
  userId: string,
  summary: LineupActionSummaryPayload,
  opts: { maxLeagues?: number } = {},
  deps: Partial<LineupShadowDeps> = {},
): Promise<LineupShadowResult[]> {
  const cap = Math.max(1, opts.maxLeagues ?? 1)
  const leagueIds = Array.from(new Set((summary.leagues ?? []).map((l) => l.leagueId))).slice(0, cap)
  const out: LineupShadowResult[] = []
  for (const leagueId of leagueIds) {
    out.push(await runLineupShadow({ userId, leagueId, legacySummary: summary }, deps))
  }
  return out
}
