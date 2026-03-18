import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { dispatchNotification } from '@/lib/notifications/NotificationDispatcher';
import { getTradeBlockReason } from '@/lib/tournament-mode/safety';

const proposeSchema = z.object({
  leagueId: z.string(),
  offerFrom: z.number(),
  offerTo: z.number(),
  drops: z.array(z.string()).default([]),
  adds: z.array(z.string()).default([]),
});

export async function POST(req: Request) {
  const session = (await getServerSession(authOptions as any)) as {
    user?: { id?: string };
  } | null;

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = proposeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid proposal data', details: parsed.error.errors }, { status: 400 });
  }

  const { leagueId, offerFrom, offerTo, drops, adds } = parsed.data;

  const tradeBlockReason = await getTradeBlockReason(leagueId);
  if (tradeBlockReason) {
    return NextResponse.json({ error: tradeBlockReason }, { status: 403 });
  }

  try {
    const share = await (prisma as any).tradeShare.create({
      data: {
        userId: session.user.id,
        sideA: { rosterId: offerFrom, assets: adds },
        sideB: { rosterId: offerTo, assets: drops },
        analysis: {
          type: 'proposal',
          status: 'pending',
          leagueId,
          createdBy: session.user.id,
        },
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      },
    });

    const recipientRoster = await (prisma as any).roster.findUnique({
      where: { id: offerTo },
      select: { platformUserId: true },
    });
    const recipientUserId = recipientRoster?.platformUserId && !String(recipientRoster.platformUserId).startsWith('orphan-')
      ? String(recipientRoster.platformUserId)
      : null;
    if (recipientUserId && recipientUserId !== session.user.id) {
      dispatchNotification({
        userIds: [recipientUserId],
        category: 'trade_proposals',
        productType: 'app',
        type: 'trade_proposal',
        title: 'New trade proposal',
        body: 'You received a trade proposal. Open the league to review.',
        actionHref: `/app/league/${leagueId}?tab=Trades`,
        actionLabel: 'View trade',
        meta: { leagueId, shareId: share.id },
        severity: 'medium',
      }).catch((e) => console.error('[trade/propose] notify', e));
    }

    return NextResponse.json({
      success: true,
      shareId: share.id,
      message: 'Trade proposal saved. Open Sleeper to send this trade to the other manager.',
      sleeperDeepLink: `https://sleeper.com/leagues/${leagueId}`,
    });
  } catch (err) {
    console.error('[trade/propose] Error:', err);
    return NextResponse.json({ error: 'Failed to save trade proposal' }, { status: 500 });
  }
}
