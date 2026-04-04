import type { ZombieChimmyAction } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { processAmbushFromChimmy } from '@/lib/zombie/ambushEngine'
import { processSerumAction, processRevive } from '@/lib/zombie/serumEngine'
import { processWeaponAction, processBombAction } from '@/lib/zombie/weaponEngine'
import { activateWhispererPower } from '@/lib/zombie/whispererEngine'

export type ChimmyActionResult = {
  ok: boolean
  chimmyActionId?: string
  publicMessage?: string | null
  privateMessage?: string | null
  error?: string
}

export async function handleZombieChimmyAction(
  leagueId: string,
  userId: string,
  rawMessage: string,
  week: number,
): Promise<ChimmyActionResult> {
  const lower = rawMessage.toLowerCase()
  try {
    if (lower.includes('@chimmy') && lower.includes('ambush')) {
      const row = (await processAmbushFromChimmy(leagueId, userId, rawMessage, week)) as ZombieChimmyAction
      return {
        ok: row.isValid,
        chimmyActionId: row.id,
        publicMessage: row.publicResponse,
        privateMessage: row.privateResponse,
        error: row.validationError ?? undefined,
      }
    }
    if (lower.includes('@chimmy') && lower.includes('serum')) {
      const row = (await processSerumAction(leagueId, userId, rawMessage, week)) as ZombieChimmyAction
      return {
        ok: row.isValid,
        chimmyActionId: row.id,
        publicMessage: row.publicResponse,
        privateMessage: row.privateResponse,
        error: row.validationError ?? undefined,
      }
    }
    if (lower.includes('@chimmy') && lower.includes('revive')) {
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
    }
    if (lower.includes('@chimmy') && (lower.includes('bomb') || rawMessage.includes('💣'))) {
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
    if (lower.includes('@chimmy') && (lower.includes('axe') || lower.includes('gun'))) {
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
    if (lower.includes('@chimmy') && lower.includes('activate')) {
      let key = 'power_horde_command'
      if (lower.includes('dark whisper')) key = 'power_dark_whisper'
      if (lower.includes('infection override')) key = 'power_infection_override'
      if (lower.includes('mass serum')) key = 'power_mass_serum_burn'
      await activateWhispererPower(leagueId, userId, key, rawMessage)
      return { ok: true, publicMessage: '🔴 A Whisperer power resonates across the island.' }
    }

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
          "⚠️ I didn't understand that zombie action. Try @Chimmy ambush, @Chimmy use serum, @Chimmy use axe…",
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
