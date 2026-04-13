import { z } from "zod";

export const VerdictEnum = z.enum([
  "Team A",
  "Team B",
  "Even",
  "Slight edge to Team A",
  "Slight edge to Team B",
  "Disagreement",
]);

export const VetoRiskEnum = z.enum(["None", "Low", "Moderate", "High"]);

export const PeerReviewVerdictSchema = z.object({
  verdict: VerdictEnum.exclude(["Disagreement"]),
  confidence: z.number().min(0).max(100),
  reasons: z.array(z.string()).min(1),
  counters: z.array(z.string()),
  warnings: z.array(z.string()),
}).strict();

export type PeerReviewVerdict = z.infer<typeof PeerReviewVerdictSchema>;

export const PEER_REVIEW_PROMPT_CONTRACT = `You are a peer reviewer evaluating a fantasy trade. You must return ONLY valid JSON matching this exact schema — no markdown, no explanation outside the JSON:

{
  "verdict": "Team A" | "Team B" | "Even" | "Slight edge to Team A" | "Slight edge to Team B",
  "confidence": <number 0-100>,
  "reasons": ["<why this verdict is correct — cite specific values, ADP, ages, injury data from the fact layer>", ...],
  "counters": ["<counter-arguments — reasons the OTHER side could be right, risks, caveats>", ...],
  "warnings": ["<data quality issues, missing info, age cliffs, injury red flags>", ...]
}

Rules:
- "verdict": who wins the trade based on the deterministic fact layer
- "confidence": 0-100, reduce for low data quality / missing valuations / stale injury data
- "reasons": 3-7 bullet points grounding your verdict in the provided numbers (market values, ADP, analytics, roster needs)
- "counters": 2-5 counter-arguments — why someone might disagree with your verdict
- "warnings": 0-5 data quality or risk warnings (missing ADP, stale injury data, age cliffs, etc.)

ANTI-HALLUCINATION RULES (CRITICAL):
- Do NOT hallucinate values. Use ONLY the numbers in the deterministic fact layer.
- Do NOT invent stats, player values, ADP numbers, or trade volumes that are not in the payload.
- If data is missing for key players, note it in warnings and reduce confidence.
- Every reason MUST cite specific data from the payload (values, ages, positions, roster needs).
- Do NOT override or contradict the deterministic fairness score — only interpret and explain it.

SOURCE OF TRUTH:
- Treat the fact layer and external intelligence block as your source of truth for: Sleeper historical context, manager tendencies, roster needs, scoring settings, FantasyCalc values, rookie value context, injuries/news, and rolling player/team stats.
- For Grok runs, if web/x search tools are available, use them to validate major breaking-news claims before finalizing verdict.
- Explicitly account for competitive window fit (win-now/rebuild/middle) in reasons/counters.`;

export const PEER_REVIEW_TEMPERATURE = 0.4;
export const PEER_REVIEW_MAX_TOKENS = 1500;

export type PeerReviewProviderResult = {
  provider: "openai" | "grok";
  verdict: PeerReviewVerdict | null;
  raw: any;
  latencyMs: number;
  error?: string;
  schemaValid: boolean;
};

export type DisagreementCode =
  | 'verdict_polarity_mismatch'
  | 'confidence_spread_high'
  | 'reason_overlap_low'
  | 'data_quality_concern'
  | 'provider_degraded';

export type DisagreementBlock = {
  winnerMismatch: boolean;
  confidenceSpread: number;
  keyDifferences: string[];
  reviewMode: boolean;
};

export type PeerReviewConsensus = {
  verdict: z.infer<typeof VerdictEnum>;
  confidence: number;
  reasons: string[];
  counters: string[];
  warnings: string[];
  disagreement: DisagreementBlock;
  meta: {
    providers: PeerReviewProviderResult[];
    consensusMethod: "agreement" | "disagreement" | "single_provider" | "degraded_fallback";
    totalLatencyMs: number;
    confidenceAdjustment: string;
    disagreementCodes?: DisagreementCode[];
    disagreementDetails?: string;
  };
};

