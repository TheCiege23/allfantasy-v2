import { prisma } from '@/lib/prisma'
import { queueAnimation } from '@/lib/zombie/animationEngine'
import { notifyCommissioner } from '@/lib/zombie/commissionerNotificationService'

/**
 * Notify all relevant parties when a zombie status change occurs.
 * Handles: infection, revival, whisperer replacement, elimination.
 */
export async function notifyStatusChange(
  leagueId: string,
  week: number,
  event: {
    type: 'infection' | 'revival' | 'whisperer_replaced' | 'elimination' | 'serum_used' | 'bomb_detonated'
    victimUserId?: string
    actorUserId?: string
    victimName?: string
    actorName?: string
    margin?: number
    metadata?: Record<string, unknown>
  },
): Promise<void> {
  const z = await prisma.zombieLeague.findUnique({ where: { leagueId } })
  if (!z) return

  const { type, victimUserId, actorUserId, victimName, actorName, margin, metadata } = event
  const primaryUserId = victimUserId ?? actorUserId ?? leagueId

  // Queue animation
  const animMeta = {
    victimName,
    actorName,
    infectorName: actorName,
    margin,
    ...metadata,
  }

  switch (type) {
    case 'infection': {
      await queueAnimation(leagueId, week, 'zombie_turn', primaryUserId, animMeta, 'league_chat_and_home')
      const hordeSize = await prisma.zombieLeagueTeam.count({ where: { leagueId, status: 'Zombie' } })
      const survCount = await prisma.zombieLeagueTeam.count({
        where: { leagueId, status: { in: ['Survivor', 'Revived'] } },
      })

      // Horde milestone
      if (hordeSize > 0 && hordeSize % 3 === 0) {
        await queueAnimation(leagueId, week, 'horde_grows', primaryUserId, {
          hordeSize,
          survivorCount: survCount,
        })
      }

      // Last survivor alert
      if (survCount <= 3 && survCount > 0) {
        await queueAnimation(leagueId, week, 'last_survivor', primaryUserId, {
          survivorCount: survCount,
        })
      }

      // Chat system message
      await createChatSystemMessage(leagueId, `🧟 ${victimName ?? 'A survivor'} has been turned by ${actorName ?? 'the Horde'}.`)
      break
    }

    case 'revival': {
      await queueAnimation(leagueId, week, 'player_revived', primaryUserId, animMeta, 'league_chat_and_home')
      await createChatSystemMessage(leagueId, `⚡ ${victimName ?? 'A player'} has returned from the dead!`)
      break
    }

    case 'whisperer_replaced': {
      await queueAnimation(leagueId, week, 'whisperer_replaced', primaryUserId, animMeta, 'league_chat_and_home')
      await createChatSystemMessage(leagueId, '🎭 The old Whisperer has fallen. A new shadow rises.')
      await notifyCommissioner(leagueId, 'whisperer_change', 'Whisperer changed', 'The Whisperer role has been reassigned.', {
        week,
        relatedEventType: 'WhispererChange',
      })
      break
    }

    case 'serum_used': {
      await queueAnimation(leagueId, week, 'serum_used', primaryUserId, animMeta, 'league_chat_only')
      await createChatSystemMessage(leagueId, `🧪 A serum was used. ${victimName ?? 'Someone'} survives another week.`)
      break
    }

    case 'bomb_detonated': {
      await queueAnimation(leagueId, week, 'bomb_detonated', primaryUserId, {
        ...animMeta,
        displayLocation: 'fullscreen_overlay',
      }, 'league_chat_and_home', null, 6000)
      await createChatSystemMessage(leagueId, `💣 A bomb has detonated! ${actorName ?? 'Unknown'} triggered the explosion.`)
      await notifyCommissioner(leagueId, 'bomb_event', 'Bomb detonated', `A bomb was detonated in week ${week}.`, {
        week,
        relatedEventType: 'BombDetonation',
      })
      break
    }

    case 'elimination': {
      await queueAnimation(leagueId, week, 'zombie_turn', primaryUserId, animMeta, 'league_chat_and_home')
      await createChatSystemMessage(leagueId, `💀 ${victimName ?? 'A player'} has been eliminated from the league.`)
      break
    }
  }
}

/**
 * Post a system message to the league chat.
 */
async function createChatSystemMessage(leagueId: string, message: string): Promise<void> {
  const league = await prisma.league.findUnique({ where: { id: leagueId }, select: { userId: true } })
  if (!league?.userId) return

  await prisma.leagueChatMessage
    .create({
      data: {
        leagueId,
        userId: league.userId,
        message,
        type: 'system',
        metadata: {
          senderIsHost: true,
          contentType: 'zombie_system_event',
          isSystemMessage: true,
        },
      },
    })
    .catch(() => {})
}

/**
 * Batch notify for weekly resolution (multiple infections in one week).
 */
export async function notifyWeeklyResolution(
  leagueId: string,
  week: number,
  infections: Array<{ victimUserId: string; infectorUserId: string; victimName: string; infectorName: string; margin: number }>,
  revivals: Array<{ userId: string; displayName: string }>,
): Promise<void> {
  // Process infections
  for (const inf of infections) {
    await notifyStatusChange(leagueId, week, {
      type: 'infection',
      victimUserId: inf.victimUserId,
      actorUserId: inf.infectorUserId,
      victimName: inf.victimName,
      actorName: inf.infectorName,
      margin: inf.margin,
    })
  }

  // Process revivals
  for (const rev of revivals) {
    await notifyStatusChange(leagueId, week, {
      type: 'revival',
      victimUserId: rev.userId,
      victimName: rev.displayName,
    })
  }

  // Commissioner summary notification
  if (infections.length > 0 || revivals.length > 0) {
    const summary = []
    if (infections.length > 0) summary.push(`${infections.length} new infection${infections.length > 1 ? 's' : ''}`)
    if (revivals.length > 0) summary.push(`${revivals.length} revival${revivals.length > 1 ? 's' : ''}`)
    await notifyCommissioner(leagueId, 'weekly_resolution_complete', 'Week resolved', `Week ${week}: ${summary.join(', ')}.`, {
      week,
      relatedEventType: 'WeeklyResolution',
      requiresAction: false,
    })
  }
}
