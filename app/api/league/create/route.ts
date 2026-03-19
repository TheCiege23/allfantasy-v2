import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireVerifiedUser } from '@/lib/auth-guard';
import { prisma } from '@/lib/prisma';
import { buildLeagueInviteUrl } from '@/lib/viral-loop';
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

  let sport = sportInput ?? 'NFL';
  const isIdpRequested =
    String(leagueVariantInput ?? '').toUpperCase() === 'IDP' ||
    String(leagueVariantInput ?? '').toUpperCase() === 'DYNASTY_IDP' ||
    String(leagueTypeWizard ?? '').toLowerCase() === 'idp' ||
    String(leagueTypeWizard ?? '').toLowerCase() === 'dynasty_idp';
  if (isIdpRequested && sport !== 'NFL') {
    return NextResponse.json(
      { error: 'IDP leagues are only supported for NFL. Please select NFL as the sport.' },
      { status: 400 }
    );
  }
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
  if (isDevyRequested) {
    const devySport = (sportInput ?? 'NFL').toString().toUpperCase();
    if (devySport !== 'NFL' && devySport !== 'NBA') {
      return NextResponse.json(
        { error: 'Devy leagues are only supported for NFL and NBA. Please select NFL or NBA as the sport.' },
        { status: 400 }
      );
    }
  }
  if (isC2CRequested) {
    const c2cSport = (sportInput ?? 'NFL').toString().toUpperCase();
    if (c2cSport !== 'NFL' && c2cSport !== 'NBA') {
      return NextResponse.json(
        { error: 'C2C (Campus to Canton) leagues are only supported for NFL and NBA. Please select NFL or NBA as the sport.' },
        { status: 400 }
      );
    }
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
        : String(leagueTypeWizard ?? leagueVariantInput ?? '').toLowerCase() === 'c2c' || String(leagueVariantInput ?? '').toLowerCase() === 'merged_devy_c2c'
          ? 'merged_devy_c2c'
          : (leagueVariantInput ?? undefined);
    const effectiveDynastyForCreation = isDevyRequested || isC2CRequested || (isDynasty === true);
    const initialSettings = getInitialSettingsForCreation(sport as string, presetVariant, {
      superflex: isSuperflex ?? false,
      roster_mode: effectiveDynastyForCreation ? 'dynasty' : (isDynasty ? 'dynasty' : undefined),
    }) as Record<string, unknown>;
    if (presetVariant === 'devy_dynasty' || presetVariant === 'merged_devy_c2c') {
      (initialSettings as Record<string, unknown>).roster_mode = 'dynasty';
    }
    if (presetVariant === 'devy_dynasty') {
      let dc = initialSettings.devyConfig as Record<string, unknown> | undefined;
      if (dc == null || typeof dc !== 'object') dc = {};
      if (!Array.isArray(dc.devyRounds) || (dc.devyRounds as unknown[]).length === 0) {
        dc.devyRounds = [1, 2, 3, 4];
      }
      initialSettings.devyConfig = dc;
    }
    if (presetVariant === 'merged_devy_c2c') {
      let cc = initialSettings.c2cConfig as Record<string, unknown> | undefined;
      if (cc == null || typeof cc !== 'object') cc = {};
      if (!Array.isArray(cc.collegeRounds) || (cc.collegeRounds as unknown[]).length === 0) {
        cc.collegeRounds = [1, 2, 3, 4, 5, 6];
      }
      initialSettings.c2cConfig = cc;
      let dc = initialSettings.devyConfig as Record<string, unknown> | undefined;
      if (dc == null || typeof dc !== 'object') dc = {};
      if (!Array.isArray(dc.devyRounds) || (dc.devyRounds as unknown[]).length === 0) {
        dc.devyRounds = [1, 2, 3, 4];
      }
      initialSettings.devyConfig = dc;
    }
    if (leagueTypeWizard) initialSettings.league_type = leagueTypeWizard;
    if (draftTypeWizard) initialSettings.draft_type = draftTypeWizard;
    // Best ball: set flag so feature-flag validation and downstream logic see best ball mode
    if (String(leagueTypeWizard ?? '').toLowerCase() === 'best_ball') {
      (initialSettings as Record<string, unknown>).best_ball = true;
    }
    // Standard redraft: ensure no dynasty-only settings leak in (defense in depth with validation)
    if (String(leagueTypeWizard ?? '').toLowerCase() === 'redraft') {
      initialSettings.roster_mode = 'redraft';
      initialSettings.taxi_slots = 0;
      initialSettings.taxi = false;
      if (initialSettings.devyConfig && typeof initialSettings.devyConfig === 'object') {
        (initialSettings.devyConfig as Record<string, unknown>).enabled = false;
      }
      if (initialSettings.c2cConfig && typeof initialSettings.c2cConfig === 'object') {
        (initialSettings.c2cConfig as Record<string, unknown>).enabled = false;
      }
    }
    if (settingsWizard && typeof settingsWizard === 'object') {
      Object.assign(initialSettings, settingsWizard);
    }
    const generatedInviteCode = (await import('crypto')).randomBytes(6).toString('base64url').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8);
    const resolvedInviteCode =
      typeof initialSettings.inviteCode === 'string' && initialSettings.inviteCode.trim()
        ? initialSettings.inviteCode.trim()
        : generatedInviteCode;
    initialSettings.inviteCode = resolvedInviteCode;
    if (!initialSettings.inviteLink) {
      initialSettings.inviteLink = buildLeagueInviteUrl(resolvedInviteCode, { params: { utm_campaign: 'league_invite' } });
    }
    const isGuillotineEarly =
      String(leagueVariantInput ?? '').toLowerCase() === 'guillotine' ||
      String(leagueTypeWizard ?? '').toLowerCase() === 'guillotine';
    if (isGuillotineEarly) {
      const { validateGuillotineCreation, normalizeGuillotineRosterMode } = await import('@/lib/guillotine/GuillotineValidation');
      const teamCountFromSettings = typeof initialSettings.teamCount === 'number' ? initialSettings.teamCount : typeof initialSettings.leagueSize === 'number' ? initialSettings.leagueSize : undefined;
      if (teamCountFromSettings != null) leagueSize = teamCountFromSettings;
      const rosterMode = String(initialSettings.roster_mode ?? initialSettings.mode ?? 'redraft').toLowerCase().trim();
      const draftType = (initialSettings.draft_type ?? draftTypeWizard) as string | undefined;
      const result = await validateGuillotineCreation({ sport, teamCount: leagueSize, rosterMode, draftType });
      if (!result.valid) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      const normalizedRosterMode = normalizeGuillotineRosterMode(rosterMode);
      (initialSettings as Record<string, unknown>).roster_mode = normalizedRosterMode;
      if (normalizedRosterMode === 'best_ball') (initialSettings as Record<string, unknown>).best_ball = true;
    }
    const { validateLeagueSettings } = await import('@/lib/league-settings-validation');
    const validation = validateLeagueSettings(initialSettings);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.errors[0] ?? 'Invalid league configuration', errors: validation.errors },
        { status: 400 }
      );
    }
    const { validateLeagueFeatureFlags } = await import('@/lib/sport-defaults/SportFeatureFlagsService');
    const requestedFlags: Partial<Record<string, boolean>> = {
      supportsSuperflex: initialSettings.superflex === true,
      supportsBestBall: initialSettings.best_ball === true,
      supportsTePremium: initialSettings.te_premium === true,
      supportsKickers: initialSettings.use_kickers === true,
      supportsTeamDefense: initialSettings.use_team_defense === true,
      supportsIdp: isIdpRequested,
      supportsDevy: (initialSettings.devy === true || String(leagueTypeWizard ?? leagueVariantInput ?? '').toLowerCase() === 'devy' || String(leagueVariantInput ?? '').toLowerCase() === 'devy_dynasty'),
      supportsTaxi: (initialSettings.taxi_slots as number) > 0 || initialSettings.taxi === true,
      supportsIr: (initialSettings.ir_slots as number) > 0 || initialSettings.ir === true,
      supportsBracketMode: initialSettings.bracket_mode === true,
      supportsDailyLineups: initialSettings.daily_lineups === true || initialSettings.lineup_lock === 'daily',
    };
    const flagValidation = await validateLeagueFeatureFlags(sport, requestedFlags as any);
    if (!flagValidation.valid && flagValidation.disallowed?.length) {
      return NextResponse.json(
        {
          error: `Sport ${sport} does not support: ${flagValidation.disallowed.join(', ')}`,
          disallowedFlags: flagValidation.disallowed,
        },
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
    const isBigBrother =
      String(leagueVariantInput ?? '').toLowerCase() === 'big_brother' ||
      String(leagueTypeWizard ?? '').toLowerCase() === 'big_brother';
    const isZombie =
      String(leagueVariantInput ?? '').toLowerCase() === 'zombie' ||
      String(leagueTypeWizard ?? '').toLowerCase() === 'zombie';
    const effectiveDynasty = isGuillotine ? false : (isDevy || isC2C ? true : isDynasty);
    const resolvedVariant = isGuillotine ? 'guillotine' : isSalaryCap ? 'salary_cap' : isSurvivor ? 'survivor' : isC2C ? 'merged_devy_c2c' : isDevy ? 'devy_dynasty' : isBigBrother ? 'big_brother' : isZombie ? 'zombie' : isIdpRequested ? (effectiveDynasty ? 'DYNASTY_IDP' : 'IDP') : (leagueVariantInput ?? null);
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
        const { getOrCreateExileLeague } = await import('@/lib/survivor/SurvivorExileEngine');
        const mode = String(settingsWizard?.mode ?? initialSettings.mode ?? 'redraft').toLowerCase();
        await upsertSurvivorConfig(league.id, {
          mode: mode === 'bestball' ? 'bestball' : 'redraft',
          ...(typeof (settingsWizard ?? {}) === 'object' && (settingsWizard as Record<string, unknown>)?.tribeCount != null && { tribeCount: Number((settingsWizard as Record<string, unknown>).tribeCount) }),
          ...(typeof (settingsWizard ?? {}) === 'object' && (settingsWizard as Record<string, unknown>)?.tribeSize != null && { tribeSize: Number((settingsWizard as Record<string, unknown>).tribeSize) }),
        });
        await getOrCreateExileLeague(league.id).catch((err) => {
          console.warn('[league/create] Survivor exile bootstrap non-fatal:', err);
        });
      } catch (err) {
        console.warn('[league/create] Survivor config bootstrap non-fatal:', err);
      }
    }

    if (isZombie) {
      try {
        const { upsertZombieLeagueConfig } = await import('@/lib/zombie/ZombieLeagueConfig');
        await upsertZombieLeagueConfig(league.id, {});
      } catch (err) {
        console.warn('[league/create] Zombie config bootstrap non-fatal:', err);
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

    if (isBigBrother) {
      try {
        const { upsertBigBrotherConfig } = await import('@/lib/big-brother/BigBrotherLeagueConfig');
        await upsertBigBrotherConfig(league.id, {});
      } catch (err) {
        console.warn('[league/create] Big Brother config bootstrap non-fatal:', err);
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

    if (effectiveDynasty) {
      try {
        const { upsertDynastyConfig } = await import('@/lib/dynasty-core/DynastySettingsService');
        await upsertDynastyConfig(league.id, {});
      } catch (err) {
        console.warn('[league/create] Dynasty config bootstrap non-fatal:', err);
      }
    }

    if (isIdpRequested) {
      try {
        const { upsertIdpLeagueConfig } = await import('@/lib/idp');
        const s = settingsWizard as Record<string, unknown> | undefined;
        await upsertIdpLeagueConfig(league.id, {
          positionMode: typeof s?.idp_position_mode === 'string' ? s.idp_position_mode : undefined,
          rosterPreset: typeof s?.idp_roster_preset === 'string' ? s.idp_roster_preset : undefined,
          scoringPreset: typeof s?.idp_scoring_preset === 'string' ? s.idp_scoring_preset : undefined,
          draftType: typeof draftTypeWizard === 'string' ? draftTypeWizard : undefined,
        });
      } catch (err) {
        console.warn('[league/create] IDP config bootstrap non-fatal:', err);
      }
    }

    return NextResponse.json({ league: { id: league.id, name: league.name, sport: league.sport } });
  } catch (err) {
    console.error('[league/create] Error:', err);
    return NextResponse.json({ error: 'Failed to create league' }, { status: 500 });
  }
}
