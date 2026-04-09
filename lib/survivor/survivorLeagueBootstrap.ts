/**
 * Survivor League Bootstrap — runs after league creation to set up all required
 * infrastructure: game state, chat channels, player records, sport schedule.
 *
 * Fixes gaps: league chat, exile chat, jury chat placeholders, eager GameState,
 * SurvivorPlayer records for all rosters, sport-specific scheduling.
 */

import { prisma } from '@/lib/prisma'
import { getSportSchedule } from './sportScheduleEngine'
import { generateAndPinMainIslandFAQ, generateAndPinExileIslandFAQ } from './faqGenerator'

export interface SurvivorBootstrapResult {
  gameStateCreated: boolean
  chatChannelsCreated: string[]
  playerRecordsCreated: number
  scheduleConfigured: boolean
  warnings: string[]
}

/**
 * Run full bootstrap after a survivor league is created.
 * Call this AFTER upsertSurvivorConfig and league field updates.
 */
export async function runSurvivorLeagueBootstrap(
  leagueId: string,
): Promise<SurvivorBootstrapResult> {
  const warnings: string[] = []
  const chatChannelsCreated: string[] = []

  const league = await (prisma as any).league.findUnique({
    where: { id: leagueId },
    select: { sport: true, survivorPlayerCount: true, leagueSize: true },
  })
  if (!league) throw new Error('League not found')

  const sport = league.sport ?? 'NFL'
  const playerCount = league.survivorPlayerCount ?? league.leagueSize ?? 20

  // 1. Eager GameState creation
  let gameStateCreated = false
  const existingState = await (prisma as any).survivorGameState.findUnique({
    where: { leagueId },
  })
  if (!existingState) {
    await (prisma as any).survivorGameState.create({
      data: {
        leagueId,
        phase: 'pre_draft',
        currentWeek: 0,
        activeTribeCount: 0,
        activePlayerCount: playerCount,
        exilePlayerCount: 0,
        juryPlayerCount: 0,
      },
    })
    gameStateCreated = true
  }

  // 2. Create all required chat channels
  const channelTypes = [
    { channelType: 'league', name: 'Island Chat' },
    { channelType: 'exile', name: 'Exile Island' },
    { channelType: 'jury', name: 'Jury Room' },
    { channelType: 'finale', name: 'Finale Stage' },
  ]

  for (const ch of channelTypes) {
    const existing = await (prisma as any).survivorChatChannel.findFirst({
      where: { leagueId, channelType: ch.channelType },
    })
    if (!existing) {
      await (prisma as any).survivorChatChannel.create({
        data: {
          leagueId,
          name: ch.name,
          channelType: ch.channelType,
          memberUserIds: [],
        },
      })
      chatChannelsCreated.push(ch.channelType)
    }
  }

  // 3. Create SurvivorPlayer records for all existing rosters
  let playerRecordsCreated = 0
  const rosters = await (prisma as any).roster.findMany({
    where: { leagueId },
    select: { id: true, platformUserId: true },
  })

  for (const roster of rosters) {
    const existing = await (prisma as any).survivorPlayer.findFirst({
      where: { leagueId, userId: roster.platformUserId },
    })
    if (!existing) {
      await (prisma as any).survivorPlayer.create({
        data: {
          leagueId,
          userId: roster.platformUserId,
          displayName: roster.platformUserId,
          playerState: 'active',
          tokenBalance: 0,
          totalTokensEarned: 0,
          hasImmunityThisWeek: false,
          canAccessTribeChat: true,
          canAccessMergeChat: false,
          canAccessExileChat: false,
          canAccessJuryChat: false,
          canAccessFinaleChat: false,
          isJuryMember: false,
          isFinalist: false,
        },
      })
      playerRecordsCreated++
    }
  }

  // 4. Store sport-specific schedule config
  const schedule = getSportSchedule(sport)
  let scheduleConfigured = false
  try {
    const config = await (prisma as any).survivorLeagueConfig.findUnique({
      where: { leagueId },
    })
    if (config) {
      await (prisma as any).survivorLeagueConfig.update({
        where: { id: config.id },
        data: {
          voteDeadlineDayOfWeek: schedule.voteDeadlineDay,
          voteDeadlineTimeUtc: `${schedule.voteDeadlineHourUtc}:00`,
          tribalCouncilDayOfWeek: schedule.tribalCouncilDay,
          tribalCouncilTimeUtc: `${schedule.tribalCouncilHourUtc}:00`,
        },
      })
      scheduleConfigured = true
    }
  } catch {
    warnings.push('Failed to configure sport-specific schedule')
  }

  // 5. Create SurvivorPowerBalance tracker
  const existingBalance = await (prisma as any).survivorPowerBalance.findUnique({
    where: { leagueId },
  })
  if (!existingBalance) {
    await (prisma as any).survivorPowerBalance.create({
      data: {
        leagueId,
        activePowerCount: 0,
        immunityPowerCount: 0,
        voteControlCount: 0,
        scorePowerCount: 0,
        tribeControlCount: 0,
        infoPowerCount: 0,
        powersByPlayer: {},
      },
    }).catch(() => {})
  }

  // 6. Generate and pin FAQ documents in league + exile chat
  await generateAndPinMainIslandFAQ(leagueId).catch((err) => {
    warnings.push(`FAQ generation failed: ${err}`)
  })
  await generateAndPinExileIslandFAQ(leagueId).catch((err) => {
    warnings.push(`Exile FAQ generation failed: ${err}`)
  })

  return {
    gameStateCreated,
    chatChannelsCreated,
    playerRecordsCreated,
    scheduleConfigured,
    warnings,
  }
}
