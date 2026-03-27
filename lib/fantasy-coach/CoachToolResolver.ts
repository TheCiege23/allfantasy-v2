/**
 * Canonical hrefs for coach action cards.
 */

type CoachHrefParams = Record<string, string | number | undefined | null>;

const TRADE_ANALYZER = '/trade-evaluator';
const WAIVER_AI = '/waiver-ai';
const RANKINGS = '/rankings';
const PLAYER_PAGE = '/player-comparison';

function withQuery(basePath: string, params: CoachHrefParams = {}): string {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value == null) return;
    const normalized = String(value).trim();
    if (!normalized) return;
    query.set(key, normalized);
  });

  const search = query.toString();
  return search ? `${basePath}?${search}` : basePath;
}

export function getTradeAnalyzerHref(
  leagueId?: string,
  params: CoachHrefParams = {}
): string {
  return withQuery(TRADE_ANALYZER, {
    source: 'coach-mode',
    leagueId,
    ...params,
  });
}

export function getWaiverToolHref(
  leagueId?: string,
  params: CoachHrefParams = {}
): string {
  return withQuery(WAIVER_AI, {
    source: 'coach-mode',
    leagueId,
    ...params,
  });
}

export function getRankingsToolHref(
  leagueId?: string,
  params: CoachHrefParams = {}
): string {
  return withQuery(RANKINGS, {
    source: 'coach-mode',
    leagueId,
    ...params,
  });
}

export function getPlayerPageHref(
  playerName: string,
  params: CoachHrefParams = {}
): string {
  return withQuery(PLAYER_PAGE, {
    player: playerName,
    ...params,
  });
}
