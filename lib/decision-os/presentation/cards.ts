/**
 * Decision OS — Phase 7.0 IPM Card Assemblers.
 *
 * Pure functions that build self-contained card data models.
 * No React, no CSS — data contracts only.
 */

import type {
  HealthCard, RecommendationCard, InsightCard, RetentionCard,
  CommissionerCard, ManagerCard, DnaCard, LeagueArchetypeCard,
  PlatformBenchmarkCard, CompanyIntelligenceCard,
  Badge, GraphModel, MetricPresentation, SeverityToken, ScoreDeduction,
  BenchmarkDimensionPresentation, DnaTrait,
} from './types'
import {
  PRESENTATION_VERSION,
  SEVERITY_DEFINITIONS,
  scoreToSeverity,
  retentionRiskToSeverity,
  workloadToSeverity,
  archetypeToSeverity,
  healthTierToSeverity,
  scoreToColorToken,
  retentionRiskToColorToken,
  archetypeToColorToken,
  percentileToColorToken,
  identityToColorToken,
  IDENTITY_DISPLAY_LABELS,
  IDENTITY_DESCRIPTIONS,
  ARCHETYPE_DISPLAY_LABELS,
  ARCHETYPE_DESCRIPTIONS,
} from './tokens'

// ── Health card ───────────────────────────────────────────────────────────────

export function buildHealthCard(
  entityId: string,
  score: number,
  tier: string,
  options?: {
    title?: string
    subtitle?: string
    subText?: string
    deductions?: ScoreDeduction[]
    badges?: Badge[]
    graphs?: GraphModel[]
    metrics?: MetricPresentation[]
    completeness?: number
    uncertainty?: string[]
    derivation?: string[]
  },
): HealthCard {
  const opts = options ?? {}
  const clamped = Math.round(Math.max(0, Math.min(100, score)))
  const severity = SEVERITY_DEFINITIONS[scoreToSeverity(clamped)]
  return {
    cardId: `card_${entityId}_health`,
    cardType: 'health',
    entityId,
    title: opts.title ?? 'League Health Score',
    subtitle: opts.subtitle ?? null,
    badges: opts.badges ?? [],
    graphs: opts.graphs ?? [],
    metrics: opts.metrics ?? [],
    severity,
    completeness: opts.completeness ?? 100,
    uncertainty: opts.uncertainty ?? [],
    derivation: opts.derivation ?? [`score=${clamped} tier=${tier} → health card`],
    version: PRESENTATION_VERSION,
    healthScore: clamped,
    healthTier: tier,
    displayScore: String(clamped),
    subText: opts.subText ?? `Health tier: ${tier}`,
    deductions: opts.deductions ?? [],
  }
}

// ── Recommendation card ───────────────────────────────────────────────────────

export function buildRecommendationCard(rec: {
  id: string
  tier: string
  category: string
  entityId: string
  priority: string
  severity: string
  expectedImpact: string
  recommendedActions: Array<{ action: string; rationale: string }>
  rollbackCriteria: string[]
  derivation: string[]
  uncertainty: string[]
  completeness: number
}): RecommendationCard {
  const difficulty: RecommendationCard['difficulty'] =
    rec.priority === 'critical' || rec.priority === 'high' ? 'moderate' : 'easy'
  const estimatedTime: RecommendationCard['estimatedTime'] =
    rec.priority === 'critical' ? '30_min' : rec.priority === 'high' ? '30_min' : '5_min'
  const sevToken: SeverityToken =
    rec.severity === 'urgent' ? 'critical'
    : rec.severity === 'elevated' ? 'elevated'
    : rec.severity === 'standard' ? 'standard'
    : 'advisory'
  const severity = SEVERITY_DEFINITIONS[sevToken]
  return {
    cardId: `card_${rec.entityId}_recommendation_${rec.category}`,
    cardType: 'recommendation',
    entityId: rec.entityId,
    title: `${rec.category.replace(/_/g, ' ')} recommendation`,
    subtitle: rec.tier,
    badges: [],
    graphs: [],
    metrics: [],
    severity,
    completeness: rec.completeness,
    uncertainty: rec.uncertainty,
    derivation: rec.derivation,
    version: PRESENTATION_VERSION,
    recommendationId: rec.id,
    category: rec.category,
    priority: rec.priority,
    expectedImpact: rec.expectedImpact,
    difficulty,
    estimatedTime,
    actions: rec.recommendedActions,
    rollbackCriteria: rec.rollbackCriteria,
  }
}

