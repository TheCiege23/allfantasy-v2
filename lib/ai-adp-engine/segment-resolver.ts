import { normalizeToSupportedSport } from '@/lib/sport-scope'
import type { AiAdpLeagueType } from './types'

export interface AiAdpSegmentContext {
  sport: string
  leagueType: AiAdpLeagueType
  formatKey: string
}

function normalizeFormatToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/_/g, '-')
    .replace(/\s+/g, '-')
}

function coerceFormatKeyFromToken(token: string): string {
  if (!token) return 'default'
  if (token.includes('superflex') || token === 'sf' || token.includes('2qb')) return 'sf'
  if (token.includes('half') && token.includes('ppr')) return 'half-ppr'
  if (token.includes('ppr')) return 'ppr'
  if (token.includes('non-ppr') || token.includes('std') || token.includes('standard')) return 'standard'
  if (token.includes('points')) return 'standard'
  return token.slice(0, 32)
}

function resolveFromScoringObject(scoring: unknown): string | null {
  if (!scoring || typeof scoring !== 'object') return null
  const rec = scoring as Record<string, unknown>
  const ppr = typeof rec.ppr === 'number' ? rec.ppr : null
  const isSuperflex =
    rec.superflex === true ||
    rec.isSuperflex === true ||
    rec.is_superflex === true
  if (isSuperflex) return 'sf'
  if (ppr === 0.5) return 'half-ppr'
  if (ppr === 0) return 'standard'
  if (ppr != null && ppr >= 1) return 'ppr'
  return null
}

export function resolveAiAdpLeagueType(input: {
  isDynasty?: boolean | null
  leagueType?: string | null
  settings?: Record<string, unknown> | null
}): AiAdpLeagueType {
  if (input.isDynasty === true) return 'dynasty'
  const explicitLeagueType = normalizeFormatToken(String(input.leagueType ?? ''))
  if (explicitLeagueType.includes('dynasty')) return 'dynasty'
  const settings = input.settings ?? {}
  const candidates = [
    String(settings.league_type ?? ''),
    String(settings.leagueVariant ?? settings.league_variant ?? ''),
    String(settings.roster_format_type ?? ''),
    String(settings.scoring_format_type ?? ''),
    String(settings.roster_format ?? ''),
    String(settings.scoring_format ?? ''),
  ]
  if (candidates.some((v) => normalizeFormatToken(v).includes('dynasty'))) return 'dynasty'
  return 'redraft'
}

export function resolveAiAdpFormatKeyFromSettings(
  settings?: Record<string, unknown> | null
): string {
  const source = settings ?? {}
  const scoringObject = resolveFromScoringObject(source.scoring)
  if (scoringObject) return scoringObject

  const isSuperflex =
    source.is_superflex === true ||
    source.superflex === true ||
    source.isSuperflex === true
  if (isSuperflex) return 'sf'

  const formatCandidates = [
    source.scoring_format_type,
    source.scoring_format,
    source.scoringType,
    source.formatKey,
    source.format,
    source.roster_format_type,
    source.roster_format,
  ]

  for (const candidate of formatCandidates) {
    const token = normalizeFormatToken(String(candidate ?? ''))
    if (!token) continue
    return coerceFormatKeyFromToken(token)
  }

  return 'default'
}

export function resolveAiAdpSegmentContext(input: {
  sport?: string | null
  isDynasty?: boolean | null
  leagueType?: string | null
  settings?: Record<string, unknown> | null
}): AiAdpSegmentContext {
  return {
    sport: normalizeToSupportedSport(input.sport ?? 'NFL'),
    leagueType: resolveAiAdpLeagueType(input),
    formatKey: resolveAiAdpFormatKeyFromSettings(input.settings),
  }
}