export function validateAndParsePeerReview(raw: any): {
  valid: boolean;
  verdict: PeerReviewVerdict | null;
} {
  if (!raw || typeof raw !== "object") return { valid: false, verdict: null };

  try {
    const result = PeerReviewVerdictSchema.safeParse(raw);
    if (result.success) return { valid: true, verdict: result.data };

    const coerced = {
      verdict: raw.verdict || raw.winner,
      confidence:
        typeof raw.confidence === "string"
          ? parseFloat(raw.confidence)
          : raw.confidence,
      reasons: Array.isArray(raw.reasons)
        ? raw.reasons
        : Array.isArray(raw.factors)
          ? raw.factors
          : [],
      counters: Array.isArray(raw.counters) ? raw.counters : [],
      warnings: Array.isArray(raw.warnings) ? raw.warnings : [],
    };

    const retry = PeerReviewVerdictSchema.safeParse(coerced);
    if (retry.success) return { valid: true, verdict: retry.data };

    if (coerced.verdict && VerdictEnum.exclude(["Disagreement"]).safeParse(coerced.verdict).success) {
      return {
        valid: false,
        verdict: {
          verdict: coerced.verdict,
          confidence: typeof coerced.confidence === "number" ? Math.min(100, Math.max(0, coerced.confidence)) : 50,
          reasons: Array.isArray(coerced.reasons) && coerced.reasons.length > 0 ? coerced.reasons : ["Analysis provided but schema incomplete"],
          counters: Array.isArray(coerced.counters) ? coerced.counters : [],
          warnings: Array.isArray(coerced.warnings) ? coerced.warnings : ["Provider returned non-standard schema"],
        },
      };
    }

    return { valid: false, verdict: null };
  } catch {
    return { valid: false, verdict: null };
  }
}

function dedupeAndRank(arrA: string[], arrB: string[]): string[] {
  const seen = new Map<string, number>();

  for (const item of arrA) {
    const key = item.toLowerCase().trim();
    seen.set(key, (seen.get(key) || 0) + 2);
  }
  for (const item of arrB) {
    const key = item.toLowerCase().trim();
    seen.set(key, (seen.get(key) || 0) + 1);
  }

  const all = [...new Set([...arrA, ...arrB])];
  all.sort((a, b) => {
    const sa = seen.get(a.toLowerCase().trim()) || 0;
    const sb = seen.get(b.toLowerCase().trim()) || 0;
    return sb - sa;
  });

  return all;
}

function verdictClass(v: string): "A" | "B" | "Even" {
  if (v === "Team A" || v === "Slight edge to Team A") return "A";
  if (v === "Team B" || v === "Slight edge to Team B") return "B";
  return "Even";
}

