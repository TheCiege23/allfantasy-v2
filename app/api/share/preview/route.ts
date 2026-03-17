import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { resolveSharePreview } from '@/lib/social-sharing/SharePreviewResolver';
import { ACHIEVEMENT_SHARE_TYPES } from '@/lib/social-sharing/types';
import type { AchievementShareType, AchievementShareContext } from '@/lib/social-sharing/types';
import { getTemplateShareCopy } from '@/lib/social-sharing/GrokShareCopyService';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null;
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const shareId = searchParams.get('shareId');
  const origin = process.env.NEXTAUTH_URL ?? req.headers.get('x-forwarded-host') ?? '';

  if (shareId) {
    const moment = await prisma.shareableMoment.findFirst({
      where: { id: shareId, userId: session.user.id },
    });
    if (!moment) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const context: AchievementShareContext = (moment.metadata as AchievementShareContext) ?? {};
    const copy = getTemplateShareCopy(moment.shareType as AchievementShareType, context);
    copy.caption = moment.summary;
    copy.headline = moment.title;
    const payload = resolveSharePreview(
      moment.shareType as AchievementShareType,
      context,
      copy,
      moment.id,
      origin.startsWith('http') ? origin : `https://${origin}`
    );
    return NextResponse.json(payload);
  }

  const shareType = searchParams.get('shareType') as AchievementShareType | null;
  const context: AchievementShareContext = {
    leagueName: searchParams.get('leagueName') ?? undefined,
    teamName: searchParams.get('teamName') ?? undefined,
    opponentName: searchParams.get('opponentName') ?? undefined,
    week: searchParams.get('week') ? parseInt(searchParams.get('week')!, 10) : undefined,
    score: searchParams.get('score') ? parseInt(searchParams.get('score')!, 10) : undefined,
  };
  const type = shareType && ACHIEVEMENT_SHARE_TYPES.includes(shareType) ? shareType : 'winning_matchup';
  const copy = getTemplateShareCopy(type, context);
  const payload = resolveSharePreview(type, context, copy, undefined, origin.startsWith('http') ? origin : `https://${origin}`);
  return NextResponse.json(payload);
}
