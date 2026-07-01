/**
 * Decision OS — Phase 6: Decision Intelligence Layer.
 *
 * Entry point for all Phase 6 exports. Sub-phases 6.5, 6.1, 6.2, 6.4, 6.6
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
