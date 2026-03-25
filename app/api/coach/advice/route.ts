import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getCoachAdvice } from '@/lib/fantasy-coach';
import type { AdviceType } from '@/lib/fantasy-coach/types';
import { authOptions } from '@/lib/auth';
import { assertLeagueMember } from '@/lib/league-access';
import { logAiOutput } from '@/lib/ai/output-logger';
import { normalizeToSupportedSport } from '@/lib/sport-scope';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null;
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    type?: string;
    leagueId?: string;
    leagueName?: string;
    week?: number;
    teamName?: string;
    sport?: string;
  };
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

  if (body.leagueId) {
    try {
      await assertLeagueMember(body.leagueId, session.user.id);
    } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  try {
    const result = await getCoachAdvice(type as AdviceType, {
      leagueId: body.leagueId,
      leagueName: body.leagueName,
      week: body.week,
      teamName: body.teamName,
      sport: body.sport ? normalizeToSupportedSport(body.sport) : undefined,
    });

    await logAiOutput({
      provider: 'openai',
      role: 'narrative',
      taskType: type === 'lineup' ? 'start_sit_assistant' : `coach_${type}`,
      targetType: 'user',
      targetId: session.user.id,
      contentJson: result,
      meta: {
        leagueId: body.leagueId ?? null,
        type,
      },
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
