import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { approveForPublish, revokeApproval } from '@/lib/social-clips-grok';

export const dynamic = 'force-dynamic';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ assetId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null;
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { assetId } = await params;
  const body = await req.json().catch(() => ({}));
  const approved = body.approved !== false;

  const ok = approved
    ? await approveForPublish(assetId, session.user.id)
    : await revokeApproval(assetId, session.user.id);

  if (!ok) return NextResponse.json({ error: 'Not found or not allowed' }, { status: 404 });
  return NextResponse.json({ approved });
}
