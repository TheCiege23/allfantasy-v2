/**
 * Decision OS — Phase 5.0 Behavioral Event Foundation.
 *
 * Canonical, provider-agnostic behavioral event substrate.
 * Phase 5.0 exports: types, taxonomy, facts interfaces, runtime helpers.
 * Phase 5.1 will add: port (DB reads), assembler (events → facts).
 *
 * Safe to import from any Decision OS consumer — no IO, no DB access, no Prisma.
 */

export type {
  // Provenance + uncertainty
  BehavioralEventProvenance,
  BehavioralEventUncertainty,

  // Per-event metadata
  LineupViewedMetadata,
  LineupSavedMetadata,
  TradeCreatedMetadata,
  TradeAcceptedMetadata,
  TradeRejectedMetadata,
  WaiverClaimCreatedMetadata,
  WaiverClaimProcessedMetadata,
  CommissionerActionMetadata,
  RulesChangedMetadata,
  LeagueOpenedMetadata,
  LiveScoringOpenedMetadata,
  RecapViewedMetadata,
  DraftStartedMetadata,
  DraftPickMadeMetadata,

  // Metadata map + discriminated union
  BehavioralEventMetadataMap,
  BehavioralEvent,
  BehavioralEventOf,
} from './events/types'

export {
  // Runtime helpers
  isBehavioralEvent,
  clampCompleteness,
  computeEventCompleteness,
  makeSystemProvenance,
  makeImportedProvenance,
  makeMaxUncertainty,
  makeMinUncertainty,
} from './events/types'

export type {
  BehavioralEventType,
  BehavioralEventSource,
  BehavioralEventCategory,
} from './events/taxonomy'

export {
  BEHAVIORAL_EVENT_TYPES,
  BEHAVIORAL_EVENT_SOURCES,
  BEHAVIORAL_EVENT_CATEGORIES,
  BEHAVIORAL_EVENT_LABELS,
  getEventCategory,
  isBehavioralEventType,
  isBehavioralEventSource,
} from './events/taxonomy'

export type {
  ManagerBehavioralFacts,
  LeagueBehavioralFacts,
  BehavioralFactsCoverage,
  ManagerBehavioralAssemblyInput,
  LeagueBehavioralAssemblyInput,
} from './facts'
