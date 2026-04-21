import type { ZombieChimmyAction } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { processAmbushFromChimmy } from '@/lib/zombie/ambushEngine'
import { processSerumAction, processRevive } from '@/lib/zombie/serumEngine'
import { processWeaponAction, processBombAction } from '@/lib/zombie/weaponEngine'
import { activateWhispererPower } from '@/lib/zombie/whispererEngine'
import { getStatus } from '@/lib/zombie/ZombieOwnerStatusService'
import { getSerumBalance } from '@/lib/zombie/ZombieSerumEngine'
import { getWeaponBalance } from '@/lib/zombie/ZombieWeaponEngine'
import { getZombieLeagueConfig } from '@/lib/zombie/ZombieLeagueConfig'

export type ChimmyActionResult = {
  ok: boolean
  chimmyActionId?: string
  publicMessage?: string | null
  privateMessage?: string | null
  error?: string
}

export type ZombieChimmyIntent =
  | 'use_serum'
  | 'use_weapon'
  | 'declare_bomb'
  | 'trigger_ambush'
  | 'query_inventory'
  | 'query_role'
  | 'query_rules'
  | 'query_week_state'
  | 'activate_power'
  | 'unknown'

/** Enhanced intent detection for @Chimmy messages. */
export function detectZombieChimmyIntent(rawMessage: string): ZombieChimmyIntent {
  const lower = rawMessage.toLowerCase()
  if (!lower.includes('@chimmy')) return 'unknown'

  // Action intents (higher priority)
  if (lower.match(/ambush|trigger.*ambush/)) return 'trigger_ambush'
  if (lower.match(/serum.*revive|revive/)) return 'use_serum'
  if (lower.match(/use.*serum|serum.*use/)) return 'use_serum'
  if (lower.match(/bomb|dynamite|tnt|💣|detonate/)) return 'declare_bomb'
  if (lower.match(/use.*(axe|gun|knife|bow|🪓|🔫|🔪|🏹)/)) return 'use_weapon'
  if (lower.match(/activate.*(power|horde|whisper|infection|serum)/)) return 'activate_power'

  // Query intents
  if (lower.match(/inventory|items?|what.*have|show.*serums?|show.*weapons?|serum.*count|weapon.*count/))
    return 'query_inventory'
  if (lower.match(/role|status|am.*i|survivor|zombie|whisperer|my.*status/)) return 'query_role'
  if (lower.match(/rules?|how.*work|explain|help|what.*happen|infection.*rules/)) return 'query_rules'
  if (lower.match(/week|current.*week|update|standings|scores|matchup/)) return 'query_week_state'

  return 'unknown'
}

async function handleQueryInventory(leagueId: string, userId: string): Promise<string> {
  try {
    const roster = await prisma.roster.findFirst({
      where: { leagueId, platformUserId: userId },
    })
    if (!roster) return '⚠️ You are not on a roster in this league.'

    const serums = await getSerumBalance(leagueId, roster.id)
    const weapons = await prisma.zombieResourceLedger.findMany({
      where: { leagueId, rosterId: roster.id, resourceType: 'weapon' },
    })

    const weaponList = weapons.map((w) => `${w.resourceKey}: ${w.balance}`).join(', ')
    return `📦 **Inventory**: ${serums} serum(s), weapons: ${weaponList || 'none'}`
  } catch (e) {
    return `⚠️ Error fetching inventory: ${e instanceof Error ? e.message : String(e)}`
  }
}

async function handleQueryRole(leagueId: string, userId: string): Promise<string> {
  try {
    const roster = await prisma.roster.findFirst({
      where: { leagueId, platformUserId: userId },
    })
    if (!roster) return '⚠️ You are not on a roster in this league.'

    const status = await getStatus(leagueId, roster.id)
    const zombieLeague = await prisma.zombieLeague.findFirst({
      where: { leagueId },
      select: { id: true },
    })
    if (!zombieLeague) {
      return '⚠️ This is not a Zombie league.'
    }
    const whisperer = await prisma.whispererRecord.findFirst({
      where: { userId, zombieLeagueId: zombieLeague.id },
    })

    const icon = status === 'Whisperer' ? '🔴' : status === 'Zombie' ? '🟢' : '👤'
    const extra = whisperer ? ` (${whisperer.ambushesRemaining} ambushes left)` : ''
    return `${icon} **Your status**: ${status}${extra}`
  } catch (e) {
    return `⚠️ Error fetching role: ${e instanceof Error ? e.message : String(e)}`
  }
}

async function handleQueryRules(leagueId: string): Promise<string> {
  try {
    const config = await getZombieLeagueConfig(leagueId)
    if (!config)
      return '⚠️ Unable to load league rules. Contact your commissioner.'

    return `📋 **Rules Summary**: Infection threshold ${config.infectionLossToZombie ? 'on loss' : 'off'}, Serum revive cost: ${config.serumReviveCount}, Weapons: ${config.weaponTopTwoActive ? 'top 2 only' : 'all qualify'}`
  } catch (e) {
    return `⚠️ Error fetching rules: ${e instanceof Error ? e.message : String(e)}`
  }
}

