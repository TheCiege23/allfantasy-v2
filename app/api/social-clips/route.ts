import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null;
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const assets = await prisma.socialContentAsset.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return NextResponse.json({
    assets: assets.map((a) => ({
      id: a.id,
      sport: a.sport,
      assetType: a.assetType,
      title: a.title,
      provider: a.provider,
      approvedForPublish: a.approvedForPublish,
      createdAt: a.createdAt.toISOString(),
    })),
  });
}
