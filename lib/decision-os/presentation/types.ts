/**
 * Decision OS — Phase 7.0 Intelligence Presentation Model types.
 *
 * The deterministic presentation layer between Decision Intelligence (Phase 6)
 * and every frontend surface (Dashboard, Widget, Hosted API, SDK, White-label).
 *
 * Constraints (from PHASE_7_0_INTELLIGENCE_PRESENTATION_MODEL_ADR.md):
 *   - Pure types only — no runtime logic in this file
 *   - No imports from Phase 5 or Phase 6 internal type files
 *   - All output types are JSON-serializable (no functions, no circular refs)
 *   - No React, CSS, Tailwind, HTML, SVG, or browser APIs
 */

// ── COLOR TOKEN SYSTEM ────────────────────────────────────────────────────────

/**
 * Semantic color tokens. Frontends resolve via their own theme system or
 * a WhiteLabelConfig. Never use hex codes in the IPM.
 */
export type ColorToken =
  | 'success'           // Positive outcome — green family
  | 'healthy'           // Healthy state — soft green
  | 'positive'          // Good signal — teal/cyan family
  | 'warning'           // Needs attention — amber/yellow
  | 'danger'            // High risk — orange/red border
  | 'critical'          // Immediate action required — red
  | 'neutral'           // No strong signal — gray/muted
  | 'benchmark_above'   // Above platform benchmark — green
  | 'benchmark_equal'   // At platform benchmark — blue
  | 'benchmark_below'   // Below platform benchmark — red
  | 'accent'            // Platform accent / brand color
  | 'surface'           // Background surface
  | 'surface_elevated'  // Elevated card surface
  | 'muted'             // Disabled / inactive state

// ── ICON TOKEN SYSTEM ─────────────────────────────────────────────────────────

/**
 * Semantic icon tokens. Frontends resolve to actual icon components.
 * Never import icon libraries in the IPM.
 */
export type IconToken =
  | 'check'
  | 'check_circle'
  | 'alert_triangle'
  | 'alert_circle'
  | 'x_circle'
  | 'arrow_up'
  | 'arrow_down'
  | 'arrow_right'
  | 'trending_up'
  | 'trending_down'
  | 'trending_flat'
  | 'star'
  | 'trophy'
  | 'target'
  | 'clock'
  | 'users'
  | 'activity'
  | 'shield'
  | 'zap'
  | 'eye'
  | 'bar_chart'
  | 'pie_chart'
  | 'flame'
  | 'thumbs_up'
  | 'ghost'
  | 'none'

// ── VISUAL SEVERITY SYSTEM ────────────────────────────────────────────────────

/** Severity levels driving visual urgency. Priority 1 = most urgent. */
export type SeverityToken = 'critical' | 'elevated' | 'standard' | 'advisory' | 'positive'

/** Animation tokens for severity indicators. */
export type AnimationToken = 'pulse' | 'flash' | 'none'

/**
 * Complete display contract for a severity level.
 * The IPM produces these; frontends apply them to their rendering engine.
 */
export interface SeverityDefinition {
  token: SeverityToken
  /** 1 = most urgent. Used to sort multiple severity indicators. */
  priority: 1 | 2 | 3 | 4 | 5
  displayColorToken: ColorToken
  iconToken: IconToken
  animationToken: AnimationToken
}

// ── BADGE SYSTEM ──────────────────────────────────────────────────────────────

/**
 * A deterministically assigned badge for a manager, league, or platform.
 * Represents a meaningful classification, achievement, or risk signal.
 */
export interface Badge {
  /** Stable ID: `badge_${entityId}_${catalogId}`. */
  id: string
  /** Catalog key, e.g. 'top_10_pct'. Stable across entities. */
  catalogId: string
  /** Display label, e.g. 'Top 10%'. */
  label: string
  /** Longer description for tooltips / expanded views. */
  description: string
  colorToken: ColorToken
  iconToken: IconToken
  tier: 'platform' | 'league' | 'manager'
  /** Full derivation chain — which signals triggered this badge. */
  derivation: string[]
}

