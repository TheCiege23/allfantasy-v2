/**
 * Draft AI assist — BPA/needs recommendation and optional explanation.
 * Stub implementation; extend with real BPA/needs logic and optional LLM.
 */

export interface DraftAIAssistInput {
  available: { name: string; position: string; team: string | null; adp: number | null; byeWeek: number | null }[]
  teamRoster: unknown[]
  rosterSlots: unknown[]
  round: number
  pick: number
  totalTeams: number
  sport: string
  isDynasty: boolean
  isSF: boolean
  mode: 'bpa' | 'needs'
  aiAdpByKey?: Record<string, number>
  byeByKey?: Record<string, number>
}

export interface DraftAIAssistOptions {
  explanation?: boolean
  sport?: string
  idp?: boolean
  recommendationContext?: string
  leagueId?: string
}

export interface DraftAIRecommendation {
  recommendation: string
  alternatives: string[]
  reachWarning?: string | null
  valueWarning?: string | null
  scarcityInsight?: string | null
  byeNote?: string | null
  caveats?: string[] | null
  explanation?: string | null
}

export interface DraftAIAssistResult {
  recommendation: DraftAIRecommendation
  explanation?: string | null
}

/**
 * Return best available or needs-based pick recommendation. Deterministic core; optional AI explanation.
 */
export async function runDraftAIAssist(
  input: DraftAIAssistInput,
  _options: DraftAIAssistOptions
): Promise<DraftAIAssistResult> {
  const sorted = [...input.available].sort((a, b) => {
    const adpA = a.adp ?? 9999
    const adpB = b.adp ?? 9999
    return adpA - adpB
  })
  const top = sorted[0]
  const rec: DraftAIRecommendation = {
    recommendation: top?.name ?? 'No player',
    alternatives: sorted.slice(1, 4).map((p) => p.name).filter(Boolean),
    reachWarning: null,
    valueWarning: null,
    scarcityInsight: null,
    byeNote: null,
    caveats: null,
  }
  const contextSummary = _options.recommendationContext
    ? ` Context: ${_options.recommendationContext}.`
    : ''
  const idpSummary = _options.idp ? ' IDP roster/scoring context is enabled.' : ''
  return {
    recommendation: rec,
    explanation: _options.explanation
      ? `Top of board by ADP: ${rec.recommendation}.${_options.sport ? ` Sport: ${_options.sport}.` : ''}${idpSummary}${contextSummary}`
      : null,
  }
}