function computeKeyDifferences(
  a: PeerReviewProviderResult,
  b: PeerReviewProviderResult
): string[] {
  const diffs: string[] = [];
  const aV = a.verdict!;
  const bV = b.verdict!;
  const classA = verdictClass(aV.verdict);
  const classB = verdictClass(bV.verdict);

  if (classA !== classB) {
    diffs.push(`Winner: ${a.provider} says ${aV.verdict}, ${b.provider} says ${bV.verdict}`);
  }

  const confDiff = Math.abs(aV.confidence - bV.confidence);
  if (confDiff >= 15) {
    diffs.push(`Confidence gap: ${a.provider} at ${aV.confidence}% vs ${b.provider} at ${bV.confidence}% (${confDiff}pt spread)`);
  }

  const aKeywords = new Set(aV.reasons.flatMap(r => r.toLowerCase().match(/\b[a-z]{4,}\b/g) || []));
  const bKeywords = new Set(bV.reasons.flatMap(r => r.toLowerCase().match(/\b[a-z]{4,}\b/g) || []));
  const aOnly = [...aKeywords].filter(k => !bKeywords.has(k));
  const bOnly = [...bKeywords].filter(k => !aKeywords.has(k));
  if (aOnly.length > 3 || bOnly.length > 3) {
    diffs.push(`Different focus areas: providers emphasize different factors in their reasoning`);
  }

  const aHasRisk = aV.warnings.some(w => /injury|risk|stale|missing/i.test(w));
  const bHasRisk = bV.warnings.some(w => /injury|risk|stale|missing/i.test(w));
  if (aHasRisk !== bHasRisk) {
    const riskProvider = aHasRisk ? a.provider : b.provider;
    const noRiskProvider = aHasRisk ? b.provider : a.provider;
    diffs.push(`Risk assessment: ${riskProvider} flags injury/data risks that ${noRiskProvider} does not`);
  }

  const aCounterTone = aV.counters.some(c => /restructure|reject|overpa/i.test(c));
  const bCounterTone = bV.counters.some(c => /restructure|reject|overpa/i.test(c));
  if (aCounterTone !== bCounterTone) {
    diffs.push(`Trade viability: providers disagree on whether this trade is actionable`);
  }

  return diffs.slice(0, 5);
}

function buildReviewModeCounters(
  a: PeerReviewProviderResult,
  b: PeerReviewProviderResult
): string[] {
  const counters: string[] = [];

  counters.push(
    `AI models disagree on this trade — consider getting a second opinion from leaguemates or waiting for updated data before committing`
  );

  const allCounters = [...(a.verdict?.counters || []), ...(b.verdict?.counters || [])];
  const saferCounters = allCounters.filter(c =>
    /wait|monitor|hold|verify|confirm|check|caution/i.test(c) ||
    !/aggressive|smash|accept|send/i.test(c)
  );

  if (saferCounters.length > 0) {
    counters.push(saferCounters[0]);
  } else if (allCounters.length > 0) {
    counters.push(allCounters[0]);
  }

  return counters.slice(0, 2);
}

const NO_DISAGREEMENT: DisagreementBlock = {
  winnerMismatch: false,
  confidenceSpread: 0,
  keyDifferences: [],
  reviewMode: false,
};

