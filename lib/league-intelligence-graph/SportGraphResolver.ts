/**
 * SportGraphResolver — sport-aware filtering and labels for the League Intelligence Graph.
 * Ensures relationships are isolated by sport and league context across NFL, NHL, NBA, MLB, NCAAB, NCAAF, Soccer.
 */

import {
  SUPPORTED_SPORTS,
  isSupportedSport,
  type SupportedSport,
} from "@/lib/sport-scope";

export const GRAPH_SPORTS: readonly SupportedSport[] = [...SUPPORTED_SPORTS];

export type GraphSport = SupportedSport;

const SPORT_ALIAS_MAP: Record<string, SupportedSport> = {
  NFL: "NFL",
  NHL: "NHL",
  NBA: "NBA",
  MLB: "MLB",
  NCAAB: "NCAAB",
  "NCAA BASKETBALL": "NCAAB",
  NCAAF: "NCAAF",
  "NCAA FOOTBALL": "NCAAF",
  SOCCER: "SOCCER",
};

/**
 * Normalize sport string for graph storage and filtering.
 */
export function normalizeSportForGraph(sport: string | null | undefined): GraphSport | null {
  const u = (sport ?? '').toString().trim().toUpperCase();
  if (!u) return null;
  const canonical = SPORT_ALIAS_MAP[u] ?? u;
  return isSupportedSport(canonical) ? canonical : null;
}

/**
 * Return display label for sport (for UI and AI context).
 */
export function getSportGraphLabel(sport: string | null | undefined): string {
  const s = normalizeSportForGraph(sport);
  if (!s) return 'Unknown';
  const labels: Record<GraphSport, string> = {
    NFL: 'NFL',
    NHL: 'NHL',
    NBA: 'NBA',
    MLB: 'MLB',
    NCAAB: 'NCAA Basketball',
    NCAAF: 'NCAA Football',
    SOCCER: 'Soccer',
  };
  return labels[s];
}

/**
 * Check if sport is supported for graph (all seven platform sports).
 */
export function isSupportedGraphSport(sport: string | null | undefined): boolean {
  return normalizeSportForGraph(sport) != null;
}
