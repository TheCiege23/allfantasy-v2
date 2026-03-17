import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { publishShareToPlatform } from '@/lib/social-sharing/SharePublishService';

export const dynamic = 'force-dynamic';

const PLATFORMS = ['x', 'instagram', 'tiktok', 'facebook'];

export async function POST(req: Request) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null;
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const shareId = body.shareId;
  const platform = (body.platform ?? 'x').toLowerCase();
  if (!shareId) return NextResponse.json({ error: 'shareId required' }, { status: 400 });
  if (!PLATFORMS.includes(platform)) return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });

  const result = await publishShareToPlatform(shareId, platform, session.user.id);
  return NextResponse.json(result);
}