export function mergePeerReviews(
  results: PeerReviewProviderResult[]
): PeerReviewConsensus | null {
  const valid = results.filter((r) => r.verdict !== null);

  if (valid.length === 0) return null;

  const totalLatencyMs = Math.max(...results.map((r) => r.latencyMs));

  if (valid.length === 1) {
    const r = valid[0];
    const failedProvider = results.find((p) => p.verdict === null);
    const isDegraded = !!failedProvider;
    const confidencePenalty = isDegraded ? 10 : 0;
    const adjustedConfidence = Math.max(0, r.verdict!.confidence - confidencePenalty);

    const warnings = [...r.verdict!.warnings];
    if (isDegraded) {
      warnings.push(`${failedProvider!.provider} failed (${failedProvider!.error || "unknown error"}) — using ${r.provider} only`);
    }

    return {
      verdict: r.verdict!.verdict,
      confidence: adjustedConfidence,
      reasons: r.verdict!.reasons,
      counters: r.verdict!.counters,
      warnings,
      disagreement: NO_DISAGREEMENT,
      meta: {
        providers: results,
        consensusMethod: isDegraded ? "degraded_fallback" : "single_provider",
        totalLatencyMs,
        confidenceAdjustment: isDegraded
          ? `−${confidencePenalty} (${failedProvider!.provider} unavailable)`
          : "none",
        ...(isDegraded ? {
          disagreementCodes: ['provider_degraded'] as DisagreementCode[],
          disagreementDetails: `${failedProvider!.provider} was unavailable, analysis based solely on ${r.provider}.`,
        } : {}),
      },
    };
  }

  const a = valid[0];
  const b = valid[1];
  const aV = a.verdict!;
  const bV = b.verdict!;

  const classA = verdictClass(aV.verdict);
  const classB = verdictClass(bV.verdict);

  const avgConfidence = Math.round((aV.confidence + bV.confidence) / 2);
  const mergedReasons = dedupeAndRank(aV.reasons, bV.reasons);
  const mergedCounters = dedupeAndRank(aV.counters, bV.counters);
  const mergedWarnings = dedupeAndRank(aV.warnings, bV.warnings);

  const confidenceSpread = Math.abs(aV.confidence - bV.confidence);
  const winnerMismatch = classA !== classB;

  if (classA === classB) {
    const boostedConfidence = Math.min(100, avgConfidence + 10);
    const agreedVerdict = aV.confidence >= bV.confidence ? aV.verdict : bV.verdict;

    const keyDifferences: string[] = [];
    if (confidenceSpread >= 15) {
      keyDifferences.push(`Confidence gap: ${a.provider} at ${aV.confidence}% vs ${b.provider} at ${bV.confidence}%`);
    }

    const mildDisagreement = confidenceSpread >= 25;

    return {
      verdict: agreedVerdict,
      confidence: boostedConfidence,
      reasons: mergedReasons,
      counters: mergedCounters,
      warnings: mergedWarnings,
      disagreement: {
        winnerMismatch: false,
        confidenceSpread,
        keyDifferences,
        reviewMode: mildDisagreement,
      },
      meta: {
        providers: results,
        consensusMethod: "agreement",
        totalLatencyMs,
        confidenceAdjustment: `+10 (both providers agree: ${classA})`,
        ...(mildDisagreement ? {
          disagreementCodes: ['confidence_spread_high'] as DisagreementCode[],
          disagreementDetails: `Providers agree on winner but differ in confidence by ${confidenceSpread}%.`,
        } : {}),
      },
    };
  }

  const cappedConfidence = Math.min(avgConfidence, 40);
  const keyDifferences = computeKeyDifferences(a, b);
  const isHighDisagreement = winnerMismatch && (confidenceSpread >= 20 || keyDifferences.length >= 3);
  const reviewModeCounters = isHighDisagreement
    ? buildReviewModeCounters(a, b)
    : mergedCounters;

  mergedWarnings.unshift(
    `Provider disagreement: ${a.provider} says "${aV.verdict}" (${aV.confidence}%), ${b.provider} says "${bV.verdict}" (${bV.confidence}%)`
  );

  if (isHighDisagreement) {
    mergedWarnings.push(`[Review Mode] High disagreement between AI models — showing safer alternatives instead of aggressive recommendations`);
  }

  const disagreementCodes: DisagreementCode[] = [];
  const detailParts: string[] = [];

  disagreementCodes.push('verdict_polarity_mismatch');
  detailParts.push(`${a.provider} rated "${classA}" while ${b.provider} rated "${classB}"`);

  if (confidenceSpread >= 25) {
    disagreementCodes.push('confidence_spread_high');
    detailParts.push(`Confidence spread of ${confidenceSpread}% suggests different data interpretation`);
  }

  const aReasonSet = new Set(aV.reasons.map(r => r.toLowerCase().slice(0, 40)));
  const bReasonSet = new Set(bV.reasons.map(r => r.toLowerCase().slice(0, 40)));
  const overlap = [...aReasonSet].filter(r => bReasonSet.has(r)).length;
  const totalUnique = new Set([...aReasonSet, ...bReasonSet]).size;
  if (totalUnique > 0 && overlap / totalUnique < 0.3) {
    disagreementCodes.push('reason_overlap_low');
    detailParts.push(`Providers cited different reasoning (${Math.round((overlap / totalUnique) * 100)}% overlap)`);
  }

  return {
    verdict: "Disagreement",
    confidence: cappedConfidence,
    reasons: mergedReasons,
    counters: reviewModeCounters,
    warnings: mergedWarnings,
    disagreement: {
      winnerMismatch,
      confidenceSpread,
      keyDifferences,
      reviewMode: isHighDisagreement,
    },
    meta: {
      providers: results,
      consensusMethod: "disagreement",
      totalLatencyMs,
      confidenceAdjustment: `capped at ${cappedConfidence} (verdict class mismatch: ${a.provider}=${classA}, ${b.provider}=${classB})`,
      disagreementCodes,
      disagreementDetails: detailParts.join('. ') + '.',
    },
  };
}

