import type { LiveDraftAssistantMode } from '@/lib/live-draft-brain'

/**
 * Maps War Room / Waiver-style strategy labels to Live Draft Brain deterministic modes.
 */
const WAR_ROOM_STRATEGY_TO_BRAIN: Record<string, LiveDraftAssistantMode> = {
  conservative: 'safe',
  aggressive: 'upside',
  win_now: 'win_now',
  rebuild: 'future_value',
  playoff_lock: 'balanced',
  chaos: 'upside',
  best_player_available: 'bpa',
  hero_rb: 'hero_rb',
  zero_rb: 'zero_rb',
  anchor_rb: 'hero_rb',
  elite_qb: 'balanced',
  late_qb: 'balanced',
  te_premium_attack: 'needs',
  stack_hunting: 'balanced',
  productive_struggle: 'balanced',
  rookie_heavy: 'upside',
  safe_floor: 'safe',
  balanced: 'balanced',
  needs: 'needs',
  upside: 'upside',
  safe: 'safe',
  bpa: 'bpa',
}

export function resolveBrainMode(strategyMode: string | undefined | null): LiveDraftAssistantMode {
  if (!strategyMode?.trim()) return 'balanced'
  const key = strategyMode.trim().toLowerCase().replace(/\s+/g, '_')
  return WAR_ROOM_STRATEGY_TO_BRAIN[key] ?? 'balanced'
}

export const WAR_ROOM_STRATEGY_OPTIONS = [
  { value: 'balanced', label: 'Balanced' },
  { value: 'best_player_available', label: 'Best player available' },
  { value: 'conservative', label: 'Conservative (safe floor)' },
  { value: 'aggressive', label: 'Aggressive (upside)' },
  { value: 'win_now', label: 'Win now' },
  { value: 'rebuild', label: 'Rebuild / future value' },
  { value: 'hero_rb', label: 'Hero RB' },
  { value: 'zero_rb', label: 'Zero RB' },
  { value: 'safe_floor', label: 'Safe floor' },
  { value: 'rookie_heavy', label: 'Rookie heavy' },
  { value: 'stack_hunting', label: 'Stack hunting' },
  { value: 'playoff_lock', label: 'Playoff lock' },
] as const
