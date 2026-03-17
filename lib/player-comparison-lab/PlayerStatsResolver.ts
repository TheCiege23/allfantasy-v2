/**
 * Resolves historical and projection stats for a player (Prompt 117 + 130).
 * Uses PlayerSeasonStats for historical, FantasyCalc for projections.
 */

import { prisma } from '@/lib/prisma';
import {
  getPlayerValuesForNames,
  type PlayerValueLookup,
  type FantasyCalcSettings,
} from '@/lib/fantasycalc';
import type { ResolvedPlayerStats, HistoricalSeasonRow, ProjectionRow, ScoringFormat } from './types';
import { normalizeToSupportedSport } from '@/lib/sport-scope';

const HISTORICAL_SEASONS_LIMIT = 5;

function scoringToFantasyCalc(scoringFormat?: ScoringFormat): FantasyCalcSettings {
  const ppr = scoringFormat === 'non_ppr' ? 0 : scoringFormat === 'half_ppr' ? 0.5 : 1;
  return { isDynasty: true, numQbs: 2, numTeams: 12, ppr };
}

export async function resolvePlayerStats(
  playerName: string,
  options?: { sport?: string | null; scoringFormat?: import('./types').ScoringFormat }
): Promise<ResolvedPlayerStats | null> {
  const name = playerName.trim();
  if (!name) return null;

  const settings = scoringToFantasyCalc(options?.scoringFormat);
  const sport = options?.sport ? normalizeToSupportedSport(options.sport) : 'NFL';

  const [historical, projection] = await Promise.all([
    resolveHistorical(name, sport),
    resolveProjection(name, settings),
  ]);

  const position = projection?.position ?? null;
  const team = projection?.team ?? null;

  return {
    name,
    position,
    team,
    historical: historical ?? [],
    projection: projection ?? null,
  };
}

async function resolveHistorical(playerName: string, sport: string = 'NFL'): Promise<HistoricalSeasonRow[] | null> {
  const normalized = playerName.trim();
  if (!normalized) return null;

  const rows = await prisma.playerSeasonStats.findMany({
    where: {
      sport,
      playerName: { equals: normalized, mode: 'insensitive' },
      source: 'rolling_insights',
    },
    orderBy: { season: 'desc' },
    take: HISTORICAL_SEASONS_LIMIT,
    select: {
      season: true,
      gamesPlayed: true,
      fantasyPoints: true,
      fantasyPointsPerGame: true,
      stats: true,
    },
  });

  return rows.map((r) => {
    const stats = (r.stats as Record<string, number | null>) ?? {};
    return {
      season: r.season,
      gamesPlayed: r.gamesPlayed ?? null,
      fantasyPoints: r.fantasyPoints ?? null,
      fantasyPointsPerGame: r.fantasyPointsPerGame ?? (r.fantasyPoints && r.gamesPlayed ? r.fantasyPoints / r.gamesPlayed : null),
      passingYards: stats.passing_yards ?? stats.passingYards ?? null,
      rushingYards: stats.rushing_yards ?? stats.rushingYards ?? null,
      receivingYards: stats.receiving_yards ?? stats.receivingYards ?? null,
      receptions: stats.receptions ?? null,
    };
  });
}

async function resolveProjection(
  playerName: string,
  settings: FantasyCalcSettings
): Promise<ProjectionRow | null> {
  const normalized = playerName.trim();
  if (!normalized) return null;

  const map = await getPlayerValuesForNames([normalized], settings);
  const key = normalized.toLowerCase();
  const lookup = map.get(key) ?? map.get(playerName) ?? null;
  if (!lookup) return null;

  return {
    value: lookup.value,
    rank: lookup.rank,
    positionRank: lookup.positionRank,
    trend30Day: lookup.trend30Day,
    redraftValue: lookup.redraftValue ?? null,
    source: 'fantasycalc',
    position: lookup.position ?? null,
    team: lookup.team ?? null,
    volatility: lookup.volatility ?? null,
  };
}
