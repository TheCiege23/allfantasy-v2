import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ assetId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null;
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { assetId } = await params;
  const asset = await prisma.socialContentAsset.findFirst({
    where: { id: assetId, userId: session.user.id },
  });

  if (!asset) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const metadata = (asset.metadata ?? {}) as Record<string, unknown>;
  return NextResponse.json({
    id: asset.id,
    sport: asset.sport,
    assetType: asset.assetType,
    title: asset.title,
    contentBody: asset.contentBody,
    provider: asset.provider,
    approvedForPublish: asset.approvedForPublish,
    metadata,
    createdAt: asset.createdAt.toISOString(),
  });
}

/** PATCH: edit clip content (PROMPT 146 — edit mode). */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ assetId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null;
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { assetId } = await params;
  const asset = await prisma.socialContentAsset.findFirst({
    where: { id: assetId, userId: session.user.id },
  });
  if (!asset) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const updates: { title?: string; contentBody?: string; metadata?: object } = {};
  if (typeof body.title === 'string' && body.title.trim()) {
    updates.title = body.title.trim().slice(0, 512);
  }
  if (typeof body.contentBody === 'string') {
    updates.contentBody = body.contentBody.slice(0, 50_000);
  }
  if (body.metadata && typeof body.metadata === 'object') {
    const existing = (asset.metadata ?? {}) as Record<string, unknown>;
    const merged = { ...existing, ...body.metadata } as Record<string, unknown>;
    updates.metadata = merged as object;
    updates.contentBody = JSON.stringify({
      shortCaption: merged.shortCaption,
      shortScriptOverlay: merged.shortScriptOverlay,
      headline: merged.headline,
      ctaText: merged.ctaText,
      hashtags: merged.hashtags,
      socialCardCopy: merged.socialCardCopy,
      clipTitle: merged.clipTitle,
      platformVariants: merged.platformVariants,
      thread: merged.thread,
    });
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(asset);
  }

  const updated = await prisma.socialContentAsset.update({
    where: { id: assetId },
    data: updates,
  });
  const metadata = (updated.metadata ?? {}) as Record<string, unknown>;
  return NextResponse.json({
    id: updated.id,
    sport: updated.sport,
    assetType: updated.assetType,
    title: updated.title,
    contentBody: updated.contentBody,
    provider: updated.provider,
    approvedForPublish: updated.approvedForPublish,
    metadata,
    createdAt: updated.createdAt.toISOString(),
  });
}