// ── METRIC PRESENTATION ───────────────────────────────────────────────────────

/** A single KPI metric ready for display. */
export interface MetricPresentation {
  /** Stable ID: `metric_${entityId}_${metricKey}`. */
  metricId: string
  label: string
  /** Formatted display value, e.g. '87', '43%', 'Active'. */
  displayValue: string
  /** Raw numeric value. Null for qualitative-only metrics. */
  numericValue: number | null
  colorToken: ColorToken
  severityToken: SeverityToken
  /** Optional trend direction vs. prior period. */
  trend: 'up' | 'down' | 'flat' | null
  /** Optional subtext for context. */
  subtext: string | null
  /** Optional 0–100 value for progress-bar variants. */
  progressValue: number | null
  derivation: string[]
  completeness: number
}

// ── GRAPH MODELS ──────────────────────────────────────────────────────────────

export type GraphType =
  | 'bar'
  | 'horizontal_bar'
  | 'line'
  | 'trend'
  | 'sparkline'
  | 'donut'
  | 'gauge'
  | 'progress_ring'
  | 'radar'
  | 'heatmap'
  | 'timeline'
  | 'distribution_histogram'
  | 'comparison_chart'
  | 'ranking_table'
  | 'waterfall'
  | 'activity_calendar'

interface GraphBase {
  /** Stable ID: `graph_${entityId}_${graphType}`. */
  graphId: string
  graphType: GraphType
  title: string
  subtitle: string | null
  colorToken: ColorToken
  completeness: number
  uncertainty: string[]
  derivation: string[]
  version: string
}

export interface BarEntry {
  label: string
  value: number
  colorToken: ColorToken
  rank?: number
  badge?: Badge
  highlight?: boolean
  subtext?: string
}

export interface ReferenceLine {
  value: number
  label: string
  colorToken: ColorToken
}

export interface BarGraphModel extends GraphBase {
  graphType: 'bar'
  xAxisLabel: string
  yAxisLabel: string
  yAxisMin: number
  yAxisMax: number
  bars: BarEntry[]
  sortOrder: 'ascending' | 'descending' | 'none'
  referenceLines: ReferenceLine[]
}

export interface HorizontalBarEntry {
  label: string
  value: number
  maxValue: number
  colorToken: ColorToken
  badge?: Badge
  rank?: number
}

export interface HorizontalBarGraphModel extends GraphBase {
  graphType: 'horizontal_bar'
  xAxisLabel: string
  entries: HorizontalBarEntry[]
  sortOrder: 'ascending' | 'descending' | 'none'
}

export interface LinePoint {
  /** ISO 8601 or sequential label. */
  x: string
  value: number
  colorToken?: ColorToken
  annotationLabel?: string
}

export interface LineSeries {
  seriesId: string
  label: string
  colorToken: ColorToken
  points: LinePoint[]
}

export interface LineGraphModel extends GraphBase {
  graphType: 'line'
  xAxisLabel: string
  yAxisLabel: string
  yAxisMin: number
  yAxisMax: number
  series: LineSeries[]
  referenceLines: ReferenceLine[]
}

export interface TrendGraphModel extends GraphBase {
  graphType: 'trend'
  direction: 'up' | 'down' | 'flat'
  magnitude: number
  magnitudeLabel: string
  baseValue: number
  currentValue: number
}

export interface SparklineGraphModel extends GraphBase {
  graphType: 'sparkline'
  /** Ordered values. */
  values: number[]
  min: number
  max: number
  direction: 'up' | 'down' | 'flat'
}

export interface DonutSegment {
  segmentId: string
  label: string
  value: number
  /** 0–1 fraction of total. */
  fraction: number
  colorToken: ColorToken
  badge?: Badge
}

export interface DonutGraphModel extends GraphBase {
  graphType: 'donut'
  segments: DonutSegment[]
  totalValue: number
  centerLabel: string | null
  centerValue: string | null
}

export interface GaugeThreshold {
  value: number
  label: string
  colorToken: ColorToken
}

