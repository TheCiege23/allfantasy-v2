/**
 * Decision OS three-brain — standalone analysis service (Phase 1).
 * DeepSeek (analyst) ∥ Grok (trend) → OpenAI synthesis → validated + server-bounded result.
 * Not wired into any live Decision OS route, persistence, or token flow yet (see later phases).
 */
export * from './types'
export * from './schemas'
export * from './evidencePacket'
export * from './prompts'
export * from './validate'
export * from './confidence'
export * from './orchestrator'
