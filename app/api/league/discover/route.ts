import { NextRequest, NextResponse } from 'next/server';
import { requireVerifiedUser } from '@/lib/auth-guard';
import { getUserLeagues } from '@/lib/sleeper-client';

const CURRENT_IMPORT_SEASON = new Date().getFullYear();

export async function POST(req: NextRequest) {
  const auth = await requireVerifiedUser();
  if (!auth.ok) {
    return auth.response;
  }

  const { platform, credentials } = await req.json().catch(() => ({}));

  if (!platform) {
    return NextResponse.json({ error: 'Missing platform' }, { status: 400 });
  }

  const normalizedPlatform = String(platform).toLowerCase();
  if (!normalizedPlatform) {
    return NextResponse.json({ error: 'Missing platform' }, { status: 400 });
  }

  if (normalizedPlatform !== 'sleeper') {
    return NextResponse.json(
      { error: `Discovery is only available for Sleeper right now. ${platform} discovery is not live yet.` },
      { status: 400 }
    );
  }

  if (!credentials?.username) {
    return NextResponse.json({ error: 'Sleeper username required' }, { status: 400 });
  }

  try {
    const discovered = await getUserLeagues(
      String(credentials.username),
      'nfl',
      String(CURRENT_IMPORT_SEASON),
    );
    return NextResponse.json({ success: true, discovered });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Discovery failed' }, { status: 500 });
  }
}
