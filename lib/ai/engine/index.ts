/**
 * AllFantasy Universal AI Engine — Public API
 *
 * The entry point for all AI features across every sport.
 * Import `runAIEngine` in your API route instead of calling sport-specific
 * AI functions directly.
 *
 * @example
 * ```ts
 * import { runAIEngine } from "@/lib/ai/engine"
 *
 * const result = await runAIEngine({
 *   sport: "world_cup",
 *   feature: "pool_swing",
 *   userQuestion: "Which match should I watch?",
 *   userId: auth.user.id,
 *   contextId: challengeId,
 *   entitlements: { plan: "commissioner" },
 *   userRole: "commissioner",
 * })
 *
 * return NextResponse.json({
 *   text: result.aiResponse,
 *   insights: result.insights,
 *   source: result.dataSource,
 *   meta: result.meta,
 * })
 * ```
 */
export { runAIEngine } from "./engine"
export { getPlugin, registerPlugin, getRegisteredSports } from "./registry"
export type {
  SportPlugin,
  AIEngineInput,
  AIEngineOutput,
  DataSourceMeta,
  DataFreshnessTier,
  SportKey,
  FeatureKey,
  UserRole,
  AiProfile,
} from "./types"
