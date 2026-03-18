import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireVerifiedUser } from '@/lib/auth-guard';
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
  /** Create league from full Sleeper import; requires sleeperLeagueId */
  createFromSleeperImport: z.boolean().optional(),
  sleeperLeagueId: z.string().optional(),
  /** League creation wizard: league type (redraft, dynasty, keeper, etc.) */
  league_type: z.string().max(32).optional(),
  /** League creation wizard: draft type (snake, linear, auction, slow_draft) */
  draft_type: z.string().max(32).optional(),
  /** League creation wizard: merged into League.settings (AI, automation, privacy, draft defaults) */
  settings: z.record(z.unknown()).optional(),
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
    createFromSleeperImport,
    sleeperLeagueId,
    league_type: leagueTypeWizard,
    draft_type: draftTypeWizard,
    settings: settingsWizard,
  } = parsed.data;

  if (createFromSleeperImport && !sleeperLeagueId?.trim()) {
    return NextResponse.json({ error: 'sleeperLeagueId is required' }, { status: 400 });
  }

  const sport = sportInput ?? 'NFL';
  const isDevyRequested =
    String(leagueVariantInput ?? '').toLowerCase() === 'devy_dynasty' ||
    String(leagueTypeWizard ?? '').toLowerCase() === 'devy';
  const isC2CRequested =
    String(leagueVariantInput ?? '').toLowerCase() === 'merged_devy_c2c' ||
    String(leagueTypeWizard ?? '').toLowerCase() === 'c2c';
  if ((isDevyRequested || isC2CRequested) && isDynastyInput === false) {
    return NextResponse.json(
      { error: 'Devy and C2C (Merged Devy) leagues cannot be created as redraft. They are dynasty-only.' },
      { status: 400 }
    );
  }
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
    // --- Sleeper full import path ---
    if (createFromSleeperImport && sleeperLeagueId?.trim()) {
      const verifiedAuth = await requireVerifiedUser();
      if (!verifiedAuth.ok) {
        return verifiedAuth.response;
      }

      const cleanSleeperId = sleeperLeagueId.trim();
      const existing = await (prisma as any).league.findFirst({
        where: {
          userId: verifiedAuth.userId,
          platform: 'sleeper',
          platformLeagueId: cleanSleeperId,
        },
      });
      if (existing) {
        return NextResponse.json({ error: 'This league already exists in your account' }, { status: 409 });
      }
      const { runImportedLeagueNormalizationPipeline } = await import('@/lib/league-import/ImportedLeagueNormalizationPipeline');
      const result = await runImportedLeagueNormalizationPipeline(cleanSleeperId);
      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: result.code === 'LEAGUE_NOT_FOUND' ? 404 : 500 }
        );
      }
      const { normalized } = result;
      const leagueSport = (normalized.league.sport === 'NFL' || normalized.league.sport === 'NBA' || normalized.league.sport === 'MLB' || normalized.league.sport === 'NHL' || normalized.league.sport === 'NCAAF' || normalized.league.sport === 'NCAAB' || normalized.league.sport === 'SOCCER')
        ? normalized.league.sport
        : 'NFL';
      const settingsFromImport: Record<string, unknown> = {
        ...(normalized.league as Record<string, unknown>),
        playoff_team_count: normalized.league.playoff_team_count,
        roster_positions: (normalized.league as Record<string, unknown>).roster_positions,
        scoring_settings: (normalized.league as Record<string, unknown>).scoring_settings,
      };
      const league = await (prisma as any).league.create({
        data: {
          userId: verifiedAuth.userId,
          name: normalized.league.name,
          platform: 'sleeper',
          platformLeagueId: cleanSleeperId,
          leagueSize: normalized.league.leagueSize,
          scoring: normalized.league.scoring ?? undefined,
          isDynasty: normalized.league.isDynasty,
          sport: leagueSport,
          leagueVariant: null,
          season: normalized.league.season ?? undefined,
          rosterSize: normalized.league.rosterSize ?? undefined,
          starters: (normalized.league as Record<string, unknown>).roster_positions ?? undefined,
          avatarUrl: normalized.league_branding?.avatar_url ?? undefined,
          settings: settingsFromImport,
          syncStatus: 'pending',
          importBatchId: normalized.source.import_batch_id ?? undefined,
          importedAt: normalized.source.imported_at ? new Date(normalized.source.imported_at) : undefined,
        },
      });
      try {
        const { bootstrapLeagueFromSleeperImport } = await import('@/lib/league-import/sleeper/SleeperLeagueCreationBootstrapService');
        await bootstrapLeagueFromSleeperImport(league.id, normalized);
      } catch (err) {
        console.warn('[league/create] Sleeper import bootstrap non-fatal:', err);
      }
      try {
        const { bootstrapLeagueDraftConfig } = await import('@/lib/draft-defaults/LeagueDraftBootstrapService');
        const { bootstrapLeagueWaiverSettings } = await import('@/lib/waiver-defaults/LeagueWaiverBootstrapService');
        const { bootstrapLeaguePlayoffConfig } = await import('@/lib/playoff-defaults/LeaguePlayoffBootstrapService');
        const { bootstrapLeagueScheduleConfig } = await import('@/lib/schedule-defaults/LeagueScheduleBootstrapService');
        await Promise.all([
          bootstrapLeagueDraftConfig(league.id),
          bootstrapLeagueWaiverSettings(league.id),
          bootstrapLeaguePlayoffConfig(league.id),
          bootstrapLeagueScheduleConfig(league.id),
        ]);
      } catch (err) {
        console.warn('[league/create] Import gap-fill (draft/waiver/playoff/schedule) non-fatal:', err);
      }
      let historicalBackfill: unknown = null;
      try {
        const { syncSleeperHistoricalBackfillAfterImport } = await import('@/lib/league-import/sleeper/SleeperHistoricalBackfillService');
        historicalBackfill = await syncSleeperHistoricalBackfillAfterImport({
          leagueId: league.id,
          isDynasty: normalized.league.isDynasty,
        });
      } catch (err) {
        console.warn('[league/create] Historical Sleeper backfill non-fatal:', err);
      }
      return NextResponse.json({
        league: { id: league.id, name: league.name, sport: league.sport },
        historicalBackfill,
      });
    }

    // --- Native creation path (unchanged) ---
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

    const { getInitialSettingsForCreation } = await import('@/lib/league-defaults-orchestrator/LeagueDefaultsOrchestrator');
    const presetVariant =
      String(leagueTypeWizard ?? leagueVariantInput ?? '').toLowerCase() === 'devy'
        ? 'devy_dynasty'
        : (leagueVariantInput ?? undefined);
    const initialSettings = getInitialSettingsForCreation(sport as string, presetVariant, {
      superflex: isSuperflex ?? false,
      roster_mode: isDynasty ? 'dynasty' : undefined,
    }) as Record<string, unknown>;
    if (leagueTypeWizard) initialSettings.league_type = leagueTypeWizard;
    if (draftTypeWizard) initialSettings.draft_type = draftTypeWizard;
    if (settingsWizard && typeof settingsWizard === 'object') {
      Object.assign(initialSettings, settingsWizard);
    }
    const { validateLeagueSettings } = await import('@/lib/league-settings-validation');
    const validation = validateLeagueSettings(initialSettings);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.errors[0] ?? 'Invalid league configuration', errors: validation.errors },
        { status: 400 }
      );
    }
    const isGuillotine =
      String(leagueVariantInput ?? '').toLowerCase() === 'guillotine' ||
      String(leagueTypeWizard ?? '').toLowerCase() === 'guillotine';
    const isSalaryCap =
      String(leagueVariantInput ?? '').toLowerCase() === 'salary_cap' ||
      String(leagueTypeWizard ?? '').toLowerCase() === 'salary_cap';
    const isSurvivor =
      String(leagueVariantInput ?? '').toLowerCase() === 'survivor' ||
      String(leagueTypeWizard ?? '').toLowerCase() === 'survivor';
    const isDevy =
      String(leagueVariantInput ?? '').toLowerCase() === 'devy_dynasty' ||
      String(leagueTypeWizard ?? '').toLowerCase() === 'devy';
    const isC2C =
      String(leagueVariantInput ?? '').toLowerCase() === 'merged_devy_c2c' ||
      String(leagueTypeWizard ?? '').toLowerCase() === 'c2c';
    const resolvedVariant = isGuillotine ? 'guillotine' : isSalaryCap ? 'salary_cap' : isSurvivor ? 'survivor' : isC2C ? 'merged_devy_c2c' : isDevy ? 'devy_dynasty' : (leagueVariantInput ?? null);
    const effectiveDynasty = isDevy || isC2C ? true : isDynasty;
    const league = await (prisma as any).league.create({
      data: {
        userId: session.user.id,
        name,
        platform,
        platformLeagueId: platformLeagueId || `manual-${Date.now()}`,
        leagueSize,
        scoring,
        isDynasty: effectiveDynasty,
        sport,
        leagueVariant: resolvedVariant,
        avatarUrl: isGuillotine ? '/guillotine/Guillotine.png' : undefined,
        settings: initialSettings,
        syncStatus: platform === 'manual' ? 'manual' : 'pending',
      },
    });

    try {
      const { runPostCreateInitialization } = await import('@/lib/league-defaults-orchestrator/LeagueDefaultsOrchestrator');
      await runPostCreateInitialization(league.id, sport as string, resolvedVariant ?? leagueVariantInput ?? undefined);
    } catch (err) {
      console.warn('[league/create] Bootstrap non-fatal:', err);
    }

    if (isGuillotine) {
      try {
        const { upsertGuillotineConfig } = await import('@/lib/guillotine/GuillotineLeagueConfig');
        await upsertGuillotineConfig(league.id, {});
      } catch (err) {
        console.warn('[league/create] Guillotine config bootstrap non-fatal:', err);
      }
    }

    if (isSalaryCap) {
      try {
        const { upsertSalaryCapConfig } = await import('@/lib/salary-cap/SalaryCapLeagueConfig');
        const mode = String(settingsWizard?.mode ?? initialSettings.mode ?? 'dynasty').toLowerCase();
        await upsertSalaryCapConfig(league.id, {
          mode: mode === 'bestball' ? 'bestball' : 'dynasty',
          ...(typeof (settingsWizard ?? {}) === 'object' && (settingsWizard as Record<string, unknown>)?.startupCap != null && { startupCap: Number((settingsWizard as Record<string, unknown>).startupCap) }),
          ...(typeof (settingsWizard ?? {}) === 'object' && (settingsWizard as Record<string, unknown>)?.futureDraftType != null && { futureDraftType: String((settingsWizard as Record<string, unknown>).futureDraftType) }),
        });
      } catch (err) {
        console.warn('[league/create] Salary cap config bootstrap non-fatal:', err);
      }
    }

    if (isSurvivor) {
      try {
        const { upsertSurvivorConfig } = await import('@/lib/survivor/SurvivorLeagueConfig');
        const mode = String(settingsWizard?.mode ?? initialSettings.mode ?? 'redraft').toLowerCase();
        await upsertSurvivorConfig(league.id, {
          mode: mode === 'bestball' ? 'bestball' : 'redraft',
          ...(typeof (settingsWizard ?? {}) === 'object' && (settingsWizard as Record<string, unknown>)?.tribeCount != null && { tribeCount: Number((settingsWizard as Record<string, unknown>).tribeCount) }),
          ...(typeof (settingsWizard ?? {}) === 'object' && (settingsWizard as Record<string, unknown>)?.tribeSize != null && { tribeSize: Number((settingsWizard as Record<string, unknown>).tribeSize) }),
        });
      } catch (err) {
        console.warn('[league/create] Survivor config bootstrap non-fatal:', err);
      }
    }

    if (isDevy) {
      try {
        const { upsertDevyConfig } = await import('@/lib/devy/DevyLeagueConfig');
        await upsertDevyConfig(league.id, {});
      } catch (err) {
        console.warn('[league/create] Devy config bootstrap non-fatal:', err);
      }
    }

    if (isC2C) {
      try {
        const { upsertC2CConfig } = await import('@/lib/merged-devy-c2c/C2CLeagueConfig');
        const s = settingsWizard as Record<string, unknown> | undefined;
        await upsertC2CConfig(league.id, {
          startupFormat: (s?.c2c_startup_mode as string) ?? 'merged',
          mergedStartupDraft: (s?.c2c_startup_mode as string) !== 'separate',
          separateStartupCollegeDraft: (s?.c2c_startup_mode as string) === 'separate',
          standingsModel: (s?.c2c_standings_model as string) ?? 'unified',
          bestBallPro: s?.c2c_best_ball_pro !== false,
          bestBallCollege: Boolean(s?.c2c_best_ball_college),
          collegeRosterSize: typeof s?.c2c_college_roster_size === 'number' ? s.c2c_college_roster_size : 20,
          rookieDraftRounds: typeof s?.c2c_rookie_draft_rounds === 'number' ? s.c2c_rookie_draft_rounds : 4,
          collegeDraftRounds: typeof s?.c2c_college_draft_rounds === 'number' ? s.c2c_college_draft_rounds : 6,
        });
      } catch (err) {
        console.warn('[league/create] C2C config bootstrap non-fatal:', err);
      }
    }

    return NextResponse.json({ league: { id: league.id, name: league.name, sport: league.sport } });
  } catch (err) {
    console.error('[league/create] Error:', err);
    return NextResponse.json({ error: 'Failed to create league' }, { status: 500 });
  }
}