export const LegacyWinnerEnum = z.enum([
  "Team A",
  "Team B",
  "Even",
  "Slight edge to Team A",
  "Slight edge to Team B",
]);

export const WinnerEnum = LegacyWinnerEnum;

export const ConfidenceBreakdownSchema = z.object({
  data_quality: z.number().min(0).max(100),
  market_alignment: z.number().min(0).max(100),
  risk_weighting: z.number().min(0).max(100),
});

export type ConfidenceBreakdown = z.infer<typeof ConfidenceBreakdownSchema>;

export const TradeAnalysisSchema = z.object({
  winner: LegacyWinnerEnum,
  confidence: z.number().min(0).max(100),
  reasoning: z.string().min(1),
  key_factors: z.array(z.string()).min(1),
  risk_flags: z.array(z.string()),
  counter_suggestions: z.array(z.string()),
  news_impact: z.array(z.string()),
  confidence_breakdown: ConfidenceBreakdownSchema,
  /** @deprecated kept for backwards compat — maps to reasoning */
  valueDelta: z.string().optional(),
  /** @deprecated kept for backwards compat — maps to key_factors */
  factors: z.array(z.string()).optional(),
  dynastyVerdict: z.string().optional(),
  vetoRisk: z.string().optional(),
  agingConcerns: z.array(z.string()).optional(),
  recommendations: z.array(z.string()).optional(),
  youGiveAdjusted: z.string().optional(),
  youWantAdded: z.string().optional(),
  reason: z.string().optional(),
});

export type TradeAnalysis = z.infer<typeof TradeAnalysisSchema>;

export type ProviderResult = {
  provider: "openai" | "grok";
  analysis: TradeAnalysis | null;
  raw: any;
  latencyMs: number;
  error?: string;
  schemaValid: boolean;
  confidenceScore: number;
};

export type ConsensusAnalysis = TradeAnalysis & {
  meta: {
    providers: ProviderResult[];
    consensusMethod: "single" | "weighted_merge" | "primary_fallback";
    primaryProvider: "openai" | "grok";
    totalLatencyMs: number;
  };
};

/**
 * Score a provider result on a 100-point scale:
 *   Schema validity    — 40 pts
 *   Reasoning depth    — 20 pts
 *   Factor diversity   — 10 pts
 *   Confidence calib.  — 20 pts
 *   News relevance     — 10 pts
 */