async function handleQueryWeekState(leagueId: string, week: number): Promise<string> {
  try {
    const z = await prisma.zombieLeague.findFirst({
      where: { leagueId },
      select: { currentWeek: true, status: true },
    })
    if (!z) return '⚠️ League not found.'

    const infectionCount = await prisma.zombieLeagueTeam.count({
      where: { leagueId, status: 'Zombie' },
    })
    const survivorCount = await prisma.zombieLeagueTeam.count({
      where: { leagueId, status: 'Survivor' },
    })

    return `📊 **Week ${z.currentWeek}**: ${survivorCount} alive, ${infectionCount} infected, league status: ${z.status}`
  } catch (e) {
    return `⚠️ Error fetching week state: ${e instanceof Error ? e.message : String(e)}`
  }
}

export async function handleZombieChimmyAction(
  leagueId: string,
  userId: string,
  rawMessage: string,
  week: number,
): Promise<ChimmyActionResult> {
  const intent = detectZombieChimmyIntent(rawMessage)
  const lower = rawMessage.toLowerCase()

  try {
    // Query intents (no @prisma action creation)
    if (intent === 'query_inventory') {
      const msg = await handleQueryInventory(leagueId, userId)
      return { ok: true, privateMessage: msg }
    }
    if (intent === 'query_role') {
      const msg = await handleQueryRole(leagueId, userId)
      return { ok: true, privateMessage: msg }
    }
    if (intent === 'query_rules') {
      const msg = await handleQueryRules(leagueId)
      return { ok: true, privateMessage: msg }
    }
    if (intent === 'query_week_state') {
      const msg = await handleQueryWeekState(leagueId, week)
      return { ok: true, privateMessage: msg }
    }

    // Action intents (with audit)
    if (intent === 'trigger_ambush') {
      const row = (await processAmbushFromChimmy(leagueId, userId, rawMessage, week)) as ZombieChimmyAction
      return {
        ok: row.isValid,
        chimmyActionId: row.id,
        publicMessage: row.publicResponse,
        privateMessage: row.privateResponse,
        error: row.validationError ?? undefined,
      }
    }
    if (intent === 'use_serum') {
      if (lower.includes('revive')) {
        try {
          await processRevive(leagueId, userId, week)
          return { ok: true, publicMessage: '⚡ A Zombie has been brought back from the dead.' }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e)
          const row = await prisma.zombieChimmyAction.create({
            data: {
              leagueId,
              userId,
              week,
              actionType: 'revive_self',
              rawMessage,
              isValid: false,
              validationError: 'revive_failed',
              privateResponse: `⚠️ ${msg}`,
            },
          })
          return { ok: false, chimmyActionId: row.id, privateMessage: msg }
        }
      } else {
        const row = (await processSerumAction(leagueId, userId, rawMessage, week)) as ZombieChimmyAction
        return {
          ok: row.isValid,
          chimmyActionId: row.id,
          publicMessage: row.publicResponse,
          privateMessage: row.privateResponse,
          error: row.validationError ?? undefined,
        }
      }
    }
    if (intent === 'declare_bomb') {
      const row = await processBombAction(leagueId, userId, rawMessage, week)
      const full = await prisma.zombieChimmyAction.findUniqueOrThrow({ where: { id: row.id } })
      return {
        ok: full.isValid,
        chimmyActionId: full.id,
        publicMessage: full.publicResponse,
        privateMessage: full.privateResponse,
        error: full.validationError ?? undefined,
      }
    }
    if (intent === 'use_weapon') {
      const row = await processWeaponAction(leagueId, userId, rawMessage, week)
      const full = await prisma.zombieChimmyAction.findUniqueOrThrow({ where: { id: row.id } })
      return {
        ok: full.isValid,
        chimmyActionId: full.id,
        publicMessage: full.publicResponse,
        privateMessage: full.privateResponse,
        error: full.validationError ?? undefined,
      }
    }
    if (intent === 'activate_power') {
      let key = 'power_horde_command'
      if (lower.includes('dark whisper')) key = 'power_dark_whisper'
      if (lower.includes('infection override')) key = 'power_infection_override'
      if (lower.includes('mass serum')) key = 'power_mass_serum_burn'
      await activateWhispererPower(leagueId, userId, key, rawMessage)
      return { ok: true, publicMessage: '🔴 A Whisperer power resonates across the island.' }
    }

    // Unknown intent
    const row = await prisma.zombieChimmyAction.create({
      data: {
        leagueId,
        userId,
        week,
        actionType: 'unknown',
        rawMessage,
        isValid: false,
        validationError: 'unrecognized',
        privateResponse:
          "⚠️ I didn't recognize that command. Try:\n" +
          '• `@Chimmy inventory` — Show your serums & weapons\n' +
          '• `@Chimmy role` — Show your status (Survivor/Zombie/Whisperer)\n' +
          '• `@Chimmy rules` — Show infection & serum rules\n' +
          '• `@Chimmy week` — Show this week\'s standings\n' +
          '• `@Chimmy revive` — Use serum to revive\n' +
          '• `@Chimmy bomb 💣` — Detonate bomb\n' +
          '• `@Chimmy axe/gun/knife/bow` — Use weapon\n' +
          '• `@Chimmy ambush [target]` — Whisperer ambush',
      },
    })
    return { ok: false, chimmyActionId: row.id, privateMessage: row.privateResponse }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    }
  }
}
