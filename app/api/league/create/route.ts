import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  platform: z.enum(['sleeper', 'espn', 'manual']),
  platformLeagueId: z.string().optional(),
  leagueSize: z.number().min(4).max(32).optional(),
  scoring: z.string().optional(),
  isDynasty: z.boolean().optional(),
  isSuperflex: z.boolean().optional(),
  sport: z.enum(['NFL', 'NHL', 'MLB', 'NBA', 'NCAAF', 'NCAAB', 'SOCCER']).optional(),
  leagueVariant: z.string().max(32).optional(),
  userId: z.string().optional(),
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

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input' }, { status: 400 });
  }

  const {
    name: nameInput,
    platform,
    platformLeagueId,
    leagueSize: leagueSizeInput,
    scoring: scoringInput,
    isDynasty: isDynastyInput,
    isSuperflex,
    sport: sportInput,
    leagueVariant: leagueVariantInput,
  } = parsed.data;

  const sport = sportInput ?? 'NFL';
  let name = nameInput;
  let leagueSize = leagueSizeInput;
  let scoring = scoringInput;
  let isDynasty = isDynastyInput;
  if (name == null || leagueSize == null || scoring == null || isDynasty == null) {
    const { getLeagueDefaults, getScoringDefaults } = await import('@/lib/sport-defaults/SportDefaultsRegistry');
    const leagueDef = getLeagueDefaults(sport as any);
    const scoringDef = getScoringDefaults(sport as any);
    if (name == null) name = leagueDef.default_league_name_pattern;
    if (leagueSize == null) leagueSize = leagueDef.default_team_count;
    if (scoring == null) {
      const isIdp = leagueVariantInput && ['IDP', 'DYNASTY_IDP'].includes(leagueVariantInput.toUpperCase());
      scoring = isIdp ? 'IDP' : scoringDef.scoring_format;
    }
    if (isDynasty == null) isDynasty = false;
  }

  try {
    if (platformLeagueId && platform !== 'manual') {
      const existing = await (prisma as any).league.findFirst({
        where: {
          userId: session.user.id,
          platform,
          platformLeagueId,
        },
      });

      if (existing) {
        return NextResponse.json({ error: 'This league already exists in your account' }, { status: 409 });
      }
    }

    const { buildInitialLeagueSettings } = await import('@/lib/sport-defaults/LeagueDefaultSettingsService');
    const initialSettings = buildInitialLeagueSettings(sport as string);
    const league = await (prisma as any).league.create({
      data: {
        userId: session.user.id,
        name,
        platform,
        platformLeagueId: platformLeagueId || `manual-${Date.now()}`,
        leagueSize,
        scoring,
        isDynasty,
        sport,
        leagueVariant: leagueVariantInput ?? null,
        settings: { ...initialSettings, ...(isSuperflex ? { superflex: true } : {}) },
        syncStatus: platform === 'manual' ? 'manual' : 'pending',
      },
    });

    const bootstrapFormat =
      leagueVariantInput && ['IDP', 'DYNASTY_IDP'].includes(leagueVariantInput.toUpperCase()) ? 'IDP' : scoring;
    try {
      const { runLeagueBootstrap } = await import('@/lib/league-creation/LeagueBootstrapOrchestrator');
      await runLeagueBootstrap(league.id, sport as any, bootstrapFormat);
    } catch (err) {
      console.warn('[league/create] Bootstrap non-fatal:', err);
      // non-fatal: league is created; roster/scoring/waiver may use in-memory defaults
    }

    return NextResponse.json({ league: { id: league.id, name: league.name, sport: league.sport } });
  } catch (err) {
    console.error('[league/create] Error:', err);
    return NextResponse.json({ error: 'Failed to create league' }, { status: 500 });
  }
}
