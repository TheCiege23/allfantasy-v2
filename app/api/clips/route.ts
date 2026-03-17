import { NextResponse } from 'next/server';
import { getSessionAndProfile } from '@/lib/auth-guard';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const { userId } = await getSessionAndProfile();
  if (!userId) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  const clips = await prisma.socialClip.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return NextResponse.json({
    clips: clips.map((c) => ({
      id: c.id,
      clipType: c.clipType,
      title: c.title,
      subtitle: c.subtitle,
      meta: c.meta,
      createdAt: c.createdAt.toISOString(),
    })),
  });
}
