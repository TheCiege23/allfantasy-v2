/**
 * Deterministic shape checks for AI matchup / start-sit payloads (guardrails, no provider calls).
 */

import type { LeagueMatchupAiResult, StartSitAiResult } from '@/lib/ai-matchup-engine/types'
import type { InvariantResult } from '@/lib/engine-testing/hardening/engineInvariants'

function inRange(n: number, lo: number, hi: number): boolean {
  return Number.isFinite(n) && n >= lo && n <= hi
}

export function buildStubLeagueMatchupAiResult(): LeagueMatchupAiResult {
  return {
    summary: 'Test summary grounded in league context.',
    edge: {
      side: 'left',
      confidencePct: 62,
      headline: 'Slight edge on paper',
    },
    keyPlayers: [{ name: 'Player A', note: 'Volume' }],
    upsetProbability: 0.22,
    xFactors: ['weather'],
    scenarios: {
      ifNeedFloor: 'Prioritize safe floor.',
      ifNeedUpside: 'Chase ceiling.',
    },
    winProbabilityNotes: 'Based on projections only.',
    dataNotes: 'Deterministic stub for tests.',
    providers: { openai: 'skipped', deepseek: 'skipped', grok: 'skipped' },
  }
}

export function buildStubStartSitAiResult(): StartSitAiResult {
  return {
    recommendation: 'even',
    confidencePct: 55,
    reasoning: {
      matchup: 'Neutral.',
      usage: 'Stable.',
      injuries: 'None flagged.',
      weather: 'Dome.',
    },
    playerOutlook: {
      playerA: { restOfGame: 'Steady', volatility: 'medium', trend: 'neutral' },
      playerB: { restOfGame: 'Volatile', volatility: 'high', trend: 'hot' },
    },
    scenarios: {
      ifNeedFloor: 'Lean safer profile.',
      ifNeedUpside: 'Accept variance.',
    },
    winProbabilityInfluence: 'Minor.',
    dataNotes: 'Stub.',
    providers: { openai: 'skipped', deepseek: 'skipped', grok: 'skipped' },
  }
}

/** Validates response contract for matchup AI — use before persisting or showing users. */
export function assertLeagueMatchupAiResultShape(
  r: Partial<LeagueMatchupAiResult> | null | undefined,
): InvariantResult {
  if (!r || typeof r !== 'object') {
    return { ok: false, code: 'AI_MATCHUP_EMPTY', message: 'Matchup AI result missing' }
  }
  if (!String(r.summary ?? '').trim()) {
    return { ok: false, code: 'AI_MATCHUP_SUMMARY', message: 'summary required' }
  }
  const edge = r.edge
  if (!edge || !['left', 'right', 'even'].includes(edge.side)) {
    return { ok: false, code: 'AI_MATCHUP_EDGE_SIDE', message: 'edge.side invalid' }
  }
  if (!inRange(Number(edge.confidencePct), 0, 100)) {
    return { ok: false, code: 'AI_MATCHUP_CONFIDENCE', message: 'edge.confidencePct must be 0–100' }
  }
  if (!Array.isArray(r.keyPlayers)) {
    return { ok: false, code: 'AI_MATCHUP_KEY_PLAYERS', message: 'keyPlayers must be an array' }
  }
  const up = Number(r.upsetProbability)
  if (!Number.isFinite(up) || up < 0 || up > 1) {
    return { ok: false, code: 'AI_MATCHUP_UPSET', message: 'upsetProbability must be in [0,1]' }
  }
  const prov = r.providers
  if (!prov || typeof prov.openai !== 'string') {
    return { ok: false, code: 'AI_MATCHUP_PROVIDERS', message: 'providers block invalid' }
  }
  return { ok: true }
}

export function assertStartSitAiResultShape(r: Partial<StartSitAiResult> | null | undefined): InvariantResult {
  if (!r || typeof r !== 'object') {
    return { ok: false, code: 'AI_STARTSIT_EMPTY', message: 'Start/sit AI result missing' }
  }
  if (!['playerA', 'playerB', 'even'].includes(String(r.recommendation))) {
    return { ok: false, code: 'AI_STARTSIT_REC', message: 'recommendation invalid' }
  }
  if (!inRange(Number(r.confidencePct), 0, 100)) {
    return { ok: false, code: 'AI_STARTSIT_CONFIDENCE', message: 'confidencePct must be 0–100' }
  }
  if (!r.reasoning || typeof r.reasoning.matchup !== 'string') {
    return { ok: false, code: 'AI_STARTSIT_REASONING', message: 'reasoning block invalid' }
  }
  return { ok: true }
}
