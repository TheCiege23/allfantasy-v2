/**
 * Canonical hrefs for coach action cards (Prompt 134 — click audit).
 */

const TRADE_ANALYZER = '/af-legacy?tab=trade';
const WAIVER_AI = '/af-legacy?tab=waiver';
const RANKINGS = '/af-legacy?tab=rankings';
const PLAYERS = '/af-legacy?tab=players';

export function getTradeAnalyzerHref(leagueId?: string): string {
  if (!leagueId) return TRADE_ANALYZER;
  return `${TRADE_ANALYZER}&leagueId=${encodeURIComponent(leagueId)}`;
}

export function getWaiverToolHref(leagueId?: string): string {
  if (!leagueId) return WAIVER_AI;
  return `${WAIVER_AI}&leagueId=${encodeURIComponent(leagueId)}`;
}

export function getRankingsToolHref(leagueId?: string): string {
  if (!leagueId) return RANKINGS;
  return `${RANKINGS}&leagueId=${encodeURIComponent(leagueId)}`;
}

export function getPlayerPageHref(playerName: string): string {
  const q = encodeURIComponent(String(playerName).trim());
  return `${PLAYERS}&q=${q}`;
}