export function scoreProviderResult(result: ProviderResult): number {
  let score = 0;

  // --- Schema validity (40 pts) ---
  if (result.schemaValid) score += 40;

  if (!result.analysis) return score;

  const a = result.analysis;

  // --- Reasoning depth (20 pts) ---
  const reasoningLen = (a.reasoning ?? '').length;
  if (reasoningLen >= 200) score += 20;
  else if (reasoningLen >= 100) score += 14;
  else if (reasoningLen >= 40) score += 8;
  else if (reasoningLen > 0) score += 4;

  // --- Factor diversity (10 pts) ---
  const factorCount = a.key_factors?.length ?? 0;
  if (factorCount >= 5) score += 10;
  else if (factorCount >= 3) score += 7;
  else if (factorCount >= 1) score += 4;

  // --- Confidence calibration (20 pts) ---
  // Reward middle-ground confidence; penalize extremes (0 or 100) unless justified
  const cb = a.confidence_breakdown;
  if (cb) {
    const avg = (cb.data_quality + cb.market_alignment + cb.risk_weighting) / 3;
    const spread = Math.max(cb.data_quality, cb.market_alignment, cb.risk_weighting) -
                   Math.min(cb.data_quality, cb.market_alignment, cb.risk_weighting);
    // Reasonable average → up to 14 pts, low spread → up to 6 pts
    score += Math.min(14, Math.round((avg / 100) * 14));
    score += spread <= 30 ? 6 : spread <= 50 ? 3 : 0;
  } else {
    // Fallback: simple confidence score
    score += Math.min(20, Math.round((a.confidence / 100) * 20));
  }

  // --- News relevance (10 pts) ---
  const newsCount = a.news_impact?.length ?? 0;
  if (newsCount >= 3) score += 10;
  else if (newsCount >= 1) score += 6;
  // 0 news is acceptable for OpenAI (no live data), still earns partial
  else if (result.provider === 'openai') score += 3;

  return Math.min(100, score);
}

/** Parse confidence safely, handling NaN and string inputs. */
function safeParseConfidence(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.min(100, Math.max(0, value));
  }
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    if (Number.isFinite(parsed)) return Math.min(100, Math.max(0, parsed));
  }
  return 50;
}

/** Coerce a raw response (old or new format) into the unified TradeAnalysis shape. */
function coerceToNewSchema(raw: any): any {
  if (!raw || typeof raw !== 'object') return raw;

  return {
    ...raw,
    // Map old "teamA/teamB/even" string variants to enum values
    winner: raw.winner ?? raw.verdict,
    confidence: safeParseConfidence(raw.confidence),
    // New fields — populate from old equivalents if missing
    reasoning: raw.reasoning ?? raw.dynastyVerdict ?? raw.reason ?? '',
    key_factors: Array.isArray(raw.key_factors)
      ? raw.key_factors
      : Array.isArray(raw.factors) ? raw.factors : [],
    risk_flags: Array.isArray(raw.risk_flags)
      ? raw.risk_flags
      : Array.isArray(raw.agingConcerns) ? raw.agingConcerns : [],
    counter_suggestions: Array.isArray(raw.counter_suggestions)
      ? raw.counter_suggestions
      : Array.isArray(raw.recommendations) ? raw.recommendations : [],
    news_impact: Array.isArray(raw.news_impact) ? raw.news_impact : [],
    confidence_breakdown: raw.confidence_breakdown ?? {
      data_quality: safeParseConfidence(raw.confidence),
      market_alignment: safeParseConfidence(raw.confidence),
      risk_weighting: safeParseConfidence(raw.confidence),
    },
    // Preserve legacy fields
    valueDelta: raw.valueDelta,
    factors: Array.isArray(raw.factors) ? raw.factors : Array.isArray(raw.key_factors) ? raw.key_factors : [],
    dynastyVerdict: raw.dynastyVerdict ?? raw.reasoning,
  };
}

