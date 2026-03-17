/**
 * PROMPT 127 — Deterministic Evidence Layer.
 * Shared evidence system: AI responses display deterministic facts first; no invented metrics.
 * Supported sports: NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER (lib/sport-scope).
 */

export {
  DeterministicContextEnvelopeSchema,
  type DeterministicContextEnvelope,
  EvidenceItemSchema,
  EvidenceBlockSchema,
  EvidenceSchema,
  type EvidenceItem,
  type EvidenceBlock,
  ConfidenceSchema,
  type Confidence,
  UncertaintyItemSchema,
  UncertaintyBlockSchema,
  UncertaintySchema,
  type UncertaintyItem,
  type UncertaintyBlock,
  MissingDataItemSchema,
  MissingDataBlockSchema,
  type MissingDataItem,
  type MissingDataBlock,
  NormalizedToolOutputSchema,
  type NormalizedToolOutput,
  AI_TOOL_IDS,
  type AIToolId,
} from '@/lib/ai-context-envelope/schema'

export {
  type ProviderInputContract,
  getMandatorySystemPromptSuffix,
  normalizeToContract,
  buildEnvelopeFromTool,
  type ProviderRawOutput,
} from '@/lib/ai-context-envelope/contracts'

import type { NormalizedToolOutput } from '@/lib/ai-context-envelope/schema'

/** Provider output contract: normalized tool output (evidence, confidence, uncertainty, missingData). */
export type ProviderOutputContract = NormalizedToolOutput
