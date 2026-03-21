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
  rosterSize: z.number().min(1).max(64).optional(),
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
    rosterSize: rosterSizeInput,
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
  let rosterSize = rosterSizeInput;
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
      const { runImportedLeagueNormalizationPipeline } = await import('@/lib/league-import/ImportedLeagueNormalizationPipeline');
      const result = await runImportedLeagueNormalizationPipeline({
        provider: 'sleeper',
        sourceId: cleanSleeperId,
        userId: verifiedAuth.userId,
      });
      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          {
            status:
              result.code === 'LEAGUE_NOT_FOUND'
                ? 404
                : result.code === 'UNAUTHORIZED'
                  ? 401
                  : result.code === 'CONNECTION_REQUIRED'
                    ? 400
                    : 500,
          }
        );
      }

      const {
        ImportedLeagueConflictError,
        persistImportedLeagueFromNormalization,
      } = await import('@/lib/league-import/ImportedLeagueCommitService');
      let persisted:
        | {
            league: { id: string; name: string; sport: string };
            historicalBackfill: unknown;
          }
        | null = null;
      try {
        persisted = await persistImportedLeagueFromNormalization({
          userId: verifiedAuth.userId,
          provider: 'sleeper',
          normalized: result.normalized,
          allowUpdateExisting: false,
        });
      } catch (error) {
        if (error instanceof ImportedLeagueConflictError) {
          return NextResponse.json({ error: error.message }, { status: 409 });
        }
        throw error;
      }

      return NextResponse.json({
        league: persisted.league,
        historicalBackfill: persisted.historicalBackfill,
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

    const { getCreationPayloadAndSettings } = await import('@/lib/league-defaults-orchestrator/LeagueDefaultsOrchestrator');
    const presetVariant =
      String(leagueTypeWizard ?? leagueVariantInput ?? '').toLowerCase() === 'devy'
        ? 'devy_dynasty'
        : String(leagueTypeWizard ?? leagueVariantInput ?? '').toLowerCase() === 'c2c' || String(leagueVariantInput ?? '').toLowerCase() === 'merged_devy_c2c'
          ? 'merged_devy_c2c'
          : (leagueVariantInput ?? undefined);
    const effectiveDynastyForCreation = isDevyRequested || isC2CRequested || (isDynasty === true);
    const {
      payload: creationPayload,
      initialSettings: initialSettingsFromOrchestrator,
    } = await getCreationPayloadAndSettings(
      sport as string,
      presetVariant,
      {
        superflex: isSuperflex ?? false,
        roster_mode: effectiveDynastyForCreation ? 'dynasty' : (isDynasty ? 'dynasty' : undefined),
      }
    );
    const initialSettings = {
      ...(initialSettingsFromOrchestrator as Record<string, unknown>),
    } as Record<string, unknown>;
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
    if (rosterSize != null && initialSettings.roster_size == null) initialSettings.roster_size = rosterSize;
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

    // Ensure sport/variant defaults from orchestrator payload are always present unless explicitly overridden.
    {
      const draftDefaults = creationPayload.draft;
      const waiverDefaults = creationPayload.waiver;

      if (initialSettings.draft_type == null) initialSettings.draft_type = draftDefaults.draft_type;
      if (initialSettings.draft_rounds == null) initialSettings.draft_rounds = draftDefaults.rounds_default;
      if (initialSettings.draft_timer_seconds == null) initialSettings.draft_timer_seconds = draftDefaults.timer_seconds_default;
      if (initialSettings.draft_pick_order_rules == null) initialSettings.draft_pick_order_rules = draftDefaults.pick_order_rules;
      if (initialSettings.draft_third_round_reversal == null) initialSettings.draft_third_round_reversal = draftDefaults.third_round_reversal ?? false;

      if (initialSettings.waiver_type == null) initialSettings.waiver_type = waiverDefaults.waiver_type;
      if (initialSettings.waiver_processing_days == null) initialSettings.waiver_processing_days = waiverDefaults.processing_days;
      if (initialSettings.faab_budget == null && waiverDefaults.FAAB_budget_default != null) {
        initialSettings.faab_budget = waiverDefaults.FAAB_budget_default;
      }
      if (initialSettings.waiver_processing_time_utc == null && waiverDefaults.processing_time_utc != null) {
        initialSettings.waiver_processing_time_utc = waiverDefaults.processing_time_utc;
      }
      if (initialSettings.waiver_claim_priority_behavior == null && waiverDefaults.claim_priority_behavior != null) {
        initialSettings.waiver_claim_priority_behavior = waiverDefaults.claim_priority_behavior;
      }
      if (initialSettings.waiver_game_lock_behavior == null && waiverDefaults.game_lock_behavior != null) {
        initialSettings.waiver_game_lock_behavior = waiverDefaults.game_lock_behavior;
      }
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
        rosterSize: typeof rosterSize === 'number' ? rosterSize : undefined,
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

    // Persist league-creation waiver choices after bootstrap so commissioner defaults match wizard selections.
    try {
      const { upsertLeagueWaiverSettings } = await import('@/lib/waiver-wire');
      const waiverProcessingDaysRaw = initialSettings.waiver_processing_days;
      const waiverProcessingDays = Array.isArray(waiverProcessingDaysRaw)
        ? waiverProcessingDaysRaw
            .map((d) => (typeof d === 'number' ? d : Number(d)))
            .filter((d) => Number.isFinite(d))
        : [];
      await upsertLeagueWaiverSettings(league.id, {
        waiverType:
          typeof initialSettings.waiver_type === 'string'
            ? initialSettings.waiver_type
            : undefined,
        processingDayOfWeek: waiverProcessingDays.length > 0 ? waiverProcessingDays[0] : undefined,
        processingTimeUtc:
          typeof initialSettings.waiver_processing_time_utc === 'string'
            ? initialSettings.waiver_processing_time_utc
            : undefined,
        claimLimitPerPeriod:
          typeof initialSettings.waiver_max_claims_per_period === 'number'
            ? initialSettings.waiver_max_claims_per_period
            : initialSettings.waiver_max_claims_per_period === null
              ? null
              : undefined,
        faabBudget:
          typeof initialSettings.faab_budget === 'number'
            ? initialSettings.faab_budget
            : initialSettings.faab_budget === null
              ? null
              : undefined,
        tiebreakRule:
          typeof initialSettings.waiver_claim_priority_behavior === 'string'
            ? initialSettings.waiver_claim_priority_behavior
            : undefined,
        lockType:
          typeof initialSettings.waiver_game_lock_behavior === 'string'
            ? initialSettings.waiver_game_lock_behavior
            : undefined,
        instantFaAfterClear:
          typeof initialSettings.waiver_free_agent_unlock_behavior === 'string'
            ? initialSettings.waiver_free_agent_unlock_behavior.toLowerCase() === 'instant'
            : undefined,
      });
    } catch (err) {
      console.warn('[league/create] Waiver settings sync non-fatal:', err);
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
