import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPublishLogsForAsset } from '@/lib/social-clips-grok/SocialPostStatusTracker';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ assetId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null;
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { assetId } = await params;
  const logs = await getPublishLogsForAsset(assetId, session.user.id);
  return NextResponse.json({ logs });
}
