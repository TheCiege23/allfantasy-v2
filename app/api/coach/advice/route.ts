import { NextResponse } from 'next/server';
import { getCoachAdvice } from '@/lib/fantasy-coach';
import type { AdviceType } from '@/lib/fantasy-coach/types';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let body: { type?: string; leagueId?: string; leagueName?: string; week?: number; teamName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const type = (body.type ?? 'lineup') as string;
  const validTypes: AdviceType[] = ['lineup', 'trade', 'waiver'];
  if (!validTypes.includes(type as AdviceType)) {
    return NextResponse.json(
      { error: 'Invalid type', allowed: validTypes },
      { status: 400 }
    );
  }

  try {
    const result = await getCoachAdvice(type as AdviceType, {
      leagueId: body.leagueId,
      leagueName: body.leagueName,
      week: body.week,
      teamName: body.teamName,
    });
    return NextResponse.json(result);
  } catch (e) {
    console.error('[coach/advice]', e);
    return NextResponse.json(
      { error: 'Failed to get coach advice' },
      { status: 500 }
    );
  }
}
