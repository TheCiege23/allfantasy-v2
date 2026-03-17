import { NextRequest, NextResponse } from 'next/server';
import { computePowerRankings } from '@/lib/league-power-rankings';

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
    if (!result) {
      return NextResponse.json(
        { error: 'League not found or no rankings data' },
        { status: 404 }
      );
    }
    return NextResponse.json(result);
  } catch (e) {
    console.error('[power-rankings]', e);
    return NextResponse.json(
      { error: 'Failed to compute power rankings' },
      { status: 500 }
    );
  }
}