// ── Insight card ──────────────────────────────────────────────────────────────

export function buildInsightCard(
  entityId: string,
  insightKey: string,
  insightLabel: string,
  signal: string,
  actionableSignal: string,
  options?: {
    title?: string
    badges?: Badge[]
    graphs?: GraphModel[]
    metrics?: MetricPresentation[]
    completeness?: number
    uncertainty?: string[]
    derivation?: string[]
  },
): InsightCard {
  const opts = options ?? {}
  return {
    cardId: `card_${entityId}_insight_${insightKey}`,
    cardType: 'insight',
    entityId,
    title: opts.title ?? insightLabel,
    subtitle: null,
    badges: opts.badges ?? [],
    graphs: opts.graphs ?? [],
    metrics: opts.metrics ?? [],
    severity: SEVERITY_DEFINITIONS['advisory'],
    completeness: opts.completeness ?? 100,
    uncertainty: opts.uncertainty ?? [],
    derivation: opts.derivation ?? [`insightKey=${insightKey} → insight card`],
    version: PRESENTATION_VERSION,
    insightKey,
    insightLabel,
    signal,
    actionableSignal,
  }
}

// ── Retention card ────────────────────────────────────────────────────────────

export function buildRetentionCard(
  entityId: string,
  retentionRisk: string,
  riskReasons: string[],
  options?: {
    managersAtRisk?: number
    totalManagers?: number
    badges?: Badge[]
    graphs?: GraphModel[]
    metrics?: MetricPresentation[]
    completeness?: number
    uncertainty?: string[]
    derivation?: string[]
  },
): RetentionCard {
  const opts = options ?? {}
  const severity = SEVERITY_DEFINITIONS[retentionRiskToSeverity(retentionRisk)]
  return {
    cardId: `card_${entityId}_retention`,
    cardType: 'retention',
    entityId,
    title: 'Retention Risk',
    subtitle: null,
    badges: opts.badges ?? [],
    graphs: opts.graphs ?? [],
    metrics: opts.metrics ?? [],
    severity,
    completeness: opts.completeness ?? 100,
    uncertainty: opts.uncertainty ?? [],
    derivation: opts.derivation ?? [`retentionRisk=${retentionRisk} → retention card`],
    version: PRESENTATION_VERSION,
    retentionRisk,
    riskReasons,
    managersAtRisk: opts.managersAtRisk ?? null,
    totalManagers: opts.totalManagers ?? null,
  }
}

// ── Commissioner card ─────────────────────────────────────────────────────────

export function buildCommissionerCard(
  leagueId: string,
  workloadLevel: string,
  workloadItems: string[],
  options?: {
    actionItems?: CommissionerCard['actionItems']
    badges?: Badge[]
    graphs?: GraphModel[]
    metrics?: MetricPresentation[]
    completeness?: number
    uncertainty?: string[]
    derivation?: string[]
  },
): CommissionerCard {
  const opts = options ?? {}
  const severity = SEVERITY_DEFINITIONS[workloadToSeverity(workloadLevel)]
  return {
    cardId: `card_${leagueId}_commissioner`,
    cardType: 'commissioner',
    entityId: leagueId,
    title: 'Commissioner Workload',
    subtitle: null,
    badges: opts.badges ?? [],
    graphs: opts.graphs ?? [],
    metrics: opts.metrics ?? [],
    severity,
    completeness: opts.completeness ?? 100,
    uncertainty: opts.uncertainty ?? [],
    derivation: opts.derivation ?? [`workloadLevel=${workloadLevel} items=${workloadItems.length} → commissioner card`],
    version: PRESENTATION_VERSION,
    workloadLevel,
    workloadItems,
    actionItems: opts.actionItems ?? [],
  }
}

