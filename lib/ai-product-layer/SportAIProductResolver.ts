/**
 * SportAIProductResolver — sport-aware AI entry points for all supported sports.
 * Ensures NFL, NHL, NBA, MLB, NCAAB, NCAAF, Soccer are supported everywhere.
 */

import { DEFAULT_SPORT, SUPPORTED_SPORTS, isSupportedSport, normalizeToSupportedSport } from '@/lib/sport-scope';
import type { SupportedSport } from './types';

/**
 * All sports the AI product layer supports (single source of truth from sport-scope).
 */
export function getSupportedSportsForAI(): readonly SupportedSport[] {
  return SUPPORTED_SPORTS;
}

/**
 * Whether the given sport is supported by AI surfaces.
 */
export function isSportSupportedForAI(sport: string | null | undefined): boolean {
  return isSupportedSport(sport);
}

/**
 * Label for sport (for dropdowns and filters in AI surfaces).
 */
export function getSportLabelForAI(sport: string): string {
  const u = sport.toUpperCase();
  const labels: Record<string, string> = {
    NFL: 'NFL',
    NHL: 'NHL',
    NBA: 'NBA',
    MLB: 'MLB',
    NCAAF: 'NCAA Football',
    NCAAB: 'NCAA Basketball',
    SOCCER: 'Soccer',
  };
  return labels[u] ?? sport;
}

/**
 * Options for sport selector in AI flows (e.g. trade, waiver, social clip).
 */
export function getSportOptionsForAI(): { value: SupportedSport; label: string }[] {
  return (SUPPORTED_SPORTS as readonly SupportedSport[]).map((s) => ({
    value: s,
    label: getSportLabelForAI(s),
  }));
}

/**
 * Resolve sport to supported value with platform default fallback.
 */
export function resolveSportForAIProduct(sport: string | null | undefined): SupportedSport {
  return normalizeToSupportedSport(sport) ?? DEFAULT_SPORT;
}
