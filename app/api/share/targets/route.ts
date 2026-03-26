import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getConnectedTargets,
  linkAccount,
  setAutoPosting,
  unlinkAccount,
} from '@/lib/social-clips-grok/ConnectedSocialAccountResolver';
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
  const action =
    typeof body.action === 'string' && body.action.trim().length > 0
      ? body.action.trim().toLowerCase()
      : 'toggle_auto_post';
  const autoPostingEnabled = !!body.autoPostingEnabled;

  if (!SUPPORTED_PLATFORMS.includes(platform as any)) {
    return NextResponse.json(
      { error: 'Invalid platform', allowed: [...SUPPORTED_PLATFORMS] },
      { status: 400 }
    );
  }

  if (action === 'connect') {
    const currentTargets = await getConnectedTargets(session.user.id);
    const target = currentTargets.find((t) => t.platform === platform);
    if (target && !target.providerConfigured) {
      return NextResponse.json(
        { error: 'Provider not configured for this platform', code: 'PROVIDER_UNAVAILABLE' },
        { status: 503 }
      );
    }
    const accountIdentifier =
      typeof body.accountIdentifier === 'string' && body.accountIdentifier.trim()
        ? body.accountIdentifier.trim().slice(0, 256)
        : `${platform}_${session.user.id.slice(0, 8)}`;
    await linkAccount(session.user.id, platform, accountIdentifier);
  } else if (action === 'disconnect') {
    await unlinkAccount(session.user.id, platform);
  } else {
    await setAutoPosting(session.user.id, platform, autoPostingEnabled);
  }

  const targets = await getConnectedTargets(session.user.id);
  return NextResponse.json({ targets });
}