export interface GaugeGraphModel extends GraphBase {
  graphType: 'gauge'
  value: number
  min: number
  max: number
  thresholds: GaugeThreshold[]
  displayValue: string
  severityToken: SeverityToken
}

export interface ProgressRingGraphModel extends GraphBase {
  graphType: 'progress_ring'
  /** 0–100. */
  value: number
  displayValue: string
  label: string
  severityToken: SeverityToken
}

export interface RadarDimension {
  dimensionId: string
  label: string
  /** 0–1 normalized. */
  value: number
  rawValue: string
  colorToken: ColorToken
}

export interface RadarGraphModel extends GraphBase {
  graphType: 'radar'
  dimensions: RadarDimension[]
  /** Platform-average comparison dimensions (0–1 normalized). */
  benchmarkDimensions: RadarDimension[]
}

export interface HeatmapCell {
  /** 0–6 day-of-week (0=Sunday) or x-index. */
  x: number
  /** 0–23 hour or y-index. */
  y: number
  value: number
  /** 0–1 relative to max. */
  normalizedValue: number
  colorToken: ColorToken
}

export interface HeatmapGraphModel extends GraphBase {
  graphType: 'heatmap'
  xLabels: string[]
  yLabels: string[]
  cells: HeatmapCell[]
  peakCell: { x: number; y: number; value: number } | null
  totalValue: number
}

export interface TimelineEvent {
  eventId: string
  label: string
  startedAt: string
  endedAt: string
  durationDays: number
  colorToken: ColorToken
  iconToken: IconToken
  summary: string
}

export interface TimelineGraphModel extends GraphBase {
  graphType: 'timeline'
  events: TimelineEvent[]
  earliestAt: string | null
  latestAt: string | null
}

export interface HistogramBucket {
  bucketId: string
  rangeLabel: string
  min: number
  max: number
  count: number
  /** 0–1 fraction of total count. */
  fraction: number
  colorToken: ColorToken
  /** True when this bucket contains the current entity's value. */
  highlight: boolean
}

export interface DistributionHistogramGraphModel extends GraphBase {
  graphType: 'distribution_histogram'
  xAxisLabel: string
  yAxisLabel: string
  buckets: HistogramBucket[]
  highlightBucketId: string | null
  mean: number
  median: number
}

export interface ComparisonEntry {
  entryId: string
  label: string
  value: number
  colorToken: ColorToken
  isCurrentEntity: boolean
  badge?: Badge
}

export interface ComparisonChartGraphModel extends GraphBase {
  graphType: 'comparison_chart'
  xAxisLabel: string
  entries: ComparisonEntry[]
  referenceLines: ReferenceLine[]
}

export interface RankingEntry {
  rank: number
  entryId: string
  label: string
  value: number
  displayValue: string
  colorToken: ColorToken
  isCurrentEntity: boolean
  badges: Badge[]
}

export interface RankingTableGraphModel extends GraphBase {
  graphType: 'ranking_table'
  columnLabel: string
  entries: RankingEntry[]
  totalEntries: number
}

export interface WaterfallStep {
  stepId: string
  label: string
  delta: number
  runningTotal: number
  colorToken: ColorToken
  isBase: boolean
  isFinal: boolean
}

export interface WaterfallGraphModel extends GraphBase {
  graphType: 'waterfall'
  baseValue: number
  finalValue: number
  steps: WaterfallStep[]
}

export interface ActivityDay {
  /** YYYY-MM-DD. */
  date: string
  count: number
  /** 0–1 relative to max. */
  normalizedValue: number
  colorToken: ColorToken
}

export interface ActivityCalendarGraphModel extends GraphBase {
  graphType: 'activity_calendar'
  days: ActivityDay[]
  earliestDate: string | null
  latestDate: string | null
  maxCount: number
  totalCount: number
}

