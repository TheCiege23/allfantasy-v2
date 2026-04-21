/**
 * Chimmy copy for elimination narration. Deterministic, engine-gated copy —
 * only invoked AFTER the tribal reveal engine has committed the elimination,
 * so we never speculate about vote counts or outcomes.
 */

export type EliminationChimmyContext = {
  leagueId: string
  week: number
  eliminatedDisplayName: string
  phase: 'pre_merge' | 'merge'
}

export async function buildEliminationChimmyPrompt(ctx: EliminationChimmyContext): Promise<string | null> {
  const name = (ctx.eliminatedDisplayName ?? '').trim()
  if (!name) return null
  const week = Number.isFinite(ctx.week) ? Math.trunc(ctx.week) : 0
  if (ctx.phase === 'merge') {
    return `The tribe has spoken. @${name}, the torch is snuffed — you join the jury this week (Week ${week}). Your vote in the finale still matters.`
  }
  return `The tribe has spoken. @${name}, you have been voted off the island (Week ${week}). The boat to Exile leaves at dawn — bring your tokens.`
}
