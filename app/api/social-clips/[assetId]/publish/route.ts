import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { canPublish, publishAssetToPlatform } from '@/lib/social-clips-grok';
import { SUPPORTED_PLATFORMS } from '@/lib/social-clips-grok/types';

export const dynamic = 'force-dynamic';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ assetId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null;
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { assetId } = await params;
  const body = await req.json().catch(() => ({}));
  const platform = (body.platform ?? 'x').toLowerCase();

  if (!SUPPORTED_PLATFORMS.includes(platform as any)) {
    return NextResponse.json(
      { error: 'Invalid platform', allowed: [...SUPPORTED_PLATFORMS] },
      { status: 400 }
    );
  }

  const allowed = await canPublish(assetId, session.user.id);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Approve this asset for publish first' },
      { status: 400 }
    );
  }

  const result = await publishAssetToPlatform(assetId, platform, session.user.id);
  return NextResponse.json(result);
}
