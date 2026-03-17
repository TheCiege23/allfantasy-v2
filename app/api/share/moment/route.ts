import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { normalizeToSupportedSport } from '@/lib/sport-scope';
import { ACHIEVEMENT_SHARE_TYPES } from '@/lib/social-sharing/types';
import type { AchievementShareType } from '@/lib/social-sharing/types';
import { getShareContent } from '@/lib/social-sharing/AchievementShareGenerator';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null;
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const shareType = ACHIEVEMENT_SHARE_TYPES.includes(body.shareType as AchievementShareType)
    ? body.shareType
    : 'winning_matchup';
  const sport = normalizeToSupportedSport(body.sport);
  const context = {
    leagueName: body.leagueName,
    leagueId: body.leagueId,
    score: body.score,
    opponentName: body.opponentName,
    week: body.week,
    teamName: body.teamName,
    bracketName: body.bracketName,
    rivalryName: body.rivalryName,
    playerName: body.playerName,
    rank: body.rank,
    tier: body.tier,
  };
  const content = getShareContent(shareType as AchievementShareType, context);

  const moment = await prisma.shareableMoment.create({
    data: {
      userId: session.user.id,
      sport,
      shareType,
      title: content.title,
      summary: content.text,
      metadata: context as object,
    },
  });

  const base = process.env.NEXTAUTH_URL ?? (req.headers.get('x-forwarded-host') ? `https://${req.headers.get('x-forwarded-host')}` : '');
  return NextResponse.json({
    shareId: moment.id,
    shareUrl: base ? `${base.replace(/\/$/, '')}/share/${moment.id}` : '',
    title: moment.title,
    summary: moment.summary,
    createdAt: moment.createdAt.toISOString(),
  });
}
