import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getRosterTemplateForLeague } from '@/lib/multi-sport/MultiSportRosterService';
import { getFormatTypeForVariant } from '@/lib/sport-defaults/LeagueVariantRegistry';

export async function GET(req: NextRequest) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null;
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = session.user.id as string;
  const { searchParams } = new URL(req.url);
  const leagueId = searchParams.get('leagueId');

  if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 });

  const [league, roster] = await Promise.all([
    (prisma as any).league.findUnique({
      where: { id: leagueId },
      select: { id: true, sport: true, leagueVariant: true },
    }),
    (prisma as any).roster.findFirst({
      where: { leagueId, platformUserId: userId },
    }),
  ]);

  if (!league) return NextResponse.json({ error: 'League not found' }, { status: 404 });

  if (!roster) return NextResponse.json({ error: 'Roster not found' }, { status: 404 });

  const leagueSport = (league.sport as string) || 'NFL';
  const leagueVariant = (league.leagueVariant as string | null) ?? null;
  const formatType = getFormatTypeForVariant(leagueSport, leagueVariant ?? undefined);

  let slotLimits: Record<'starters' | 'bench' | 'ir' | 'taxi' | 'devy', number> | null = null;
  let starterAllowedPositions: string[] = [];
  let rosterTemplateId: string | null = null;
  try {
    const template = await getRosterTemplateForLeague(leagueSport as any, formatType, leagueId);
    rosterTemplateId = template.templateId;
    slotLimits = {
      starters: template.slots.reduce((sum, slot) => sum + (slot.starterCount ?? 0), 0),
      bench: template.slots.reduce((sum, slot) => sum + (slot.benchCount ?? 0), 0),
      ir: template.slots.reduce((sum, slot) => sum + (slot.reserveCount ?? 0), 0),
      taxi: template.slots.reduce((sum, slot) => sum + (slot.taxiCount ?? 0), 0),
      devy: template.slots.reduce((sum, slot) => sum + (slot.devyCount ?? 0), 0),
    };
    starterAllowedPositions = [
      ...new Set(
        template.slots
          .filter((slot) => slot.starterCount > 0)
          .flatMap((slot) => slot.allowedPositions ?? [])
      ),
    ];
  } catch {
    // Template hydration failure should not block base roster rendering.
  }

  return NextResponse.json({
    rosterId: roster.id,
    roster: roster.playerData,
    faabRemaining: roster.faabRemaining,
    waiverPriority: roster.waiverPriority ?? null,
    sport: leagueSport,
    leagueVariant,
    formatType: formatType ?? null,
    slotLimits,
    starterAllowedPositions,
    rosterTemplateId,
  });
}
