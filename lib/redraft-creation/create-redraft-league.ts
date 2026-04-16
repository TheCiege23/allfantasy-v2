/**
 * Single-transaction redraft league creation (League + settings + commissioner + draft + homepage + slots + draft session).
 */

import { randomUUID } from 'crypto'
import type { LeagueSport, Prisma, SoccerPipelineVariant } from '@prisma/client'
import { buildInitialLeagueSettings } from '@/lib/sport-defaults/LeagueDefaultSettingsService'
import { getDraftDefaults, getWaiverDefaults } from '@/lib/sport-defaults/SportDefaultsRegistry'
import { toSportType } from '@/lib/sport-defaults/sport-type-utils'
import type { SportType } from '@/lib/sport-defaults/types'
import { getRedraftSportIntegration } from '@/lib/redraft-creation/sport-config'
import type { SoccerPipeline } from '@/lib/redraft-creation/sport-config'
import type { RedraftCreateBody } from '@/lib/redraft-creation/validate'
import { buildPostCreateLeagueHomeHref } from '@/lib/league/post-create-navigation'

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
      // Fallback: if joinCode column doesn't exist in DB yet, generate without clash check
      console.warn('[uniqueJoinCode] joinCode column query failed, using unchecked code:', (e as Error).message?.slice(0, 100))
      return code
    }
  }
  throw new Error('Unable to generate join code')
}

function resolveCoreDraftSessionType(d: RedraftCreateBody['draftType']): 'snake' | 'linear' | 'auction' {
  if (d === 'linear') return 'linear'
  if (d === 'auction') return 'auction'
  return 'snake'
}

export function soccerPipelineToPrismaVariant(
  sport: LeagueSport,
  pipeline: SoccerPipeline | null
): SoccerPipelineVariant | null {
  if (sport !== 'SOCCER' || !pipeline) return null
  return pipeline === 'mls' ? 'MLS' : 'EURO'
}

export type RedraftCreateTransactionResult = {
  leagueId: string
  homepageUrl: string
}

/** @param appUserId — Must be `AppUser.id` (app_users.id). Resolved in the API handler from the session. */
export async function createRedraftLeagueInTransaction(
  tx: Tx,
  appUserId: string,
  body: RedraftCreateBody,
  log?: (event: string, payload: Record<string, unknown>) => void
): Promise<RedraftCreateTransactionResult> {
  const sport = body.sport as LeagueSport
  const sportType = toSportType(sport) as SportType
  const draftDefaults = getDraftDefaults(sportType, undefined)
  const waiverDefaults = getWaiverDefaults(sportType, undefined)
  const soccerPipeline = (body.soccerPipeline ?? null) as SoccerPipeline | null
  const integration = getRedraftSportIntegration(sport, soccerPipeline)
  const soccerPrismaVariant = soccerPipelineToPrismaVariant(sport, soccerPipeline)

  const coreDraft = resolveCoreDraftSessionType(body.draftType)
  const timerSeconds = draftDefaults.timer_seconds_default ?? 90
  const pickTimerPreset = secondsToPickTimerPreset(timerSeconds)
  const isOffline = body.draftType === 'offline'
  const isAuto = body.draftType === 'auto'

  const initial = buildInitialLeagueSettings(sport, null)
  const mergedSettings: Record<string, unknown> = {
    ...initial,
    league_type: 'redraft',
    leagueType: 'redraft',
    sport_type: sport,
    trade_review_mode: body.tradeReviewMode,
    requested_draft_type: body.draftType,
    redraft_draft_mode: body.draftType,
    language: body.language,
    default_team_count: body.teamCount,
    soccer_pipeline: sport === 'SOCCER' ? soccerPipeline : undefined,
    redraft_creation_source: 'api_v1_redraft',
    constitution_request: {
      requestedAt: new Date().toISOString(),
      notes: '',
    },
  }

  log?.('transaction_start', { appUserId, sport })

  const joinCode = await uniqueJoinCode(tx)
  const platformLeagueId = `manual-${randomUUID()}`

  log?.('pre_prisma_league_create', {
    userIdForLeague: appUserId,
    sport,
    teamCount: body.teamCount,
    draftType: body.draftType,
  })

  const league = await tx.league.create({
    data: {
      userId: appUserId,
      isCommissioner: true,
      name: body.name.trim(),
      platform: 'manual',
      platformLeagueId,
      leagueSize: body.teamCount,
      sport,
      leagueType: 'redraft',
      leagueVariant: null,
      isDynasty: false,
      timezone: body.timezone,
      language: body.language,
      joinCode,
      status: 'active',
      settings: mergedSettings as Prisma.InputJsonValue,
      syncStatus: 'manual',
      scoring: null,
      rosterSize: null,
    },
  })

  await tx.leagueSettings.create({
    data: {
      leagueId: league.id,
      timezone: body.timezone,
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

  const scoringTemplateId =
    sport === 'NFL'
      ? 'default-NFL-PPR'
      : sport === 'SOCCER'
        ? 'default-SOCCER-standard'
        : `${sport}-default`

  await tx.redraftLeagueExtendedSettings.create({
    data: {
      leagueId: league.id,
      commissionerTradeReviewType: body.tradeReviewMode,
      languageCode: body.language,
      scoringTypeDefault: scoringTemplateId,
      waiverTypeDefault: waiverDefaults.waiver_type,
      rosterPresetKey: `default-${sport}-standard`,
      playoffPresetKey: 'default',
      draftTimerSecondsDefault: timerSeconds,
      isPublic: false,
      allowInviteLinks: true,
      settingsJson: { tradeReviewMode: body.tradeReviewMode },
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
      auctionBudget: body.draftType === 'auction' ? 200 : null,
      draftStatus: isOffline ? 'offline' : 'pre_draft',
      configJson: {
        coreDraftSessionType: coreDraft,
        redraftWizard: true,
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
      homepageConfigJson: { createdVia: 'redraft_v1' },
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
      integrationConfigJson: { source: 'redraft_v1', soccerPipeline: soccerPipeline ?? undefined },
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
      teamName: `${body.name.trim()} — Commissioner`,
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

  const auctionBudget = body.draftType === 'auction' ? 200 : null
  await tx.draftSession.create({
    data: {
      leagueId: league.id,
      status: isOffline ? 'pre_draft' : 'pre_draft',
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

  const homepageUrl = buildPostCreateLeagueHomeHref({
    leagueId: league.id,
    leagueType: 'redraft',
    allowInviteLink: true,
  })
  log?.('transaction_success', { leagueId: league.id })

  return { leagueId: league.id, homepageUrl }
}
