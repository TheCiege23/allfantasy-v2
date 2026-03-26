import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { resolveSharePreview } from '@/lib/social-sharing/SharePreviewResolver';
import { ACHIEVEMENT_SHARE_TYPES } from '@/lib/social-sharing/types';
import type { AchievementShareType, AchievementShareContext } from '@/lib/social-sharing/types';
import { getTemplateShareCopy } from '@/lib/social-sharing/GrokShareCopyService';

export const dynamic = 'force-dynamic';

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === 'string');
}

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
    const metadata = asRecord(moment.metadata);
    const nestedContext = asRecord(metadata.context);
    const context = (Object.keys(nestedContext).length > 0 ? nestedContext : metadata) as AchievementShareContext;
    const fallbackCopy = getTemplateShareCopy(moment.shareType as AchievementShareType, context);
    const storedCopyRaw = asRecord(metadata.grokCopy);
    const storedCopy = storedCopyRaw.caption
      ? {
          caption: typeof storedCopyRaw.caption === 'string' ? storedCopyRaw.caption : fallbackCopy.caption,
          headline: typeof storedCopyRaw.headline === 'string' ? storedCopyRaw.headline : fallbackCopy.headline,
          cta: typeof storedCopyRaw.cta === 'string' ? storedCopyRaw.cta : fallbackCopy.cta,
          hashtags: toStringArray(storedCopyRaw.hashtags),
          platformVariants:
            storedCopyRaw.platformVariants &&
            typeof storedCopyRaw.platformVariants === 'object' &&
            !Array.isArray(storedCopyRaw.platformVariants)
              ? (storedCopyRaw.platformVariants as Record<string, { caption: string; hashtags: string[] }>)
              : fallbackCopy.platformVariants,
        }
      : fallbackCopy;
    storedCopy.caption = moment.summary || storedCopy.caption;
    storedCopy.headline = moment.title || storedCopy.headline;
    const payload = resolveSharePreview(
      moment.shareType as AchievementShareType,
      context,
      storedCopy,
      moment.id,
      origin.startsWith('http') ? origin : `https://${origin}`
    );
    return NextResponse.json({
      ...payload,
      approvedForPublish: !!metadata.approvedForPublish,
    });
  }

  const shareType = searchParams.get('shareType') as AchievementShareType | null;
  const context: AchievementShareContext = {
    leagueName: searchParams.get('leagueName') ?? undefined,
    teamName: searchParams.get('teamName') ?? undefined,
    opponentName: searchParams.get('opponentName') ?? undefined,
    week: searchParams.get('week') ? parseInt(searchParams.get('week')!, 10) : undefined,
    score: searchParams.get('score') ? parseInt(searchParams.get('score')!, 10) : undefined,
    sport: searchParams.get('sport') ?? undefined,
  };
  const type = shareType && ACHIEVEMENT_SHARE_TYPES.includes(shareType) ? shareType : 'winning_matchup';
  const copy = getTemplateShareCopy(type, context);
  const payload = resolveSharePreview(type, context, copy, undefined, origin.startsWith('http') ? origin : `https://${origin}`);
  return NextResponse.json(payload);
}
