/**
 * Decision OS Replay Framework — version resolution, per
 * docs/SLEEPER_TRADE_REPLAY_ARCHITECTURE_ADR.md §2.2 and §4 ("Version replay
 * results"). A backtest result is keyed by (modelVersion, engineVersionHash,
 * deterministicConfigVersion) so re-running a backtest after a future
 * engine/config change produces a new row rather than overwriting history —
 * this is what makes cross-version offline evaluation possible.
 */

/**
 * Stable, human-readable identifier for the scoring *approach*. Changes only
 * when the shape of the deterministic trade-scoring algorithm itself changes
 * (not for every commit) — distinct from `engineVersionHash`, which changes
 * on every commit to the engine's implementation.
 */
export const TRADE_MODEL_VERSION = 'trade-engine-deterministic-v1'

/**
 * Reuses the exact same env-var precedence already established by
 * app/api/af-debug/sha/route.ts for identifying which commit is running —
 * not a new convention.
 */
export function resolveEngineVersionHash(env: NodeJS.ProcessEnv = process.env): string {
  return (
    env.BUILD_SHA ||
    env.RAILWAY_GIT_COMMIT_SHA ||
    env.VERCEL_GIT_COMMIT_SHA ||
    env.NEXT_PUBLIC_BUILD_SHA ||
    'dev'
  )
}

/**
 * Identifies the specific tunable configuration (the season's currently
 * active calibratedB0) used to produce a given backtest — distinct from
 * `engineVersionHash`, since `calibratedB0` can change (via promoteShadowB0())
 * without any code change at all.
 */
export function computeDeterministicConfigVersion(calibratedB0: number): string {
  return `b0:${calibratedB0.toFixed(4)}`
}