export type GraphModel =
  | BarGraphModel
  | HorizontalBarGraphModel
  | LineGraphModel
  | TrendGraphModel
  | SparklineGraphModel
  | DonutGraphModel
  | GaugeGraphModel
  | ProgressRingGraphModel
  | RadarGraphModel
  | HeatmapGraphModel
  | TimelineGraphModel
  | DistributionHistogramGraphModel
  | ComparisonChartGraphModel
  | RankingTableGraphModel
  | WaterfallGraphModel
  | ActivityCalendarGraphModel

// ── CARD MODELS ───────────────────────────────────────────────────────────────

export type CardType =
  | 'health'
  | 'recommendation'
  | 'insight'
  | 'retention'
  | 'commissioner'
  | 'manager'
  | 'dna'
  | 'league_archetype'
  | 'platform_benchmark'
  | 'company_intelligence'

interface CardBase {
  /** Stable ID: `card_${entityId}_${cardType}`. */
  cardId: string
  cardType: CardType
  entityId: string
  title: string
  subtitle: string | null
  badges: Badge[]
  graphs: GraphModel[]
  metrics: MetricPresentation[]
  severity: SeverityDefinition
  completeness: number
  uncertainty: string[]
  derivation: string[]
  version: string
}

export interface ScoreDeduction {
  label: string
  delta: number
  colorToken: ColorToken
}

export interface HealthCard extends CardBase {
  cardType: 'health'
  healthScore: number
  healthTier: string
  displayScore: string
  subText: string
  deductions: ScoreDeduction[]
}

export interface RecommendationCard extends CardBase {
  cardType: 'recommendation'
  recommendationId: string
  category: string
  priority: string
  expectedImpact: string
  difficulty: 'easy' | 'moderate' | 'hard'
  estimatedTime: '5_min' | '30_min' | '1_hour' | 'ongoing'
  actions: Array<{ action: string; rationale: string }>
  rollbackCriteria: string[]
}

export interface InsightCard extends CardBase {
  cardType: 'insight'
  insightKey: string
  insightLabel: string
  signal: string
  actionableSignal: string
}

export interface RetentionCard extends CardBase {
  cardType: 'retention'
  retentionRisk: string
  riskReasons: string[]
  managersAtRisk: number | null
  totalManagers: number | null
}

export interface CommissionerCard extends CardBase {
  cardType: 'commissioner'
  workloadLevel: string
  workloadItems: string[]
  actionItems: Array<{ kind: string; message: string; severityToken: SeverityToken }>
}

export interface ManagerCard extends CardBase {
  cardType: 'manager'
  managerId: string
  leagueId: string
  participationTier: string
  retentionRisk: string
  overallEngagementScore: number
  daysSinceLastActivity: number | null
  isInactive: boolean
}

export interface DnaTrait {
  trait: string
  strength: string
  colorToken: ColorToken
}

export interface DnaCard extends CardBase {
  cardType: 'dna'
  managerId: string
  primaryIdentity: string
  identityLabel: string
  identityDescription: string
  decisionStyle: string
  transactionStyle: string
  riskTendency: string
  engagementReliability: string
  traits: DnaTrait[]
}

export interface LeagueArchetypeCard extends CardBase {
  cardType: 'league_archetype'
  leagueId: string
  archetypeLabel: string
  archetypeDisplayLabel: string
  archetypeDescription: string
  confidence: number
  reasons: string[]
}

export interface BenchmarkDimensionPresentation {
  percentile: number
  rank: number
  total: number
  colorToken: ColorToken
}

export interface PlatformBenchmarkCard extends CardBase {
  cardType: 'platform_benchmark'
  leagueId: string
  archetype: string
  engagement: BenchmarkDimensionPresentation
  retentionSafety: BenchmarkDimensionPresentation
  tradeActivity: BenchmarkDimensionPresentation
  waiverActivity: BenchmarkDimensionPresentation
  commissionerEfficiency: BenchmarkDimensionPresentation
}

export interface CompanyIntelligenceCard extends CardBase {
  cardType: 'company_intelligence'
  platformId: string
  platformLabel: string | null
  platformHealthScore: number
  healthTier: string
  activeLeagueFraction: number
  criticalRetentionFraction: number
  topRetentionDriver: string | null
  topChurnFactor: string | null
}