// ── Manager card ──────────────────────────────────────────────────────────────

export function buildManagerCard(
  managerId: string,
  leagueId: string,
  input: {
    participationTier: string
    retentionRisk: string
    overallEngagementScore: number
    daysSinceLastActivity: number | null
    isInactive: boolean
    completeness: number
  },
  options?: {
    badges?: Badge[]
    graphs?: GraphModel[]
    metrics?: MetricPresentation[]
    uncertainty?: string[]
    derivation?: string[]
  },
): ManagerCard {
  const opts = options ?? {}
  const severity = SEVERITY_DEFINITIONS[retentionRiskToSeverity(input.retentionRisk)]
  return {
    cardId: `card_${managerId}_manager`,
    cardType: 'manager',
    entityId: managerId,
    title: 'Manager Profile',
    subtitle: null,
    badges: opts.badges ?? [],
    graphs: opts.graphs ?? [],
    metrics: opts.metrics ?? [],
    severity,
    completeness: input.completeness,
    uncertainty: opts.uncertainty ?? [],
    derivation: opts.derivation ?? [
      `participationTier=${input.participationTier} retentionRisk=${input.retentionRisk} → manager card`,
    ],
    version: PRESENTATION_VERSION,
    managerId,
    leagueId,
    participationTier: input.participationTier,
    retentionRisk: input.retentionRisk,
    overallEngagementScore: input.overallEngagementScore,
    daysSinceLastActivity: input.daysSinceLastActivity,
    isInactive: input.isInactive,
  }
}

// ── DNA card ──────────────────────────────────────────────────────────────────

export function buildDnaCard(
  managerId: string,
  dna: {
    primaryIdentity: string
    confidence: number
    decisionStyle: string
    transactionStyle: string
    riskTendency: string
    engagementReliability: string
    traits: Array<{ trait: string; strength: string }>
    derivation: string[]
    completeness: number
  },
  options?: {
    badges?: Badge[]
    graphs?: GraphModel[]
    metrics?: MetricPresentation[]
    uncertainty?: string[]
  },
): DnaCard {
  const opts = options ?? {}
  const identity = dna.primaryIdentity
  const colorToken = identityToColorToken(identity)
  // Map severity from identity
  const sevToken: SeverityToken =
    identity === 'ghost_manager' ? 'critical'
    : identity === 'committed_grinder' ? 'positive'
    : identity === 'indecisive_tinkerer' || identity === 'reactive_manager' ? 'standard'
    : 'advisory'
  const severity = SEVERITY_DEFINITIONS[sevToken]

  const traits: DnaTrait[] = dna.traits.map((t) => ({
    trait: t.trait,
    strength: t.strength,
    colorToken: t.strength === 'strong' ? colorToken : t.strength === 'moderate' ? 'neutral' : 'muted',
  }))

  return {
    cardId: `card_${managerId}_dna`,
    cardType: 'dna',
    entityId: managerId,
    title: 'Manager DNA',
    subtitle: IDENTITY_DISPLAY_LABELS[identity] ?? identity,
    badges: opts.badges ?? [],
    graphs: opts.graphs ?? [],
    metrics: opts.metrics ?? [],
    severity,
    completeness: dna.completeness,
    uncertainty: opts.uncertainty ?? (dna.confidence < 0.50 ? ['identity_confidence_low'] : []),
    derivation: dna.derivation,
    version: PRESENTATION_VERSION,
    managerId,
    primaryIdentity: identity,
    identityLabel: IDENTITY_DISPLAY_LABELS[identity] ?? identity,
    identityDescription: IDENTITY_DESCRIPTIONS[identity] ?? '',
    decisionStyle: dna.decisionStyle,
    transactionStyle: dna.transactionStyle,
    riskTendency: dna.riskTendency,
    engagementReliability: dna.engagementReliability,
    traits,
  }
}