export function validateAndParseAnalysis(raw: any): {
  valid: boolean;
  analysis: TradeAnalysis | null;
} {
  try {
    // Try direct parse first
    const parsed = TradeAnalysisSchema.safeParse(raw);
    if (parsed.success) {
      return { valid: true, analysis: parsed.data };
    }

    // Coerce old/partial format into new schema
    const coerced = coerceToNewSchema(raw);
    const retry = TradeAnalysisSchema.safeParse(coerced);
    if (retry.success) {
      return { valid: true, analysis: retry.data };
    }

    // Last resort: if we have a winner and any reasoning, build a partial analysis
    if (raw && typeof raw === 'object' && (raw.winner || raw.verdict)) {
      const fallback = coerceToNewSchema(raw);
      const winnerVal = fallback.winner;
      if (winnerVal && LegacyWinnerEnum.safeParse(winnerVal).success) {
        return {
          valid: false,
          analysis: {
            winner: winnerVal,
            confidence: typeof fallback.confidence === 'number'
              ? Math.min(100, Math.max(0, fallback.confidence)) : 50,
            reasoning: fallback.reasoning || 'Analysis provided but schema incomplete',
            key_factors: Array.isArray(fallback.key_factors) && fallback.key_factors.length > 0
              ? fallback.key_factors : ['Schema incomplete — factors unavailable'],
            risk_flags: Array.isArray(fallback.risk_flags) ? fallback.risk_flags : [],
            counter_suggestions: Array.isArray(fallback.counter_suggestions) ? fallback.counter_suggestions : [],
            news_impact: Array.isArray(fallback.news_impact) ? fallback.news_impact : [],
            confidence_breakdown: fallback.confidence_breakdown ?? {
              data_quality: 50, market_alignment: 50, risk_weighting: 50,
            },
            valueDelta: fallback.valueDelta,
            factors: fallback.factors,
            dynastyVerdict: fallback.dynastyVerdict,
            vetoRisk: raw.vetoRisk,
            agingConcerns: Array.isArray(raw.agingConcerns) ? raw.agingConcerns : undefined,
            recommendations: Array.isArray(raw.recommendations) ? raw.recommendations : undefined,
            youGiveAdjusted: raw.youGiveAdjusted,
            youWantAdded: raw.youWantAdded,
            reason: raw.reason,
          },
        };
      }
    }

    return { valid: false, analysis: null };
  } catch {
    return { valid: false, analysis: null };
  }
}

function resolveWinner(
  a: TradeAnalysis,
  b: TradeAnalysis,
  scoreA: number,
  scoreB: number
): TradeAnalysis["winner"] {
  if (a.winner === b.winner) return a.winner;

  const winnerWeight = new Map<string, number>();
  const addWeight = (w: string, weight: number) =>
    winnerWeight.set(w, (winnerWeight.get(w) || 0) + weight);

  addWeight(a.winner, scoreA);
  addWeight(b.winner, scoreB);

  let best = a.winner;
  let bestScore = 0;
  for (const [w, s] of winnerWeight) {
    if (s > bestScore) {
      best = w as TradeAnalysis["winner"];
      bestScore = s;
    }
  }
  return best;
}

function mergeConfidenceBreakdowns(
  a: ConfidenceBreakdown,
  b: ConfidenceBreakdown,
  wA: number,
  wB: number,
): ConfidenceBreakdown {
  return {
    data_quality: Math.round(a.data_quality * wA + b.data_quality * wB),
    market_alignment: Math.round(a.market_alignment * wA + b.market_alignment * wB),
    risk_weighting: Math.round(a.risk_weighting * wA + b.risk_weighting * wB),
  };
}

function winnersAgree(a: TradeAnalysis, b: TradeAnalysis): boolean {
  return verdictClass(a.winner) === verdictClass(b.winner);
}

