import { NextResponse } from 'next/server';
import { getSessionAndProfile } from '@/lib/auth-guard';
import { prisma } from '@/lib/prisma';
import { getClipPayload } from '@/lib/social-clips/SocialClipGenerator';
import { CLIP_TYPES, type ClipType } from '@/lib/social-clips/types';

export async function POST(req: Request) {
  const { userId } = await getSessionAndProfile();
  if (!userId) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  let body: { type?: string; title?: string; subtitle?: string; leagueName?: string; week?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const type = (body.type ?? 'weekly_league_winners') as string;
  if (!CLIP_TYPES.includes(type as ClipType)) {
    return NextResponse.json(
      { error: 'Invalid clip type', allowed: CLIP_TYPES },
      { status: 400 }
    );
  }

  const payload = getClipPayload(type as ClipType, {
    title: body.title,
    subtitle: body.subtitle,
    leagueName: body.leagueName,
    week: body.week,
  });

  const clip = await prisma.socialClip.create({
    data: {
      userId,
      clipType: type,
      title: payload.title,
      subtitle: payload.subtitle ?? undefined,
      meta: { ...(payload.meta ?? {}), stats: payload.stats } as object,
    },
  });

  return NextResponse.json({
    id: clip.id,
    clipType: clip.clipType,
    title: clip.title,
    subtitle: clip.subtitle,
    meta: clip.meta,
    createdAt: clip.createdAt.toISOString(),
  });
}