// ── League archetype card ─────────────────────────────────────────────────────

export function buildLeagueArchetypeCard(
  leagueId: string,
  archetype: {
    label: string
    confidence: number
    reasons: string[]
    derivation: Array<{ signal: string; value: unknown; contribution: string }>
  },
  options?: {
    badges?: Badge[]
    graphs?: GraphModel[]
    metrics?: MetricPresentation[]
    completeness?: number
    uncertainty?: string[]
  },
): LeagueArchetypeCard {
  const opts = options ?? {}
  const label = archetype.label
  const severity = SEVERITY_DEFINITIONS[archetypeToSeverity(label)]
  const derivation = archetype.derivation.map((s) => `${s.signal}=${String(s.value)}: ${s.contribution}`)

  return {
    cardId: `card_${leagueId}_league_archetype`,
    cardType: 'league_archetype',
    entityId: leagueId,
    title: 'League Archetype',
    subtitle: ARCHETYPE_DISPLAY_LABELS[label] ?? label,
    badges: opts.badges ?? [],
    graphs: opts.graphs ?? [],
    metrics: opts.metrics ?? [],
    severity,
    completeness: opts.completeness ?? 100,
    uncertainty: opts.uncertainty ?? (archetype.confidence < 0.60 ? ['archetype_confidence_moderate'] : []),
    derivation,
    version: PRESENTATION_VERSION,
    leagueId,
    archetypeLabel: label,
    archetypeDisplayLabel: ARCHETYPE_DISPLAY_LABELS[label] ?? label,
    archetypeDescription: ARCHETYPE_DESCRIPTIONS[label] ?? '',
    confidence: archetype.confidence,
    reasons: archetype.reasons,
  }
}

// ── Platform benchmark card ───────────────────────────────────────────────────

export function buildPlatformBenchmarkCard(
  leagueId: string,
  bm: {
    archetype: string
    engagement: { percentile: number; rank: number; total: number; archetypePercentile: number | null; archetypeRank: number | null; archetypeCohortSize: number }
    retentionSafety: { percentile: number; rank: number; total: number; archetypePercentile: number | null; archetypeRank: number | null; archetypeCohortSize: number }
    tradeActivity: { percentile: number; rank: number; total: number; archetypePercentile: number | null; archetypeRank: number | null; archetypeCohortSize: number }
    waiverActivity: { percentile: number; rank: number; total: number; archetypePercentile: number | null; archetypeRank: number | null; archetypeCohortSize: number }
    commissionerEfficiency: { percentile: number; rank: number; total: number; archetypePercentile: number | null; archetypeRank: number | null; archetypeCohortSize: number }
  },
  options?: {
    badges?: Badge[]
    graphs?: GraphModel[]
    metrics?: MetricPresentation[]
    completeness?: number
    uncertainty?: string[]
    derivation?: string[]
  },
): PlatformBenchmarkCard {
  const opts = options ?? {}
  const engagementSeverityToken = scoreToSeverity(bm.engagement.percentile)
  const severity = SEVERITY_DEFINITIONS[engagementSeverityToken]

  function dimPresentation(dim: typeof bm.engagement): BenchmarkDimensionPresentation {
    return {
      percentile: dim.percentile,
      rank: dim.rank,
      total: dim.total,
      colorToken: percentileToColorToken(dim.percentile),
    }
  }

  return {
    cardId: `card_${leagueId}_platform_benchmark`,
    cardType: 'platform_benchmark',
    entityId: leagueId,
    title: 'Platform Benchmark',
    subtitle: `vs. ${bm.engagement.total} leagues`,
    badges: opts.badges ?? [],
    graphs: opts.graphs ?? [],
    metrics: opts.metrics ?? [],
    severity,
    completeness: opts.completeness ?? 100,
    uncertainty: opts.uncertainty ?? [],
    derivation: opts.derivation ?? [
      `engagement p${bm.engagement.percentile} rank ${bm.engagement.rank}/${bm.engagement.total} → benchmark card`,
    ],
    version: PRESENTATION_VERSION,
    leagueId,
    archetype: bm.archetype,
    engagement: dimPresentation(bm.engagement),
    retentionSafety: dimPresentation(bm.retentionSafety),
    tradeActivity: dimPresentation(bm.tradeActivity),
    waiverActivity: dimPresentation(bm.waiverActivity),
    commissionerEfficiency: dimPresentation(bm.commissionerEfficiency),
  }
}

