import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const clip = await prisma.socialClip.findUnique({
    where: { id },
  });

  if (!clip) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }

  // Public view so share links work: anyone with the link can view the clip.
  // userId is only used for optional personalization later.
  const meta = clip.meta as Record<string, unknown> | null;
  const stats =
    meta && Array.isArray(meta.stats)
      ? (meta.stats as string[])
      : undefined;

  return NextResponse.json({
    id: clip.id,
    clipType: clip.clipType,
    title: clip.title,
    subtitle: clip.subtitle,
    stats,
    meta: clip.meta,
    createdAt: clip.createdAt.toISOString(),
  });
}
