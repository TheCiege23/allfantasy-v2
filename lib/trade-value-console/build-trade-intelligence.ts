import 'server-only'

import type { TradeConsoleLeagueSnapshot, TradeIntelligence, TradeStrategyMode, TeamContextMode } from './types'

type DriverLike = {
  lean?: string
  verdict?: string
  riskFlags?: string[]
  acceptBullets?: string[]
}

function pickSweetenerText(s: { suggestion?: string; type?: string; target?: string }): string | null {
  if (s.suggestion?.trim()) return s.suggestion.trim()
  if (s.type && s.target) return `${s.type}: ${s.target}`
  return null
}

export function buildTradeIntelligence(args: {
  league: TradeConsoleLeagueSnapshot | null
  strategy: TradeStrategyMode
  teamContext: TeamContextMode
  fairnessLabel: string
  sideAdvantage: 'even' | 'you' | 'opponent' | 'mixed'
  percentDiff: number
  giveTotal: number
  getTotal: number
  confidenceScore: number
  degraded: boolean
  dataGaps: string[]
  injuryNotes: string[]
  drivers: DriverLike
  negotiationToolkit: Record<string, unknown> | null
  opponentRosterTargets?: Array<{ name: string; marketValue: number; position: string | null }>
  rosterSummary: {
    lineupSimulation: boolean
    yourRosterPlayers: number
    theirRosterPlayers: number
  }
  leagueHistoryNote: string | null
  /** Appended sentence from warehouse / LeagueSeason / waivers when data exists */
  structuredContextExtra?: string | null
  syncedDataHighlights?: string[]
  /** Summed effective weekly projections per side (league-scored when context exists). */
  projectedImpact: {
    giveTotal: number | null
    getTotal: number | null
    net: number | null
    summary: string
  }
  /** Echo normalized scoring labels for AI (no invented rules). */
  scoringSummary?: string | null
}): TradeIntelligence {
  const marketWho: TradeIntelligence['whoWinsNow'] =
    args.sideAdvantage === 'you' ? 'you' : args.sideAdvantage === 'opponent' ? 'opponent' : 'even'

  /** Short-term “win now”: league-scored weekly projection net when present; else market composites. */
  let whoWinsNow: TradeIntelligence['whoWinsNow'] = marketWho
  const pn = args.projectedImpact.net
  if (
    args.projectedImpact.giveTotal != null &&
    args.projectedImpact.getTotal != null &&
    pn != null &&
    Math.abs(pn) >= 1
  ) {
    whoWinsNow = pn > 0 ? 'you' : pn < 0 ? 'opponent' : 'even'
  }

  /** Long-term: dynasty uses composite % delta; redraft aligns with market tilt (ROS proxy). */
  let whoWinsLongTerm: TradeIntelligence['whoWinsLongTerm'] = marketWho
  if (args.league?.isDynasty) {
    if (args.percentDiff > 8) whoWinsLongTerm = 'you'
    else if (args.percentDiff < -8) whoWinsLongTerm = 'opponent'
    else whoWinsLongTerm = 'even'
  }

  const fairnessVerdict = `${args.fairnessLabel} · Market delta ≈ ${args.percentDiff}% (composite-based, not invented). Short-term edge uses weekly projections when available (else market). Confidence ${Math.round(args.confidenceScore)}%.${args.scoringSummary ? ` ${args.scoringSummary}` : ''}`

  const tradeWarnings: string[] = []
  for (const w of args.injuryNotes.slice(0, 6)) {
    if (w && !tradeWarnings.includes(w)) tradeWarnings.push(w)
  }
  for (const f of args.drivers.riskFlags ?? []) {
    if (f && !tradeWarnings.includes(f)) tradeWarnings.push(f)
  }
  for (const g of args.dataGaps.slice(0, 5)) {
    if (g && !tradeWarnings.includes(`Data gap: ${g}`)) tradeWarnings.push(`Data gap: ${g}`)
  }
  if (args.degraded) tradeWarnings.push('Some assets used fallback pricing — confidence is reduced.')

  const rebalanceSuggestions: string[] = []
  const tk = args.negotiationToolkit
  if (tk && typeof tk === 'object') {
    const counters = (tk as { counters?: Array<{ description?: string }> }).counters
    if (Array.isArray(counters)) {
      for (const c of counters.slice(0, 6)) {
        if (c?.description) rebalanceSuggestions.push(c.description)
      }
    }
    const sweet = (tk as { sweeteners?: Array<Record<string, unknown>> }).sweeteners
    if (Array.isArray(sweet)) {
      for (const s of sweet.slice(0, 4)) {
        const line = pickSweetenerText(s as { suggestion?: string; type?: string; target?: string })
        if (line) rebalanceSuggestions.push(line)
      }
    }
  }

  const alt = args.opponentRosterTargets?.slice(0, 8) ?? []
  const alternateTargets = alt.map((t) => ({
    name: t.name,
    marketValue: t.marketValue,
    position: t.position ?? null,
  }))
  const alternateTargetsNote =
    alt.length > 0
      ? `Real opponent bench / not-in-deal targets (by market value): ${alt.map((t) => `${t.name} (~${t.marketValue})`).join(' · ')}.`
      : 'Select a league and opponent team to surface alternate counter targets from their roster.'

  const badges = args.league?.quickModeBadges?.length
    ? args.league.quickModeBadges.join(', ')
    : 'General (no league snapshot)'

  const leagueReasoning = args.league
    ? `League ${args.league.name} (${args.league.sport}). Format signals: ${badges}. Scoring: ${args.league.scoring ?? 'see settings'}. Superflex: ${args.league.isSuperFlexHint ? 'yes' : 'no'}. TE premium: ${args.league.tePremiumHint ? 'yes' : 'no'}.${args.structuredContextExtra ?? ''}`
    : 'No league selected — valuation uses sport defaults and asset search only (no roster simulation).'

  const teamReasoning =
    args.teamContext === 'my_team'
      ? `Team lens: your roster context${args.rosterSummary.lineupSimulation ? ` — ${args.rosterSummary.yourRosterPlayers} your players priced, ${args.rosterSummary.theirRosterPlayers} opponent pieces in simulation.` : ' (enable league + opponent for full lineup fit).'}.`
      : args.teamContext === 'neutral'
        ? 'Neutral lens: raw fairness without “my team” positional need weighting.'
        : `Team lens: ${args.teamContext} — compare sides using structured drivers.`

  let contenderRecommendation =
    args.strategy === 'contender' || args.strategy === 'win_now'
      ? `Contender mode: prioritize win-now market value and lineup lift. Current lean: ${args.drivers.lean ?? 'see drivers'}.`
      : `Even if not in “win now” mode, contender read: ${whoWinsNow === 'you' ? 'you absorb more current value in this construction.' : whoWinsNow === 'opponent' ? 'opponent side takes more current value on paper.' : 'Near even on current composites.'}`

  if (args.league?.isDynasty === false) {
    contenderRecommendation += ' Redraft / seasonal — short horizon dominates.'
  }

  let rebuilderRecommendation =
    args.strategy === 'rebuilder' || args.strategy === 'long_term'
      ? `Rebuilder / long-term: favor picks and youth upside where data exists. Lean: ${args.drivers.verdict ?? 'see trade engine verdict'}.`
      : `Rebuilder read (informational): ${whoWinsLongTerm === 'you' ? 'you tilt longer-term value in this framework.' : whoWinsLongTerm === 'opponent' ? 'opponent tilts longer-term in dynasty-style weighting.' : 'Long-term delta is close — use age/pick data on cards.'}`

  if (args.strategy === 'neutral') {
    contenderRecommendation = `Neutral strategy: ${contenderRecommendation}`
    rebuilderRecommendation = `Neutral strategy: ${rebuilderRecommendation}`
  }

  const proj = args.projectedImpact
  const projSentence =
    proj.giveTotal != null && proj.getTotal != null && proj.net != null
      ? `League-scored weekly projection stack: you give up ~${proj.giveTotal.toFixed(1)} combined pts, you get ~${proj.getTotal.toFixed(1)} (${proj.net >= 0 ? '+' : ''}${proj.net.toFixed(1)} net). ${proj.summary}`
      : `Projected weekly impact: ${proj.summary}`

  const why = [
    fairnessVerdict,
    projSentence,
    teamReasoning,
    contenderRecommendation,
    rebuilderRecommendation,
    args.drivers.verdict ? `Engine verdict: ${args.drivers.verdict}` : null,
    alt.length > 0 ? alternateTargetsNote : null,
  ]
    .filter(Boolean)
    .join(' ')

  return {
    fairnessVerdict,
    confidenceScore: Math.round(args.confidenceScore),
    whoWinsNow,
    whoWinsLongTerm,
    contenderRecommendation,
    rebuilderRecommendation,
    tradeWarnings: tradeWarnings.slice(0, 12),
    rebalanceSuggestions: rebalanceSuggestions.slice(0, 10),
    alternateTargetsNote,
    alternateTargets,
    why,
    projectedImpact: proj,
    leagueReasoning,
    teamReasoning,
    leagueHistoryNote: args.leagueHistoryNote,
    ...(args.syncedDataHighlights?.length ? { syncedDataHighlights: args.syncedDataHighlights } : {}),
  }
}