// ── Company intelligence card ─────────────────────────────────────────────────

export function buildCompanyIntelligenceCard(
  platformId: string,
  summary: {
    platformHealthScore: number
    healthTier: string
    activeLeagueFraction: number
    criticalRetentionFraction: number
    passiveDormantFraction: number
    derivation: string[]
    completeness: number
  },
  options?: {
    platformLabel?: string | null
    topRetentionDriver?: string | null
    topChurnFactor?: string | null
    badges?: Badge[]
    graphs?: GraphModel[]
    metrics?: MetricPresentation[]
    uncertainty?: string[]
  },
): CompanyIntelligenceCard {
  const opts = options ?? {}
  const severity = SEVERITY_DEFINITIONS[healthTierToSeverity(summary.healthTier)]
  return {
    cardId: `card_${platformId}_company_intelligence`,
    cardType: 'company_intelligence',
    entityId: platformId,
    title: 'Platform Health',
    subtitle: summary.healthTier,
    badges: opts.badges ?? [],
    graphs: opts.graphs ?? [],
    metrics: opts.metrics ?? [],
    severity,
    completeness: summary.completeness,
    uncertainty: opts.uncertainty ?? [],
    derivation: summary.derivation,
    version: PRESENTATION_VERSION,
    platformId,
    platformLabel: opts.platformLabel ?? null,
    platformHealthScore: summary.platformHealthScore,
    healthTier: summary.healthTier,
    activeLeagueFraction: summary.activeLeagueFraction,
    criticalRetentionFraction: summary.criticalRetentionFraction,
    topRetentionDriver: opts.topRetentionDriver ?? null,
    topChurnFactor: opts.topChurnFactor ?? null,
  }
}

// ── Metric builders ───────────────────────────────────────────────────────────

export function buildEngagementMetric(entityId: string, score: number, tier: string, completeness: number): MetricPresentation {
  return {
    metricId: `metric_${entityId}_engagement`,
    label: 'Engagement Score',
    displayValue: String(Math.round(score)),
    numericValue: score,
    colorToken: scoreToColorToken(score),
    severityToken: scoreToSeverity(score),
    trend: null,
    subtext: tier,
    progressValue: score,
    derivation: [`engagementScore=${score} tier=${tier}`],
    completeness,
  }
}

export function buildRetentionMetric(entityId: string, risk: string, completeness: number): MetricPresentation {
  return {
    metricId: `metric_${entityId}_retention`,
    label: 'Retention Risk',
    displayValue: risk.charAt(0).toUpperCase() + risk.slice(1),
    numericValue: null,
    colorToken: retentionRiskToColorToken(risk),
    severityToken: retentionRiskToSeverity(risk),
    trend: null,
    subtext: null,
    progressValue: null,
    derivation: [`retentionRisk=${risk}`],
    completeness,
  }
}

export function buildArchetypeMetric(entityId: string, archetype: string, confidence: number, completeness: number): MetricPresentation {
  return {
    metricId: `metric_${entityId}_archetype`,
    label: 'League Archetype',
    displayValue: ARCHETYPE_DISPLAY_LABELS[archetype] ?? archetype,
    numericValue: null,
    colorToken: archetypeToColorToken(archetype),
    severityToken: archetypeToSeverity(archetype),
    trend: null,
    subtext: `${Math.round(confidence * 100)}% confidence`,
    progressValue: null,
    derivation: [`archetype=${archetype} confidence=${confidence}`],
    completeness,
  }
}