export type CardModel =
  | HealthCard
  | RecommendationCard
  | InsightCard
  | RetentionCard
  | CommissionerCard
  | ManagerCard
  | DnaCard
  | LeagueArchetypeCard
  | PlatformBenchmarkCard
  | CompanyIntelligenceCard

// ── RECOMMENDATION PRESENTATION ───────────────────────────────────────────────

export type RecommendationDifficulty = 'easy' | 'moderate' | 'hard'
export type RecommendationTimeEstimate = '5_min' | '30_min' | '1_hour' | 'ongoing'
export type RecommendationCompletionStatus = 'pending' | 'in_progress' | 'completed' | 'dismissed'

export interface RecommendationPresentation {
  recommendationId: string
  tier: string
  category: string
  entityId: string
  priority: string
  severity: SeverityDefinition
  colorToken: ColorToken
  iconToken: IconToken
  /** Short display-ready title. */
  title: string
  /** Detailed explanation. */
  description: string
  expectedImpact: string
  difficulty: RecommendationDifficulty
  estimatedTime: RecommendationTimeEstimate
  supportingEvidence: string[]
  actions: Array<{ action: string; rationale: string }>
  rollbackCriteria: string[]
  prerequisites: string[]
  completionStatus: RecommendationCompletionStatus
  /** Supporting graph for this recommendation. Null when no relevant graph. */
  relatedGraph: GraphModel | null
  /** Related KPI this recommendation addresses. */
  relatedKpi: MetricPresentation | null
  benchmarkContext: string | null
  uncertainty: string[]
  derivation: string[]
  completeness: number
}

export interface RecommendationPresentationSet {
  entityId: string
  tier: string
  /** Sorted: priority DESC → severity DESC → category ASC → id ASC */
  items: RecommendationPresentation[]
  totalItems: number
  criticalCount: number
  version: string
}

// ── WIDGET CONTRACTS ──────────────────────────────────────────────────────────

export type WidgetType =
  | 'compact'
  | 'sidebar'
  | 'full_dashboard'
  | 'popup'
  | 'commissioner'
  | 'manager'
  | 'mobile'
  | 'partner'

interface WidgetBase {
  /** Stable ID: `widget_${entityId}_${widgetType}`. */
  widgetId: string
  widgetType: WidgetType
  entityId: string
  entityType: 'manager' | 'league' | 'platform' | 'company'
  title: string
  subtitle: string | null
  completeness: number
  uncertainty: string[]
  derivation: string[]
  version: string
}

export interface CompactWidget extends WidgetBase {
  widgetType: 'compact'
  primaryMetric: MetricPresentation
  badge: Badge | null
  trend: TrendGraphModel | null
}

export interface SidebarWidget extends WidgetBase {
  widgetType: 'sidebar'
  healthCard: HealthCard | null
  /** Max 3. */
  topMetrics: MetricPresentation[]
  topRecommendation: RecommendationPresentation | null
  badges: Badge[]
}

export interface FullDashboardWidget extends WidgetBase {
  widgetType: 'full_dashboard'
  cards: CardModel[]
  graphs: GraphModel[]
  recommendations: RecommendationPresentationSet | null
  badges: Badge[]
  metrics: MetricPresentation[]
}

export interface PopupWidget extends WidgetBase {
  widgetType: 'popup'
  healthScore: number
  healthColorToken: ColorToken
  healthSeverity: SeverityDefinition
  /** Max 3. */
  topRecommendations: RecommendationPresentation[]
  primaryBadge: Badge | null
}

export interface CommissionerWidget extends WidgetBase {
  widgetType: 'commissioner'
  workloadCard: CommissionerCard | null
  retentionCard: RetentionCard | null
  archetypeCard: LeagueArchetypeCard | null
  /** Commissioner-tier recommendations only. */
  recommendations: RecommendationPresentation[]
  atRiskMetrics: MetricPresentation[]
  healthGraph: GaugeGraphModel | null
}