export function mergeAnalyses(
  results: ProviderResult[],
  primaryProvider: "openai" | "grok"
): ConsensusAnalysis | null {
  const valid = results.filter((r) => r.analysis !== null);

  if (valid.length === 0) return null;

  const totalLatencyMs = Math.max(...results.map((r) => r.latencyMs));

  // --- Single provider (other failed): apply -15 penalty ---
  if (valid.length === 1) {
    const r = valid[0];
    const otherFailed = results.find((p) => p.analysis === null);
    const penalty = otherFailed ? 15 : 0;
    const adjusted = {
      ...r.analysis!,
      confidence: Math.max(0, r.analysis!.confidence - penalty),
    };

    return {
      ...adjusted,
      meta: {
        providers: results,
        consensusMethod: "single",
        primaryProvider,
        totalLatencyMs,
      },
    };
  }

  const primary = valid.find((r) => r.provider === primaryProvider) || valid[0];
  const secondary = valid.find((r) => r.provider !== primary.provider) || valid[1];

  const pScore = scoreProviderResult(primary);
  const sScore = scoreProviderResult(secondary);

  // If secondary is too weak, use primary with -15 penalty
  if (sScore < 30) {
    return {
      ...primary.analysis!,
      confidence: Math.max(0, primary.analysis!.confidence - 15),
      meta: {
        providers: results,
        consensusMethod: "primary_fallback",
        primaryProvider,
        totalLatencyMs,
      },
    };
  }

  const pA = primary.analysis!;
  const sA = secondary.analysis!;

  const totalWeight = pScore + sScore;
  // Guard against division by zero (both scores are 0)
  const pWeight = totalWeight > 0 ? pScore / totalWeight : 0.5;
  const sWeight = totalWeight > 0 ? sScore / totalWeight : 0.5;

  const agree = winnersAgree(pA, sA);

  // --- Consensus logic ---
  let mergedConfidence: number;
  let consensusMethod: ConsensusAnalysis["meta"]["consensusMethod"];

  if (agree) {
    // Both agree → boost confidence +10, merge reasoning
    mergedConfidence = Math.min(
      100,
      Math.round(pA.confidence * pWeight + sA.confidence * sWeight) + 10,
    );
    consensusMethod = "weighted_merge";
  } else {
    // Disagree → cap confidence at 40, trigger REVIEW MODE
    mergedConfidence = Math.min(
      40,
      Math.round(pA.confidence * pWeight + sA.confidence * sWeight),
    );
    consensusMethod = "weighted_merge";
  }

  const merged: TradeAnalysis = {
    winner: resolveWinner(pA, sA, pScore, sScore),
    confidence: mergedConfidence,
    reasoning: pScore >= sScore
      ? `${pA.reasoning}\n\n[${secondary.provider} adds]: ${sA.reasoning}`
      : `${sA.reasoning}\n\n[${primary.provider} adds]: ${pA.reasoning}`,
    key_factors: dedupeAndRank(pA.key_factors ?? pA.factors ?? [], sA.key_factors ?? sA.factors ?? []),
    risk_flags: dedupeAndRank(pA.risk_flags ?? [], sA.risk_flags ?? []),
    counter_suggestions: dedupeAndRank(pA.counter_suggestions ?? [], sA.counter_suggestions ?? []),
    news_impact: dedupeAndRank(pA.news_impact ?? [], sA.news_impact ?? []),
    confidence_breakdown: mergeConfidenceBreakdowns(
      pA.confidence_breakdown ?? { data_quality: 50, market_alignment: 50, risk_weighting: 50 },
      sA.confidence_breakdown ?? { data_quality: 50, market_alignment: 50, risk_weighting: 50 },
      pWeight,
      sWeight,
    ),
    // Legacy fields
    valueDelta: pScore >= sScore ? pA.valueDelta : sA.valueDelta,
    factors: dedupeAndRank(pA.factors ?? pA.key_factors ?? [], sA.factors ?? sA.key_factors ?? []),
    dynastyVerdict: pScore >= sScore ? pA.dynastyVerdict : sA.dynastyVerdict,
    vetoRisk: pA.vetoRisk || sA.vetoRisk,
    agingConcerns: dedupeAndRank(pA.agingConcerns || [], sA.agingConcerns || []),
    recommendations: dedupeAndRank(
      pA.recommendations ?? pA.counter_suggestions ?? [],
      sA.recommendations ?? sA.counter_suggestions ?? [],
    ),
    youGiveAdjusted: pA.youGiveAdjusted || sA.youGiveAdjusted,
    youWantAdded: pA.youWantAdded || sA.youWantAdded,
    reason: pA.reason || sA.reason,
  };

  return {
    ...merged,
    meta: {
      providers: results,
      consensusMethod,
      primaryProvider,
      totalLatencyMs,
    },
  };
}
