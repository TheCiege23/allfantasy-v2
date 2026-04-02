/**
 * ChimmyInterfaceService — single entry for Chimmy UI: suggested chips, voice profile, tool context.
 */

import { getChimmyVoiceStyleProfile } from './ChimmyVoiceStyleProfile'
import {
  getToolContextForChimmy,
  getChimmyToolDisplayName,
  mapAIContextSourceToToolContextSource,
} from './ToolContextToChimmyRouter'
import type { ChimmySuggestedChip, ChimmyVoicePreset } from './types'
import type { ToolContextSource } from './ToolContextToChimmyRouter'

/**
 * Default suggested prompts (chips) for Chimmy chat. Sport-agnostic; can be extended per league/sport.
 */
export function getDefaultChimmyChips(options?: {
  leagueName?: string
  hasLeagues?: boolean
}): ChimmySuggestedChip[] {
  const league = options?.leagueName
  const hasLeagues = options?.hasLeagues ?? !!league

  const generic: ChimmySuggestedChip[] = [
    { id: 'start-sit', label: 'Start/sit this week', prompt: 'Who should I start and sit this week?', category: 'lineup' },
    { id: 'trade-value', label: 'Trade value', prompt: 'How do I value draft picks vs players in a trade?', category: 'trade' },
    { id: 'waiver-priority', label: 'Waiver priority', prompt: 'What FAAB % or priority should I use on a top waiver pickup?', category: 'waiver' },
    { id: 'dynasty-value', label: 'Dynasty value', prompt: 'How do I balance win-now vs long-term value in dynasty?', category: 'strategy' },
  ]

  if (hasLeagues && league) {
    const short = league.length > 12 ? `${league.slice(0, 12)}…` : league
    return [
      {
        id: 'start-sit-league',
        label: `Start/sit for ${short}`,
        prompt: `Who should I start and sit this week in my "${league}" league?`,
        category: 'lineup',
      },
      { id: 'weak-spots', label: `Weak spots in ${league}`, prompt: `What are my weakest positions in "${league}"?`, category: 'league' },
      { id: 'trade-targets', label: `Trade targets in ${league}`, prompt: `Who are the best trade targets for my team in "${league}"?`, category: 'league' },
      { id: 'next-moves', label: `Next moves in ${league}`, prompt: `What moves should I make to improve in "${league}"?`, category: 'league' },
      ...generic,
    ]
  }

  return generic
}

/**
 * Get voice style config for TTS (default: calm).
 */
export function getChimmyVoiceConfig(preset?: ChimmyVoicePreset) {
  return getChimmyVoiceStyleProfile(preset ?? 'calm')
}

export interface ChimmyToolDisplayContext {
  toolName?: string
  summary?: string
  leagueName?: string | null
  sport?: string | null
}

/**
 * Build a lightweight tool context banner for Chimmy chat shells from AI URL context.
 */
export function buildChimmyToolDisplayContext(input: {
  source?: string | null
  leagueName?: string | null
  sport?: string | null
  contextHint?: string | null
}): ChimmyToolDisplayContext | null {
  const mappedSource = mapAIContextSourceToToolContextSource(input.source)
  if (!mappedSource) return null

  const routed = getToolContextForChimmy(mappedSource, {
    leagueName: input.leagueName ?? undefined,
    sport: input.sport ?? undefined,
    contextHint: input.contextHint ?? undefined,
  })

  const fallbackSummary =
    routed.contextHint ??
    routed.suggestedPrompt.replace(/\s+/g, ' ').trim().slice(0, 140)

  return {
    toolName: getChimmyToolDisplayName(routed.toolId),
    summary: input.contextHint?.trim() || fallbackSummary,
    leagueName: input.leagueName ?? null,
    sport: input.sport ?? null,
  }
}

/**
 * Get tool context for Chimmy from a given source and payload (e.g. from matchup or draft).
 */
export { getToolContextForChimmy }
export type { ToolContextSource }
