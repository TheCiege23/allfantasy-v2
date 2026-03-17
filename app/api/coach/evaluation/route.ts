import { NextRequest, NextResponse } from 'next/server';
import { getCoachEvaluation } from '@/lib/fantasy-coach';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let body: { leagueId?: string; leagueName?: string; week?: number; teamName?: string; sport?: string };
  try {
    body = await req.json().catch(() => ({}));
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  try {
    const result = await getCoachEvaluation({
      leagueId: body.leagueId,
      leagueName: body.leagueName,
      week: body.week,
      teamName: body.teamName,
      sport: body.sport,
    });
    return NextResponse.json(result);
  } catch (e) {
    console.error('[coach/evaluation]', e);
    return NextResponse.json(
      { error: 'Failed to get coach evaluation' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const leagueId = req.nextUrl.searchParams.get('leagueId') ?? undefined;
  const leagueName = req.nextUrl.searchParams.get('leagueName') ?? undefined;
  const week = req.nextUrl.searchParams.get('week');
  const teamName = req.nextUrl.searchParams.get('teamName') ?? undefined;
  const sport = req.nextUrl.searchParams.get('sport') ?? undefined;

  try {
    const result = await getCoachEvaluation({
      leagueId,
      leagueName,
      week: week ? parseInt(week, 10) : undefined,
      teamName,
      sport,
    });
    return NextResponse.json(result);
  } catch (e) {
    console.error('[coach/evaluation]', e);
    return NextResponse.json(
      { error: 'Failed to get coach evaluation' },
      { status: 500 }
    );
  }
}
