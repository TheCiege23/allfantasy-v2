import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getSharePublishLogs,
  publishShareToPlatform,
  retrySharePublish,
} from '@/lib/social-sharing/SocialPublishService';
import { SUPPORTED_PLATFORMS } from '@/lib/social-clips-grok/types';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null;
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const shareId = searchParams.get('shareId');
  if (!shareId) return NextResponse.json({ error: 'shareId required' }, { status: 400 });

  const logs = await getSharePublishLogs(shareId, session.user.id);
  return NextResponse.json({ logs });
}

export async function POST(req: Request) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null;
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const action =
    typeof body.action === 'string' && body.action.trim().length > 0
      ? body.action.trim().toLowerCase()
      : 'publish';

  if (action === 'retry') {
    const logId = typeof body.logId === 'string' ? body.logId : '';
    if (!logId) return NextResponse.json({ error: 'logId required' }, { status: 400 });
    const result = await retrySharePublish(logId, session.user.id);
    if (!result) return NextResponse.json({ error: 'Log not found' }, { status: 404 });
    return NextResponse.json(result);
  }

  const shareId = typeof body.shareId === 'string' ? body.shareId : '';
  const platform = (body.platform ?? 'x').toLowerCase();
  if (!shareId) return NextResponse.json({ error: 'shareId required' }, { status: 400 });
  if (!SUPPORTED_PLATFORMS.includes(platform as any)) {
    return NextResponse.json({ error: 'Invalid platform', allowed: [...SUPPORTED_PLATFORMS] }, { status: 400 });
  }

  const result = await publishShareToPlatform(shareId, platform, session.user.id);
  const logs = await getSharePublishLogs(shareId, session.user.id);
  return NextResponse.json({ ...result, logs });
}