export interface ManagerWidget extends WidgetBase {
  widgetType: 'manager'
  managerId: string
  leagueId: string
  dnaCard: DnaCard | null
  managerCard: ManagerCard | null
  /** Manager-tier recommendations only. */
  recommendations: RecommendationPresentation[]
  radarGraph: RadarGraphModel | null
  badges: Badge[]
}

export interface MobileWidget extends WidgetBase {
  widgetType: 'mobile'
  primaryMetric: MetricPresentation
  healthScore: number | null
  topRecommendation: RecommendationPresentation | null
  badges: Badge[]
}

export interface WhiteLabelConfig {
  platform: string
  displayName: string
  colorTokenMap: Partial<Record<ColorToken, string>>
  iconTokenMap: Partial<Record<IconToken, string>>
  labelOverrides: Partial<{
    healthScore: string
    engagement: string
    retentionRisk: string
    commissionerWorkload: string
    tradeActivity: string
    waiverActivity: string
    recommendations: string
  }>
  sectionVisibility: Partial<{
    benchmarkComparison: boolean
    archetypeClassification: boolean
    behavioralPatterns: boolean
    companyIntelligence: boolean
  }>
}

export interface PartnerWidget extends WidgetBase {
  widgetType: 'partner'
  whiteLabelConfig: WhiteLabelConfig
  /** The embedded widget — one of compact, sidebar, or popup. */
  content: CompactWidget | SidebarWidget | PopupWidget
}

export type WidgetContract =
  | CompactWidget
  | SidebarWidget
  | FullDashboardWidget
  | PopupWidget
  | CommissionerWidget
  | ManagerWidget
  | MobileWidget
  | PartnerWidget

// ── HOSTED API PRESENTATION SHAPES ───────────────────────────────────────────

export interface ManagerApiPresentation {
  entityId: string
  entityType: 'manager'
  healthScore: number
  healthSeverity: SeverityDefinition
  primaryIdentity: string
  identityLabel: string
  retentionRisk: string
  engagementScore: number
  badges: Badge[]
  topRecommendations: RecommendationPresentation[]
  metrics: MetricPresentation[]
  completeness: number
  version: string
}

export interface LeagueApiPresentation {
  entityId: string
  entityType: 'league'
  healthScore: number
  healthSeverity: SeverityDefinition
  archetype: string
  archetypeLabel: string
  retentionRisk: string
  engagementTier: string
  badges: Badge[]
  topRecommendations: RecommendationPresentation[]
  metrics: MetricPresentation[]
  benchmarkSummary: {
    engagementPercentile: number
    retentionSafetyPercentile: number
    archetypeCohortRank: number | null
  } | null
  completeness: number
  version: string
}

export interface PlatformApiPresentation {
  entityId: string
  entityType: 'platform'
  platformHealthScore: number
  platformHealthSeverity: SeverityDefinition
  platformEngagementTier: string
  leagueCount: number
  managerCount: number
  badges: Badge[]
  topRecommendations: RecommendationPresentation[]
  metrics: MetricPresentation[]
  archetypeDistribution: Array<{
    label: string
    count: number
    fraction: number
    colorToken: ColorToken
  }>
  interventions: Array<{
    scope: 'league' | 'manager'
    priority: string
    message: string
    severity: SeverityDefinition
  }>
  completeness: number
  version: string
}

export interface CompanyApiPresentation {
  entityId: string
  entityType: 'company'
  platformHealthScore: number
  healthTier: string
  healthSeverity: SeverityDefinition
  retentionDriverSummary: string | null
  churnRiskSummary: string | null
  cohortRecommendations: Array<{
    targetArchetype: string
    recommendation: string
    priority: string
    impact: string
  }>
  dataQuality: number
  completeness: number
  version: string
}

// ── TOP-LEVEL PRESENTATION RESULTS ───────────────────────────────────────────

