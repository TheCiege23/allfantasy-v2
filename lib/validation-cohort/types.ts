/**
 * Fantasy OS Suite — Phase V7.1: Decision OS Validation Cohort (types).
 *
 * INTERNAL validation tooling — NOT customer-facing, NOT presentation code. It uses Sleeper as a
 * real-world validation SOURCE to exercise the provider-agnostic Decision OS across a diverse cohort of
 * real leagues. Sleeper specifics live only in the resolver/adapter seam; everything downstream of
 * normalization is provider-neutral.
 *
 * Boundaries (Phase V7.1): no new customer contracts, no presentation changes, no Decision OS logic
 * changes except evidence-proven defect fixes, no fabricated data. Any field a source genuinely does not
 * provide is left absent/defaulted and disclosed — never invented.
 */

// ── Candidate registry (Step 2) ───────────────────────────────────────────────

/** One candidate account in the validation cohort. Minimal fields; no credentials, ever. */
export type ValidationAccount = {
  /** The raw line as supplied (trimmed). Kept for traceability of what was pasted. */
  raw: string
  /** Lowercased/trimmed candidate username used for API resolution. */
  normalizedUsername: string
  /** Populated only after a successful Sleeper resolution. */
  sleeperUserId?: string
  /** Sleeper display name, once resolved (for validation output only; never shown to customers). */
  displayName?: string
  status: 'pending' | 'resolved' | 'unresolved' | 'ambiguous' | 'failed'
  source: 'manual-cohort'
  /** Deterministic notes: why ambiguous, which heuristic flagged it, resolution errors, etc. */
  notes: string[]
}

/** Why a pasted line was pre-classified as not-a-username before any API call. */
export type AmbiguityReason =
  | 'contains-whitespace'
  | 'contains-illegal-chars'
  | 'too-long'
  | 'empty'
  | 'looks-like-league-or-team-name'

// ── Provider-neutral league facts ─────────────────────────────────────────────

/**
 * The provider-AGNOSTIC facts a league contributes to validation. The Sleeper resolver maps a raw
 * Sleeper payload into this shape (that mapping is the ONLY Sleeper-aware code); the archetype
 * classifier and the Decision OS probe consume only this — so nothing provider-specific leaks past the
 * seam. Every field is derived from real settings/activity; unknowns are explicit (`unknown`/`0`), never
 * fabricated.
 */
export type NormalizedLeagueFacts = {
  /** Opaque, anonymized reference (never a raw league name). */
  leagueReference: string
  season: string
  sport: string
  formatType: 'redraft' | 'keeper' | 'dynasty' | 'unknown'
  numTeams: number
  hasSuperflex: boolean
  hasIdp: boolean
  tightEndPremium: boolean
  playoffTeams: number
  waiverType: string
  totalTrades: number
  totalWaiverClaims: number
  totalTransactions: number
  draftState: 'complete' | 'upcoming' | 'unavailable'
  /** True when the cohort account that surfaced this league is its commissioner/owner. */
  sourceIsCommissioner: boolean
  activeManagers: number
  inactiveManagers: number
}

// ── League archetype classification (Step 4) ──────────────────────────────────

/** One archetype dimension, always with the deterministic evidence that produced it. */
export type ArchetypeTag = {
  dimension:
    | 'format' // redraft | dynasty | keeper
    | 'qb' // 1qb | superflex
    | 'tep' // tight-end-premium on/off
    | 'idp' // individual defensive players on/off
    | 'size' // small | standard | large (by team count)
    | 'source-role' // commissioner-source | member-source
    | 'transaction-activity' // low | normal | high
    | 'trade-activity' // low | normal | high
    | 'waiver-environment' // quiet | active
    | 'draft-state' // complete | upcoming | unavailable
  value: string
  /** The exact source field(s) or deterministic rule that yielded this value. */
  evidence: string
}

// ── Decision OS output probe (Step 5) ─────────────────────────────────────────

/** Which of the seven Operating Systems' inputs are reachable for a league in DB-less mode. */
export type OperatingSystemKey =
  | 'platform'
  | 'commissioner'
  | 'manager'
  | 'league'
  | 'trade'
  | 'waiver'
  | 'draft'

export type DecisionOutputReachability = 'available' | 'empty' | 'db-backed-only'

/** The result of probing one Decision OS output for one league (DB-less). */
export type DecisionOutputProbe = {
  os: OperatingSystemKey
  output: string
  reachability: DecisionOutputReachability
  /** Present when `available`: a compact, provider-neutral summary of what was derived. */
  summary?: string
  /** Present when `db-backed-only` or `empty`: why it could not be derived without persistence. */
  reason?: string
}

// ── Reports (Step 6) ──────────────────────────────────────────────────────────

/** Per-league validation result. `leagueReference` is an anonymized/opaque id, never a raw name. */
export type LeagueValidationResult = {
  leagueReference: string
  provider: 'sleeper'
  season: string
  archetypes: ArchetypeTag[]
  availableDecisionOutputs: string[]
  emptyDecisionOutputs: string[]
  dbBackedOnlyOutputs: string[]
  probes: DecisionOutputProbe[]
  warnings: string[]
  anomalies: string[]
  validationStatus: 'pass' | 'review' | 'failed'
}

/** Cohort-wide aggregate. Counts and classifications only — no invented quality scores. */
export type CohortAggregateReport = {
  generatedAt: string
  accountsSupplied: number
  accountsResolved: number
  accountsUnresolved: number
  accountsAmbiguous: number
  accountsFailed: number
  uniqueLeaguesImported: number
  archetypeCoverage: Record<string, number>
  recommendationCategoryCoverage: Record<string, number>
  emptyStateFrequency: Record<string, number>
  dbBackedOnlyFrequency: Record<string, number>
  errorsByStage: Record<string, number>
  repeatedAnomalyPatterns: Record<string, number>
  /** Full cohort-level anomaly findings (with detail) for root-cause tracing — not just counts. */
  cohortAnomalies: AnomalyFinding[]
  perLeague: LeagueValidationResult[]
}

// ── Anomaly / calibration audit (Step 7) ──────────────────────────────────────

export type AnomalyFinding = {
  code:
    | 'identical-recommendation-across-leagues'
    | 'excessive-high-priority'
    | 'always-empty-output'
    | 'draft-prep-after-draft-complete'
    | 'waiver-urgency-without-evidence'
    | 'implausible-health-classification'
    | 'trade-activity-misclassification'
    | 'provider-string-in-normalized-output'
    | 'multi-league-aggregation-error'
  leagueReferences: string[]
  detail: string
  /** Classification is deliberately deferred to human root-cause analysis (Step 7). */
  suspectedLayer?:
    | 'source-data'
    | 'adapter'
    | 'normalization'
    | 'decision-os'
    | 'expected-empty-state'
    | 'unsupported-capability'
    | 'unknown'
}
