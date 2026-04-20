/**
 * Single-transaction canonical league creation (concept-first preset pipeline).
 * Mirrors redraft shell: League + settings + commissioner + draft + homepage + slots + draft session.
 */

import { randomUUID } from 'crypto'
import type { LeagueFormatId } from '@/lib/league/format-engine'
import type { LeagueSport, Prisma } from '@prisma/client'
import { SETTINGS_SNAPSHOT_VERSION } from '@/lib/league-contract/types'
import { buildPostCreateLeagueHomeHref } from '@/lib/league/post-create-navigation'
import { getRedraftSportIntegration } from '@/lib/redraft-creation/sport-config'
import type { SoccerPipeline } from '@/lib/redraft-creation/sport-config'
import { soccerPipelineToPrismaVariant } from '@/lib/redraft-creation/create-redraft-league'
import type { PresetEngineOutput } from '@/lib/league-creation/canonical/types'
import type { ValidatedCreateLeagueBody } from '@/lib/league-creation/canonical/validateCreateLeague'
import { mapCanonicalDraftTypeToEngineCore } from '@/lib/draft-types/draftTypeRegistry'

type Tx = Prisma.TransactionClient

function secondsToPickTimerPreset(sec: number): string {
  const presets: [string, number][] = [
    ['30s', 30],
    ['60s', 60],
    ['90s', 90],
    ['120s', 120],
    ['300s', 300],
    ['600s', 600],
  ]
  let best = '120s'
  let bestDiff = Infinity
  for (const [k, v] of presets) {
    const d = Math.abs(v - sec)
    if (d < bestDiff) {
      bestDiff = d
      best = k
    }
  }
  return best
}

async function uniqueJoinCode(tx: Tx): Promise<string> {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  for (let attempt = 0; attempt < 12; attempt++) {
    let code = ''
    for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)]
    try {
      const clash = await tx.league.findFirst({ where: { joinCode: code }, select: { id: true } })
      if (!clash) return code
    } catch (e) {
      console.warn('[uniqueJoinCode:canonical] joinCode query failed:', (e as Error).message?.slice(0, 100))
      return code
    }
  }
  throw new Error('Unable to generate join code')
}

function leagueModeColumns(formatId: LeagueFormatId): Partial<Prisma.LeagueUncheckedCreateInput> {
  return {
    isDynasty: formatId === 'dynasty' || formatId === 'devy' || formatId === 'c2c',
    bestBallMode: formatId === 'best_ball',
    guillotineMode: formatId === 'guillotine',
    survivorMode: formatId === 'survivor',
  }
}

export type CanonicalCreateTransactionResult = {
  leagueId: string
  homepageUrl: string
}

