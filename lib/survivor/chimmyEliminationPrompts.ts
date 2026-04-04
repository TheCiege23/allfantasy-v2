/**
 * Chimmy copy for elimination / edge-case narration (deterministic context only).
 * TODO: Wire to Chimmy handler when survivor tribal reveal + user locale are available.
 * See product edge-case doc: never assert vote counts or outcomes the engine has not committed.
 */

export type EliminationChimmyContext = {
  leagueId: string
  week: number
  eliminatedDisplayName: string
  phase: 'pre_merge' | 'merge'
}

/** Placeholder — returns null until OpenAI/Chimmy pipeline is hooked with audit gates. */
export async function buildEliminationChimmyPrompt(_ctx: EliminationChimmyContext): Promise<string | null> {
  return null
}
