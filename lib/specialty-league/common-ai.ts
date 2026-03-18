/**
 * Common AI modules for specialty leagues (PROMPT 350).
 * Shared pattern: deterministic context → prompt builder → LLM generate; entitlement gate; Chimmy context injection.
 */

import type { LeagueSport } from '@prisma/client'

/** Entitlement check for specialty AI (e.g. survivor_ai, guillotine_ai). Returns true if user has access. */
export type SpecialtyAIEntitlementCheck = (userId: string, featureId: string) => Promise<boolean>

/** Build deterministic context for prompts. No outcome logic — data only. */
export type BuildAIContextFn<TContext = unknown> = (args: {
  leagueId: string
  weekOrPeriod: number
  type: string
  userId: string
  userRosterId?: string
}) => Promise<TContext | null>

/** Build { system, user } prompt from context and type. All prompts must state: no legal outcomes from AI. */
export type BuildAIPromptFn<TContext = unknown> = (
  context: TContext,
  type: string
) => { system: string; user: string }

/** Call LLM and return explanation/narrative. */
export type GenerateAIFn<TContext = unknown> = (
  context: TContext,
  type: string
) => Promise<{ narrative: string; explanation?: string; model?: string }>

/** Optional: build short context string for Chimmy when user is in this league (inject into chat). */
export type BuildChimmyContextFn = (leagueId: string, userId: string) => Promise<string>

/**
 * Common AI flow: 1) buildContext (deterministic), 2) buildPrompt(context, type), 3) generate(context, type).
 * Outcome logic (elimination, vote count, etc.) must never be in AI path.
 */
export const SPECIALTY_AI_RULE =
  'Deterministic context only. AI never decides: elimination, vote validity, power validity, immunity, or return. AI explains and narrates only.'

/** AI host prompt types (reusable across Survivor, Big Brother, etc.). */
export const COMMON_AI_HOST_TYPES = [
  'host_intro',
  'host_weekly',
  'host_merge',
  'host_round_close',
  'host_scroll_reveal',
  'host_jury_finale',
] as const

/** AI helper prompt types. */
export const COMMON_AI_HELPER_TYPES = [
  'tribe_strategy',
  'power_advice',
  'round_risk',
  'sidecar_strategy',
  'return_strategy',
  'bestball_advice',
] as const

/** AI recap / narrative types (deterministic context → narrative only; no outcome logic). */
export const COMMON_AI_RECAP_TYPES = [
  'weekly_recap',
  'most_at_risk',
  'commissioner_summary',
  'level_storylines',
  'promotion_relegation_outlook',
  'universe_health_summary',
] as const

export type CommonAIHostType = (typeof COMMON_AI_HOST_TYPES)[number]
export type CommonAIHelperType = (typeof COMMON_AI_HELPER_TYPES)[number]
export type CommonAIRecapType = (typeof COMMON_AI_RECAP_TYPES)[number]
