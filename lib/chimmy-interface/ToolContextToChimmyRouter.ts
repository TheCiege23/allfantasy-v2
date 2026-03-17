/**
 * ToolContextToChimmyRouter — map from tool/surface to Chimmy suggested prompt and context.
 * Supports: matchup, draft, trade, waiver, league forecast, and generic.
 */

import type { ToolChimmyContext } from './types'
import { isSupportedSport } from '@/lib/sport-scope'

export type ToolContextSource =
  | 'matchup'
  | 'draft'
  | 'trade'
  | 'waiver'
  | 'league_forecast'
  | 'rankings'
  | 'generic'

/**
 * Build tool context for Chimmy: suggested prompt and optional context hint.
 */
export function getToolContextForChimmy(
  source: ToolContextSource,
  payload: Record<string, unknown> = {}
): ToolChimmyContext {
  switch (source) {
    case 'matchup': {
      const teamAName = String(payload.teamAName ?? 'Team A')
      const teamBName = String(payload.teamBName ?? 'Team B')
      const sport = isSupportedSport(payload.sport as string) ? (payload.sport as string) : 'NFL'
      let prompt = `Explain this matchup: ${teamAName} vs ${teamBName}.`
      if (payload.projectedScoreA != null && payload.projectedScoreB != null) {
        prompt += ` Projected score: ${Number(payload.projectedScoreA).toFixed(1)} – ${Number(payload.projectedScoreB).toFixed(1)}.`
      }
      if (payload.winProbA != null && payload.winProbB != null) {
        prompt += ` Win probability: ${Number(payload.winProbA).toFixed(0)}% – ${Number(payload.winProbB).toFixed(0)}%.`
      }
      if (payload.upsetChance != null && Number(payload.upsetChance) > 5) {
        prompt += ` Upset chance: ${Number(payload.upsetChance)}%.`
      }
      if (payload.volatilityTag) prompt += ` Volatility: ${payload.volatilityTag}.`
      prompt += ` Sport: ${sport}. What should I know about this matchup?`
      return { toolId: 'matchup_simulator', suggestedPrompt: prompt.slice(0, 500), contextHint: `Matchup: ${teamAName} vs ${teamBName}` }
    }
    case 'draft': {
      const parts = ['I need draft advice.']
      if (payload.sport) parts.push(`Sport: ${payload.sport}.`)
      if (payload.round != null) parts.push(`Round ${payload.round}.`)
      if (payload.pick != null) parts.push(`Pick ${payload.pick}.`)
      if (payload.queueLength != null && Number(payload.queueLength) > 0) {
        parts.push(`I have ${payload.queueLength} players in my queue.`)
      }
      if (payload.leagueName) parts.push(`League: ${payload.leagueName}.`)
      parts.push('What should I consider for my next pick?')
      return { toolId: 'mock_draft', suggestedPrompt: parts.join(' ').slice(0, 500), contextHint: 'Draft room context' }
    }
    case 'trade': {
      const prompt = 'Help me evaluate this trade. Who wins, and what should I consider?'
      return { toolId: 'trade_analyzer', suggestedPrompt: prompt, contextHint: payload.contextHint as string | undefined }
    }
    case 'waiver': {
      const prompt = 'Who should I target on the waiver wire this week, and what FAAB or priority should I use?'
      return { toolId: 'waiver_ai', suggestedPrompt: prompt, contextHint: payload.leagueName as string | undefined }
    }
    case 'league_forecast': {
      const prompt = 'Explain my league’s playoff odds and what I should do next.'
      return { toolId: 'league_forecast', suggestedPrompt: prompt, contextHint: 'League forecast / playoff odds' }
    }
    case 'rankings': {
      const leagueName = payload.leagueName ? ` in "${payload.leagueName}"` : ''
      const prompt = `How do my team and league${leagueName} look? What moves should I consider?`
      return { toolId: 'rankings', suggestedPrompt: prompt.slice(0, 500), contextHint: payload.leagueName as string | undefined }
    }
    default:
      return { toolId: 'generic', suggestedPrompt: 'I have a fantasy sports question.', contextHint: undefined }
  }
}
