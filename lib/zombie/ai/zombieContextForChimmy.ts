/**
 * Build Zombie league context for Chimmy when user is in a Zombie league.
 * Deterministic data only. Chimmy never decides infection, serum/weapon/ambush usage,
 * promotion/relegation, or trade legality. Only explains and recommends tools.
 */

import { isZombieLeague } from '@/lib/zombie/ZombieLeagueConfig'
import { buildZombieAIContext } from '@/lib/zombie/ai/ZombieAIContext'

export async function buildZombieContextForChimmy(
  leagueId: string,
  userId: string
): Promise<string> {
  const isZombie = await isZombieLeague(leagueId)
  if (!isZombie) return ''

  const week = 1
  const ctx = await buildZombieAIContext({ leagueId, week, userId })
  if (!ctx) return ''

  const myStatus = ctx.myRosterId
    ? ctx.statuses.find((s) => s.rosterId === ctx.myRosterId)?.status ?? 'unknown'
    : 'none'
  const parts: string[] = [
    '[ZOMBIE LEAGUE CONTEXT - for explanation only; you never decide infection, serum/weapon/ambush usage, eligibility, or lineup legality]',
    `League ${leagueId}. Sport: ${ctx.sport}. Week: ${ctx.week} (context snapshot; current week may vary).`,
    `User's roster: ${ctx.myRosterId ?? 'N/A'}. User's role: ${myStatus}. Serums: ${ctx.myResources.serums}, Weapons: ${ctx.myResources.weapons}, Ambush uses this week: ${ctx.myResources.ambush}.`,
    `Survivors: ${ctx.survivors.length}. Zombies: ${ctx.zombies.length}. Whisperer roster: ${ctx.whispererRosterId ?? 'N/A'}. Config: serum revives ${ctx.config.serumReviveCount}, zombie trades blocked: ${ctx.config.zombieTradeBlocked}.`,
  ]
  parts.push(
    'When the user asks about using serum, weapon, or ambush: explain how they work and recommend the official Zombie tools (Resources panel, league Zombie AI, commissioner for usage). Do not execute or authorize usage. When they ask am I human/zombie/whisperer or what actions are available: use this context. Private actions (e.g. using a serum) must be done through the designated flow, not decided by Chimmy.'
  )
  return parts.join(' ')
}
