/**
 * Deterministic fantasy scoring: raw stat map → points using league template rules (+ overrides).
 * Integrates with `lib/multi-sport` scoring templates — no AI.
 */
import type { ScoringRuleDto } from '@/lib/multi-sport/ScoringTemplateResolver'
import {
  applyThresholdBonuses,
  extractThresholdBonuses,
  filterStatsForIdpPosition,
} from '@/lib/scoring-engine/scoringSettingsResolved'

function normalizeStatKey(k: string): string {
  return String(k)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
}

/**
 * Build a lookup map: normalized stat key → rule (first enabled rule wins if duplicates).
 */
export function buildScoringRuleIndex(rules: ScoringRuleDto[]): Map<string, ScoringRuleDto> {
  const index = new Map<string, ScoringRuleDto>()
  for (const r of rules) {
    if (!r.enabled) continue
    const key = normalizeStatKey(r.statKey)
    if (!index.has(key)) index.set(key, r)
  }
  return index
}

/**
 * Sum fantasy points from a flat stat line (e.g. PlayerWeeklyScore.stats or API payload).
 * Rule pointsValue is per unit (e.g. 0.04 per pass yard, 6 per rushing TD).
 */
export function computeFantasyPointsFromStats(
  stats: Record<string, unknown>,
  rules: ScoringRuleDto[],
): { points: number; applied: Record<string, number> } {
  const index = buildScoringRuleIndex(rules)
  const applied: Record<string, number> = {}
  let total = 0

  for (const [rawKey, rawVal] of Object.entries(stats)) {
    if (rawVal == null) continue
    const num = typeof rawVal === 'number' ? rawVal : Number(rawVal)
    if (!Number.isFinite(num)) continue
    const key = normalizeStatKey(rawKey)
    const rule = index.get(key)
    if (!rule) continue
    const mult = rule.multiplier ?? 1
    const pts = num * rule.pointsValue * mult
    const rounded = Math.round(pts * 100) / 100
    applied[key] = (applied[key] ?? 0) + rounded
    total += rounded
  }

  total = Math.round(total * 100) / 100
  return { points: total, applied }
}

/**
 * Apply optional per-position multipliers from settingsSnapshot.scoringSettings.rules.positionMultipliers
 * { "QB": { "pass_yd": 1.1 } } — multiplies computed points for those stats after base calculation.
 */
/**
 * Full pipeline: raw stats → IDP stat filter → template points → threshold bonuses → position multipliers.
 */
export function computePlayerFantasyPointsPipeline(input: {
  stats: Record<string, unknown>
  rules: ScoringRuleDto[]
  position: string | null | undefined
  scoringSettings: Record<string, unknown> | null | undefined
}): { points: number; applied: Record<string, number>; statLine: Record<string, unknown> } {
  const filtered = filterStatsForIdpPosition(input.stats, input.position, input.scoringSettings)
  const { points: basePts, applied } = computeFantasyPointsFromStats(filtered, input.rules)
  const bonuses = extractThresholdBonuses(input.scoringSettings ?? undefined)
  let points = applyThresholdBonuses(basePts, filtered, bonuses)
  points = applyPositionScoringMultipliers(points, input.position, input.scoringSettings)
  return { points, applied, statLine: filtered }
}

export function applyPositionScoringMultipliers(
  basePoints: number,
  position: string | null | undefined,
  scoringSettings: Record<string, unknown> | null | undefined,
): number {
  if (!position || !scoringSettings) return basePoints
  const rules = scoringSettings.rules
  if (!rules || typeof rules !== 'object') return basePoints
  const pm = (rules as Record<string, unknown>).positionMultipliers
  if (!pm || typeof pm !== 'object') return basePoints
  const pos = String(position).toUpperCase()
  const row = (pm as Record<string, unknown>)[pos]
  if (row == null || typeof row !== 'object') return basePoints
  const mult = (row as Record<string, unknown>).__overall
  if (typeof mult === 'number' && Number.isFinite(mult)) {
    return Math.round(basePoints * mult * 100) / 100
  }
  return basePoints
}
