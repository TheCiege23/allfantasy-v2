import { withApiUsage } from "@/lib/telemetry/usage"
import { NextRequest, NextResponse } from 'next/server';
import { getSportsData, Sport, DataType } from '@/lib/sports-router';
import { SUPPORTED_SPORTS, isSupportedSport } from '@/lib/sport-scope';

const SPORT_ALIASES: Record<string, Sport> = {
  MLS: 'SOCCER',
  CFB: 'NCAAF',
  NCAAFB: 'NCAAF',
  NCAA_FOOTBALL: 'NCAAF',
  NCAAM: 'NCAAB',
  NCAABASKETBALL: 'NCAAB',
  NCAA_BASKETBALL: 'NCAAB',
}

function normalizeSportInput(value: string | null | undefined): Sport | null {
  const raw = value?.trim().toUpperCase()
  if (!raw) return null
  const mapped = SPORT_ALIASES[raw] ?? raw
  return isSupportedSport(mapped) ? (mapped as Sport) : null
}

function buildResponseState(result: { cached: boolean; stale: boolean }): 'live' | 'cached' | 'stale' {
  if (result.stale) return 'stale'
  if (result.cached) return 'cached'
  return 'live'
}

export const GET = withApiUsage({ endpoint: "/api/sports", tool: "Sports" })(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const sport = normalizeSportInput(searchParams.get('sport'));
  const dataType = searchParams.get('type') as DataType;
  const identifier = searchParams.get('id') || undefined;
  const forceRefresh = searchParams.get('refresh') === 'true';

  if (!sport) {
    return NextResponse.json(
      { error: 'Missing or invalid sport parameter', validSports: SUPPORTED_SPORTS },
      { status: 400 }
    );
  }

  if (!dataType) {
    return NextResponse.json(
      { error: 'Missing type parameter', validTypes: ['teams', 'players', 'games', 'stats', 'standings', 'schedule'] },
      { status: 400 }
    );
  }

  try {
    const result = await getSportsData({
      sport,
      dataType,
      identifier,
      forceRefresh,
    });

    return NextResponse.json({
      success: true,
      sport,
      dataType,
      source: result.source,
      cached: result.cached,
      stale: result.stale,
      state: buildResponseState(result),
      refreshable: true,
      fetchedAt: result.fetchedAt.toISOString(),
      attemptedSources: result.attemptedSources ?? [],
      data: result.data,
    });
  } catch (error) {
    console.error('Sports data error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch sports data';
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sports data', details: message, refreshable: true, stale: false },
      { status: 500 }
    );
  }
})

export const POST = withApiUsage({ endpoint: "/api/sports", tool: "Sports" })(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { sport: sportRaw, dataType, identifier, forceRefresh } = body;
    const sport = normalizeSportInput(typeof sportRaw === 'string' ? sportRaw : null)

    if (!sport || !dataType) {
      return NextResponse.json(
        { error: 'Missing or invalid sport/dataType in request body', validSports: SUPPORTED_SPORTS },
        { status: 400 }
      );
    }

    const result = await getSportsData({
      sport,
      dataType: dataType as DataType,
      identifier,
      forceRefresh,
    });

    return NextResponse.json({
      success: true,
      sport: sport.toUpperCase(),
      dataType,
      source: result.source,
      cached: result.cached,
      stale: result.stale,
      state: buildResponseState(result),
      refreshable: true,
      fetchedAt: result.fetchedAt.toISOString(),
      attemptedSources: result.attemptedSources ?? [],
      data: result.data,
    });
  } catch (error) {
    console.error('Sports data error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch sports data';
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sports data', details: message, refreshable: true, stale: false },
      { status: 500 }
    );
  }
})
