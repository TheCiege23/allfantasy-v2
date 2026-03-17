import { NextRequest, NextResponse } from 'next/server';
import { computePowerRankings } from '@/lib/league-power-rankings';
import { getPowerRankingsCommentary } from '@/lib/league-power-rankings/PowerRankingsCommentaryAI';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  const { leagueId } = await params;
  const weekParam = req.nextUrl.searchParams.get('week');
  const week = weekParam ? parseInt(weekParam, 10) : undefined;

  if (!leagueId) {
    return NextResponse.json({ error: 'leagueId required' }, { status: 400 });
  }

  try {
    const result = await computePowerRankings(leagueId, week);
    if (!result || result.teams.length === 0) {
      return NextResponse.json(
        { error: 'No rankings data for commentary' },
        { status: 404 }
      );
    }
    const commentary = await getPowerRankingsCommentary(result);
    return NextResponse.json(commentary);
  } catch (e) {
    console.error('[power-rankings/commentary]', e);
    return NextResponse.json(
      { error: 'Failed to generate commentary' },
      { status: 500 }
    );
  }
}
