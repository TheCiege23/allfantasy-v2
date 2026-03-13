'use client'

import { useCallback, useState } from 'react'

export interface AISuggestion {
  player: string
  position: string
  team?: string | null
  adp?: number
  reason?: string
  confidence?: number
  type?: 'primary' | 'pivot' | 'value'
}

export interface AIAssistantState {
  /** Top suggestion */
  bestPick: AISuggestion | null
  /** Explanation (aiInsight) */
  explanation: string
  /** Top 2–3 options for comparison */
  compareOptions: AISuggestion[]
  /** Positional run warning: e.g. "RB run: 4 of last 5 picks" */
  positionalRunWarning: string | null
  /** Roster construction warning */
  rosterWarning: string | null
  loading: boolean
  error: string | null
}

const defaultState: AIAssistantState = {
  bestPick: null,
  explanation: '',
  compareOptions: [],
  positionalRunWarning: null,
  rosterWarning: null,
  loading: false,
  error: null,
}

/**
 * Detects if the last N picks are heavily one position (positional run).
 */
function detectPositionalRun(
  recentPicks: { position: string }[],
  windowSize = 5,
  threshold = 3,
): string | null {
  if (recentPicks.length < threshold) return null
  const last = recentPicks.slice(-windowSize)
  const byPos: Record<string, number> = {}
  for (const p of last) {
    const pos = p.position || 'OTHER'
    byPos[pos] = (byPos[pos] || 0) + 1
  }
  const entry = Object.entries(byPos).find(([, count]) => count >= threshold)
  if (entry) return `${entry[0]} run: ${entry[1]} of last ${last.length} picks`
  return null
}

/**
 * Simple roster warning from roster counts vs typical starter counts.
 */
function getRosterWarning(
  rosterCounts: Record<string, number>,
  rosterSlots: string[],
): string | null {
  const need = (pos: string, min: number) => (rosterCounts[pos] || 0) < min
  if (need('QB', 1)) return 'No QB yet — consider targeting one soon.'
  const rb = rosterCounts.RB || 0
  const wr = rosterCounts.WR || 0
  if (rb >= 5 && wr < 2) return 'WR depth is light compared to RB.'
  if (wr >= 5 && rb < 2) return 'RB depth is light compared to WR.'
  if (rb < 2 && wr < 2) return 'Consider adding RB or WR depth.'
  return null
}

export interface FetchSuggestionParams {
  available: Array<{ name: string; position: string; team?: string | null; adp?: number; value?: number; isRookie?: boolean }>
  teamRoster: { position: string }[]
  rosterSlots: string[]
  round: number
  pick: number
  totalTeams: number
  managerName: string
  isDynasty?: boolean
  isSF?: boolean
  isRookieDraft?: boolean
  mode?: 'needs' | 'bpa'
  /** Recent picks (for positional run detection) */
  recentPicks?: { position: string }[]
}

export function useAIDraftAssistant() {
  const [state, setState] = useState<AIAssistantState>(defaultState)

  const fetchSuggestion = useCallback(async (params: FetchSuggestionParams): Promise<void> => {
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const res = await fetch('/api/mock-draft/ai-pick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'dm-suggestion',
          available: params.available,
          teamRoster: params.teamRoster,
          rosterSlots: params.rosterSlots,
          round: params.round,
          pick: params.pick,
          totalTeams: params.totalTeams,
          managerName: params.managerName,
          isDynasty: params.isDynasty ?? false,
          isSF: params.isSF ?? false,
          isRookieDraft: params.isRookieDraft ?? false,
          mode: params.mode ?? 'needs',
          leagueContext: {
            rosterPositions: params.rosterSlots,
            scoringSettings: {},
          },
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setState((s) => ({ ...s, loading: false, error: data.error || 'Request failed' }))
        return
      }

      const suggestions: AISuggestion[] = (data.suggestions || []).slice(0, 3).map((s: any) => ({
        player: s.player,
        position: s.position,
        team: s.team,
        adp: s.adp,
        reason: s.reason,
        confidence: s.confidence,
        type: s.type,
      }))
      const rosterCounts = data.rosterCounts || {}
      const positionalRunWarning = params.recentPicks
        ? detectPositionalRun(params.recentPicks)
        : null
      const rosterWarning = getRosterWarning(rosterCounts, params.rosterSlots)

      setState({
        bestPick: suggestions[0] || null,
        explanation: data.aiInsight || '',
        compareOptions: suggestions,
        positionalRunWarning,
        rosterWarning,
        loading: false,
        error: null,
      })
    } catch (e: any) {
      setState((s) => ({
        ...s,
        loading: false,
        error: e?.message || 'AI suggestion failed',
      }))
    }
  }, [])

  const clear = useCallback(() => {
    setState(defaultState)
  }, [])

  return { ...state, fetchSuggestion, clear }
}