export interface ManagerPresentationResult {
  managerId: string
  leagueId: string
  dnaCard: DnaCard | null
  managerCard: ManagerCard | null
  badges: Badge[]
  recommendations: RecommendationPresentationSet | null
  graphs: GraphModel[]
  metrics: MetricPresentation[]
  apiPresentation: ManagerApiPresentation
  widget: ManagerWidget
  completeness: number
  uncertainty: string[]
  derivation: string[]
  version: string
}

export interface LeaguePresentationResult {
  leagueId: string
  archetypeCard: LeagueArchetypeCard | null
  benchmarkCard: PlatformBenchmarkCard | null
  retentionCard: RetentionCard | null
  commissionerCard: CommissionerCard | null
  healthCard: HealthCard | null
  badges: Badge[]
  recommendations: RecommendationPresentationSet | null
  graphs: GraphModel[]
  metrics: MetricPresentation[]
  apiPresentation: LeagueApiPresentation
  widget: SidebarWidget
  completeness: number
  uncertainty: string[]
  derivation: string[]
  version: string
}

export interface CommissionerPresentationResult {
  leagueId: string
  commissionerWidget: CommissionerWidget
  cards: CardModel[]
  badges: Badge[]
  recommendations: RecommendationPresentationSet | null
  metrics: MetricPresentation[]
  graphs: GraphModel[]
  completeness: number
  uncertainty: string[]
  derivation: string[]
  version: string
}

export interface PlatformPresentationResult {
  platformId: string
  fullDashboard: FullDashboardWidget
  badges: Badge[]
  recommendations: RecommendationPresentationSet | null
  metrics: MetricPresentation[]
  graphs: GraphModel[]
  apiPresentation: PlatformApiPresentation
  completeness: number
  uncertainty: string[]
  derivation: string[]
  version: string
}

export interface CompanyPresentationResult {
  platformId: string
  platformLabel: string | null
  cards: CardModel[]
  badges: Badge[]
  recommendations: RecommendationPresentationSet | null
  metrics: MetricPresentation[]
  graphs: GraphModel[]
  apiPresentation: CompanyApiPresentation
  completeness: number
  uncertainty: string[]
  derivation: string[]
  version: string
}

// ── 7.0-LOCAL INPUT SLICES ────────────────────────────────────────────────────
// Structural mirrors of Phase 5/6 outputs — no cross-module imports.

export interface IpmEngagementDimension {
  score: number
  level: string
}

export interface IpmManagerInput {
  managerId: string
  leagueId: string
  participationTier: string
  retentionRisk: string
  retentionRiskReasons: string[]
  overallEngagementScore: number
  engagementDimensions: {
    lineup: IpmEngagementDimension
    waiver: IpmEngagementDimension
    trade: IpmEngagementDimension
    draft: IpmEngagementDimension
  }
  daysSinceLastActivity: number | null
  isInactive: boolean
  completeness: number
  dna?: {
    primaryIdentity: string
    confidence: number
    decisionStyle: string
    transactionStyle: string
    riskTendency: string
    engagementReliability: string
    traits: Array<{ trait: string; strength: string }>
    derivation: string[]
    completeness: number
  }
  benchmark?: {
    engagement: { percentile: number; rank: number; total: number }
    retentionSafety: { percentile: number; rank: number; total: number }
    tradeActivity: { percentile: number; rank: number; total: number }
    waiverActivity: { percentile: number; rank: number; total: number }
    commissionerEfficiency: { percentile: number; rank: number; total: number }
    archetype: string
    archetypeCohortSize: number
  }
  patterns?: Array<{
    patternType: string
    confidence: string
    occurrenceCount: number
    firstDetectedAt: string
    lastDetectedAt: string
    evidenceWindows: Array<{ startedAt: string; endedAt: string; summary: string }>
    derivation: string[]
  }>
  recommendations?: Array<{
    id: string
    tier: string
    category: string
    entityId: string
    priority: string
    severity: string
    confidence: string
    affectedDimensions: string[]
    expectedImpact: string
    derivation: string[]
    evidence: string[]
    benchmarkComparison: string | null
    prerequisites: string[]
    recommendedActions: Array<{ action: string; rationale: string }>
    rollbackCriteria: string[]
    completeness: number
    uncertainty: string[]
  }>
}

