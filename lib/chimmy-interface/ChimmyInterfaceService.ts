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
  const league = options?.leagueName?.trim()
  const hasLeagues = options?.hasLeagues ?? !!league
  const displayLeague = league || 'my league'
  const short = displayLeague.length > 12 ? `${displayLeague.slice(0, 12)}…` : displayLeague

  const sixForLeague = (): ChimmySuggestedChip[] => [
    {
      id: 'chip-start-sit',
      label: `Start/sit for ${short}`,
      prompt: `Help me with my start/sit decisions for ${displayLeague}.`,
      category: 'lineup',
    },
    {
      id: 'chip-weak',
      label: `Weak spots in ${short}`,
      prompt: `What are my weakest positions and roster holes in ${displayLeague}?`,
      category: 'league',
    },
    {
      id: 'chip-waiver',
      label: 'Best waiver adds',
      prompt: hasLeagues
        ? `Who should I add off waivers in ${displayLeague}?`
        : 'Who are the best waiver adds for my team this week?',
      category: 'waiver',
    },
    {
      id: 'chip-trade',
      label: 'Trade value check',
      prompt: hasLeagues
        ? `Analyze a trade for ${displayLeague}.`
        : 'Help me evaluate a trade and player values.',
      category: 'trade',
    },
    {
      id: 'chip-injury',
      label: 'Injury updates',
      prompt: hasLeagues
        ? `Analyze injury impacts on my roster in ${displayLeague}.`
        : 'Summarize injury news and how it affects my lineup.',
      category: 'lineup',
    },
    {
      id: 'chip-power',
      label: 'Power rankings',
      prompt: hasLeagues
        ? `Give me power rankings for ${displayLeague}.`
        : 'How does my team stack up in my league?',
      category: 'league',
    },
  ]

  return sixForLeague()
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
