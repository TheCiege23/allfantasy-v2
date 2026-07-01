/**
 * Decision OS — Phase 6: Decision Intelligence Layer.
 *
 * Entry point for all Phase 6 exports. Sub-phases 6.1, 6.2, 6.4, 6.6
 * will add their exports here as they are built.
 */

// 6.3 — League Archetype Classifier
export { classifyLeagueArchetype, ARCHETYPE_VERSION } from './archetypes/league-archetypes'
export type {
  LeagueArchetypeInput,
  LeagueArchetypeLabel,
  LeagueArchetypeResult,
  ArchetypeDerivationStep,
  ArchetypeSignalCoverage,
  LeagueActivitySignalInput,
  LeagueParticipationInput,
  LeagueEngagementTierInput,
  ActivityTierInput,
  RetentionRiskInput,
  CommissionerWorkloadInput,
} from './archetypes/types'

// 6.1 — Behavioral Patterns
export { detectBehavioralPatterns, PATTERN_VERSION } from './patterns/patterns'
export type {
  BehavioralPatternLabel,
  PatternConfidence,
  EvidenceWindow,
  DetectedPattern,
  ManagerPatternGroup,
  BehavioralPatternInput,
  BehavioralPatternResult,
} from './patterns/types'

// 6.5 — Platform Benchmarking
export { assemblePlatformBenchmark, BENCHMARK_VERSION } from './benchmark/benchmark'
export type {
  LeagueSignalInput,
  TaggedArchetypeResult,
  DimensionPercentileRank,
  LeagueBenchmarkResult,
  ArchetypeCohortStats,
  PlatformRankSignal,
  PlatformBenchmarkStats,
  PlatformBenchmarkResult,
  BenchmarkRiskLevel,
  BenchmarkWorkloadLevel,
  BenchmarkActivityInput,
} from './benchmark/types'