export interface IpmLeagueInput {
  leagueId: string
  leagueEngagementScore: number
  leagueEngagementTier: string
  retentionRisk: string
  commissionerWorkload: string
  participationDistribution: {
    totalManagers: number
    activeManagers: number
    inactiveManagers: number
    activePercent: number
    inactivePercent: number
  }
  tradeActivity: { tier: string; perManagerRate: number }
  waiverActivity: { tier: string; perManagerRate: number }
  completeness: number
  archetype?: {
    label: string
    confidence: number
    reasons: string[]
    derivation: Array<{ signal: string; value: unknown; contribution: string }>
  }
  benchmark?: {
    engagement: { percentile: number; rank: number; total: number; archetypePercentile: number | null; archetypeRank: number | null; archetypeCohortSize: number }
    retentionSafety: { percentile: number; rank: number; total: number; archetypePercentile: number | null; archetypeRank: number | null; archetypeCohortSize: number }
    tradeActivity: { percentile: number; rank: number; total: number; archetypePercentile: number | null; archetypeRank: number | null; archetypeCohortSize: number }
    waiverActivity: { percentile: number; rank: number; total: number; archetypePercentile: number | null; archetypeRank: number | null; archetypeCohortSize: number }
    commissionerEfficiency: { percentile: number; rank: number; total: number; archetypePercentile: number | null; archetypeRank: number | null; archetypeCohortSize: number }
    archetype: string
    archetypeCohortSize: number
  }
  recommendations?: IpmManagerInput['recommendations']
}

export interface IpmPlatformInput {
  platformId: string
  platformEngagementScore: number
  platformEngagementTier: string
  uncertainty: string
  leagueHealthDistribution: {
    elite: number; active: number; moderate: number; passive: number; dormant: number
    totalLeagues: number; healthyPercent: number; atRiskPercent: number
  }
  retentionDistribution: {
    managersByCriticalRisk: number; managersByHighRisk: number
    managersByMediumRisk: number; managersByLowRisk: number
    totalManagers: number; managerAtRiskPercent: number
    leaguesByCriticalRisk: number; leaguesByHighRisk: number
    leaguesByMediumRisk: number; leaguesByLowRisk: number
    totalLeagues: number; leagueAtRiskPercent: number
  }
  engagementTrends: {
    momentumSignal: string
    trendConfidence: string
    recentActivityRatio: number | null
    recentlyActiveManagerPercent: number | null
  }
  activityHeatmap?: {
    cells: Array<{ dayOfWeek: number; hour: number; count: number }>
    peakDayOfWeek: number | null
    peakHour: number | null
    peakCount: number
    totalEventsAnalyzed: number
  }
  completeness: number
  archetypeDistribution?: Record<string, number>
  recommendations?: IpmManagerInput['recommendations']
}

export interface IpmCompanyInput {
  platformId: string
  platformLabel: string | null
  engagementHealthSummary: {
    platformHealthScore: number
    healthTier: string
    activeLeagueFraction: number
    passiveDormantFraction: number
    criticalRetentionFraction: number
    inactiveArchetypeFraction: number
    derivation: string[]
    completeness: number
  }
  retentionDrivers?: Array<{
    driverKey: string
    label: string
    strength: string
    affectedLeagueFraction: number
    derivation: string[]
    actionableSignal: string
    completeness: number
  }>
  churnRiskFactors?: Array<{
    factorKey: string
    label: string
    riskLevel: string
    affectedLeagueFraction: number
    derivation: string[]
    mitigationSignal: string
    completeness: number
  }>
  cohortRecommendations?: Array<{
    targetArchetypeLabel: string
    targetLeagueCount: number
    recommendation: string
    priority: string
    expectedImpact: string
    derivation: string[]
  }>
  dataQualityReport?: {
    overallCompleteness: number
    insufficientData: boolean
    warnings: string[]
  }
  completeness: number
}
