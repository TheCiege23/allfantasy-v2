import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnectedTargets, setAutoPosting } from '@/lib/social-clips-grok/ConnectedSocialAccountResolver';
import { SUPPORTED_PLATFORMS } from '@/lib/social-clips-grok/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null;
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const targets = await getConnectedTargets(session.user.id);
  return NextResponse.json({ targets });
}

export async function POST(req: Request) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null;
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const platform = (body.platform ?? '').toLowerCase();
  const autoPostingEnabled = !!body.autoPostingEnabled;

  if (!SUPPORTED_PLATFORMS.includes(platform as any)) {
    return NextResponse.json(
      { error: 'Invalid platform', allowed: [...SUPPORTED_PLATFORMS] },
      { status: 400 }
    );
  }

  await setAutoPosting(session.user.id, platform, autoPostingEnabled);
  const targets = await getConnectedTargets(session.user.id);
  return NextResponse.json({ targets });
}