export async function createCanonicalLeagueInTransaction(
  tx: Tx,
  appUserId: string,
  body: ValidatedCreateLeagueBody,
  engine: PresetEngineOutput,
  log?: (event: string, payload: Record<string, unknown>) => void
): Promise<CanonicalCreateTransactionResult> {
  const sport = body.sport as LeagueSport
  const soccerPipeline = (body.soccerPipeline ?? null) as SoccerPipeline | null
  const integration = getRedraftSportIntegration(sport, soccerPipeline)
  const soccerPrismaVariant = soccerPipelineToPrismaVariant(sport, soccerPipeline)

  const resolution = engine.formatResolution
  const formatId = engine.leagueFormatId as LeagueFormatId
  const draftDefaults = resolution.draftDefaults
  const waiverDefaults = resolution.waiverDefaults as {
    waiver_type: string
    processing_days?: number[]
    processing_time_utc?: string | null
    max_claims_per_period?: number | null
    FAAB_budget_default?: number | null
    claim_priority_behavior?: string
    game_lock_behavior?: string
    free_agent_unlock_behavior?: string
  }

  const coreDraft = mapCanonicalDraftTypeToEngineCore(body.draftType)
  const timerSeconds = draftDefaults.timer_seconds_default ?? 90
  const pickTimerPreset = secondsToPickTimerPreset(timerSeconds)
  const isOffline = body.draftType.toLowerCase() === 'offline'
  const isAuto = body.draftType.toLowerCase() === 'auto'

  const tradeReview =
    body.tradeReviewMode === 'none' || body.tradeReviewMode == null
      ? 'commissioner'
      : body.tradeReviewMode

  const mergedSettings: Record<string, unknown> = {
    ...engine.settingsSnapshot,
    league_type: formatId,
    leagueType: formatId,
    sport_type: sport,
    trade_review_mode: tradeReview,
    requested_draft_type: body.draftType,
    canonical_draft_mode: body.draftType,
    language: body.language ?? 'en',
    default_team_count: body.teamCount,
    soccer_pipeline: sport === 'SOCCER' ? soccerPipeline : undefined,
    canonical_creation_source: 'post_api_leagues_v1',
    constitution_request: {
      requestedAt: new Date().toISOString(),
      notes: '',
    },
  }

  log?.('canonical_transaction_start', { appUserId, sport, formatId })

  const joinCode = await uniqueJoinCode(tx)
  const platformLeagueId = `manual-${randomUUID()}`

  const league = await tx.league.create({
    data: {
      userId: appUserId,
      isCommissioner: true,
      name: body.leagueName.trim(),
      platform: 'manual',
      platformLeagueId,
      leagueSize: body.teamCount,
      sport,
      leagueType: formatId,
      leagueVariant: resolution.modifiers.includes('idp') && sport === 'NFL' ? 'idp' : null,
      timezone: body.timezone ?? 'America/New_York',
      language: body.language ?? 'en',
      joinCode,
      status: 'setup',
      lifecycleState: 'setup',
      settings: mergedSettings as Prisma.InputJsonValue,
      syncStatus: 'manual',
      scoring: null,
      rosterSize: null,
      presetKey: engine.presetKey,
      scoringPresetId: body.scoringPreset,
      settingsSnapshotVersion: SETTINGS_SNAPSHOT_VERSION,
      ...leagueModeColumns(formatId),
    },
  })

  await tx.leagueSettings.create({
    data: {
      leagueId: league.id,
      timezone: body.timezone ?? 'America/New_York',
      draftType: coreDraft,
      rounds: draftDefaults.rounds_default,
      pickTimerPreset,
      pickTimerCustomValue: null,
      cpuAutoPick: true,
      aiAutoPick: isAuto,
      draftOrderMethod: 'manual',
    },
  })

  await tx.leagueWaiverSettings.create({
    data: {
      leagueId: league.id,
      waiverType: waiverDefaults.waiver_type,
      processingDayOfWeek: waiverDefaults.processing_days?.[0] ?? null,
      processingTimeUtc: waiverDefaults.processing_time_utc ?? null,
      claimLimitPerPeriod: waiverDefaults.max_claims_per_period ?? null,
      faabBudget: waiverDefaults.FAAB_budget_default ?? null,
      tiebreakRule: (waiverDefaults.claim_priority_behavior as string) ?? null,
      lockType: (waiverDefaults.game_lock_behavior as string) ?? null,
      instantFaAfterClear: waiverDefaults.free_agent_unlock_behavior === 'instant',
    },
  })

  await tx.redraftLeagueExtendedSettings.create({
    data: {
      leagueId: league.id,
      commissionerTradeReviewType: tradeReview,
      languageCode: body.language ?? 'en',
      scoringTypeDefault: body.scoringPreset,
      waiverTypeDefault: waiverDefaults.waiver_type,
      rosterPresetKey: `default-${sport}-${formatId}`,
      playoffPresetKey: 'default',
      draftTimerSecondsDefault: timerSeconds,
      isPublic: false,
      allowInviteLinks: true,
      settingsJson: {
        tradeReviewMode: tradeReview,
        canonicalFormatId: formatId,
      },
    },
  })

  await tx.redraftLeagueDraftProfile.create({
    data: {
      leagueId: league.id,
      draftType: body.draftType,
      isOffline,
      isAuto,
      rounds: draftDefaults.rounds_default,
      timerSeconds,
      orderMode: coreDraft,
      auctionBudget: body.draftType.toLowerCase().includes('auction') ? 200 : null,
      draftStatus: isOffline ? 'offline' : 'pre_draft',
      configJson: {
        coreDraftSessionType: coreDraft,
        canonicalCreate: true,
        presetKey: engine.presetKey,
      },
    },
  })

  await tx.redraftLeagueHomepageState.create({
    data: {
      leagueId: league.id,
      activeTab: 'overview',
      onboardingComplete: false,
      chatEnabled: true,
      draftRoomEnabled: !isOffline,
      paymentEnabled: false,
      homepageConfigJson: { createdVia: 'canonical_v1' },
    },
  })

  await tx.redraftLeagueSportIntegration.create({
    data: {
      leagueId: league.id,
      sport,
      soccerPipelineVariant: soccerPrismaVariant,
      standingsEnabled: integration.standingsEnabled,
      schedulesEnabled: integration.schedulesEnabled,
      injuriesEnabled: integration.injuriesEnabled,
      newsEnabled: integration.newsEnabled,
      weatherEnabled: integration.weatherEnabled,
      playerPoolSource: integration.playerPoolSource,
      gameFeedSource: integration.gameFeedSource,
      integrationConfigJson: { source: 'canonical_v1', soccerPipeline: soccerPipeline ?? undefined },
    },
  })

  await tx.redraftLeagueChatRoom.create({
    data: {
      leagueId: league.id,
      roomType: 'league',
      title: 'League chat',
    },
  })

  const roster = await tx.roster.create({
    data: {
      leagueId: league.id,
      platformUserId: appUserId,
      playerData: { draftPicks: [] },
    },
  })

  await tx.leagueTeam.create({
    data: {
      leagueId: league.id,
      externalId: roster.id,
      ownerName: 'Commissioner',
      teamName: `${body.leagueName.trim()} — Commissioner`,
      claimedByUserId: appUserId,
      platformUserId: appUserId,
      isCommissioner: true,
      role: 'commissioner',
    },
  })

  await tx.redraftLeagueMember.create({
    data: {
      leagueId: league.id,
      userId: appUserId,
      role: 'COMMISSIONER',
      teamNumber: 1,
    },
  })

  const slotData: Prisma.LeagueEntrySlotCreateManyInput[] = []
  for (let slot = 1; slot <= body.teamCount; slot++) {
    slotData.push({
      id: randomUUID(),
      leagueId: league.id,
      slotNumber: slot,
      status: 'OPEN',
      rosterId: null,
    })
  }
  await tx.leagueEntrySlot.createMany({ data: slotData })

  const auctionBudget = body.draftType.toLowerCase().includes('auction') ? 200 : null
  await tx.draftSession.create({
    data: {
      leagueId: league.id,
      status: 'pre_draft',
      draftType: coreDraft,
      rounds: draftDefaults.rounds_default,
      teamCount: body.teamCount,
      timerSeconds,
      slotOrder: [],
      auctionBudgetPerTeam: auctionBudget,
      sportType: sport,
      sessionKind: 'live',
      cpuAutoPick: true,
      aiAutoPick: isAuto,
    },
  })

  const zombieTier =
    formatId === 'zombie' && body.conceptSetup && typeof body.conceptSetup === 'object'
      ? (body.conceptSetup.universe === 'MULTI_TIER' ? 'beta_trio' : 'single_gamma')
      : null

  const homepageUrl = buildPostCreateLeagueHomeHref({
    leagueId: league.id,
    leagueType: formatId,
    allowInviteLink: true,
    zombieUniverseTier: zombieTier,
  })

  log?.('canonical_transaction_success', { leagueId: league.id })

  return { leagueId: league.id, homepageUrl }
}
