import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateSocialClip } from '@/lib/social-clips-grok';
import { normalizeToSupportedSport } from '@/lib/sport-scope';
import { SOCIAL_ASSET_TYPES, type SocialAssetType } from '@/lib/social-clips-grok/types';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null;
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const sport = normalizeToSupportedSport(body.sport ?? 'NFL');
  const assetType = SOCIAL_ASSET_TYPES.includes((body.assetType as SocialAssetType) ?? '')
    ? (body.assetType as SocialAssetType)
    : 'weekly_league_winners';
  const leagueName = typeof body.leagueName === 'string' ? body.leagueName.trim() : undefined;
  const week = typeof body.week === 'number' ? body.week : undefined;
  const tone = typeof body.tone === 'string' ? body.tone : undefined;
  const brandingHint = typeof body.brandingHint === 'string' ? body.brandingHint : undefined;

  const result = await generateSocialClip({
    sport,
    assetType,
    leagueName,
    week,
    tone,
    brandingHint,
  });

  if (!result) {
    return NextResponse.json(
      { error: 'Grok content generation failed. Check server logs or XAI_API_KEY/GROK_API_KEY.' },
      { status: 500 }
    );
  }

  const asset = await prisma.socialContentAsset.create({
    data: {
      userId: session.user.id,
      sport: result.sport,
      assetType: result.assetType,
      title: result.title,
      contentBody: result.contentBody,
      provider: 'grok',
      metadata: {
        shortCaption: result.output.shortCaption,
        headline: result.output.headline,
        ctaText: result.output.ctaText,
        hashtags: result.output.hashtags,
        socialCardCopy: result.output.socialCardCopy,
        clipTitle: result.output.clipTitle,
        platformVariants: result.output.platformVariants,
      },
      approvedForPublish: false,
    },
  });

  return NextResponse.json({
    id: asset.id,
    title: asset.title,
    sport: asset.sport,
    assetType: asset.assetType,
    createdAt: asset.createdAt.toISOString(),
  });
}
