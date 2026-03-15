/**
 * AISportContextResolver — builds sport-aware context strings for AI prompts.
 * Use in waiver-ai, chimmy chat, trade-evaluator, and draft assistant so DeepSeek, Grok, and OpenAI
 * receive explicit sport context for statistical modeling, trends, and explanations.
 */

export interface LeagueMetaForAI {
  sport?: string | null
  leagueName?: string | null
  format?: string | null
  superflex?: boolean
  numTeams?: number
  faabBudget?: number
  currentWeek?: number
  idp?: boolean
  tep?: boolean
  strategyMode?: string | null
  [key: string]: unknown
}

/**
 * Build a short context string to inject into AI prompts so responses are sport-aware.
 * Example: "Sport: NFL. League: 12-team PPR dynasty. SuperFlex. FAAB $100. Week 5."
 */
export function buildSportContextString(meta: LeagueMetaForAI): string {
  const parts: string[] = []
  const sport = (meta.sport ?? 'NFL').toString().toUpperCase()
  parts.push(`Sport: ${sport}`)
  if (meta.leagueName) parts.push(`League: ${meta.leagueName}`)
  if (meta.numTeams) parts.push(`${meta.numTeams}-team`)
  if (meta.format) parts.push(meta.format)
  if (meta.superflex) parts.push('SuperFlex')
  if (meta.idp) parts.push('IDP')
  if (meta.tep) parts.push('TEP')
  if (meta.faabBudget != null) parts.push(`FAAB $${meta.faabBudget}`)
  if (meta.currentWeek != null) parts.push(`Week ${meta.currentWeek}`)
  if (meta.strategyMode) parts.push(`Strategy: ${meta.strategyMode}`)
  return parts.join('. ')
}

/**
 * Resolve sport from request body or league record for AI context.
 */
export function resolveSportForAI(body: Record<string, unknown> | null): string {
  if (!body) return 'NFL'
  const context = body.context as Record<string, unknown> | undefined
  const contextLeague = context?.league as Record<string, unknown> | undefined
  const sport =
    (body.sport as string) ??
    (body.league as Record<string, unknown>)?.sport ??
    contextLeague?.sport
  const s = typeof sport === 'string' ? sport.trim().toUpperCase() : ''
  if (['NFL', 'NHL', 'MLB', 'NBA', 'NCAAF', 'NCAAB', 'SOCCER'].includes(s)) return s
  return 'NFL'
}
