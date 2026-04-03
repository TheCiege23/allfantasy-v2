import type { LeagueSettings } from '@prisma/client'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { pickTimerSecondsFromLeagueSettings } from '@/lib/league/league-settings-pick-timer'

type SlotRow = { slot: number; rosterId: string; displayName: string }

function draftTypeToSessionFields(draftType: string): { draftType: string; thirdRoundReversal: boolean } {
  if (draftType === '3rd_reversal') {
    return { draftType: 'snake', thirdRoundReversal: true }
  }
  if (draftType === 'auction') {
    return { draftType: 'auction', thirdRoundReversal: false }
  }
  if (draftType === 'linear') {
    return { draftType: 'linear', thirdRoundReversal: false }
  }
  return { draftType: 'snake', thirdRoundReversal: false }
}

/** Map LeagueSettings.draftOrderSlots JSON to DraftSession.slotOrder (rosterId = team id). */
export function draftOrderSlotsToSlotOrder(
  draftOrderSlots: unknown,
  fallbackTeamCount: number,
): SlotRow[] {
  if (!Array.isArray(draftOrderSlots)) return []
  const rows: SlotRow[] = []
  for (const raw of draftOrderSlots) {
    if (!raw || typeof raw !== 'object') continue
    const o = raw as Record<string, unknown>
    const slot = typeof o.slot === 'number' ? o.slot : Number(o.slot)
    const ownerId = typeof o.ownerId === 'string' ? o.ownerId : null
    const ownerName = typeof o.ownerName === 'string' ? o.ownerName : 'Team'
    if (!Number.isFinite(slot) || slot < 1 || !ownerId) continue
    rows.push({ slot, rosterId: ownerId, displayName: ownerName })
  }
  rows.sort((a, b) => a.slot - b.slot)
  if (rows.length >= fallbackTeamCount) return rows
  return rows
}

/**
 * Push LeagueSettings onto an existing DraftSession (pre-draft / commissioner updates).
 */
export async function syncDraftSessionFromLeagueSettings(
  leagueId: string,
  ls: LeagueSettings,
  leagueTeamCount: number,
): Promise<void> {
  const session = await prisma.draftSession.findUnique({ where: { leagueId } })
  if (!session) return

  const timerSeconds = pickTimerSecondsFromLeagueSettings(ls.pickTimerPreset, ls.pickTimerCustomValue)
  const { draftType, thirdRoundReversal } = draftTypeToSessionFields(ls.draftType)
  const slotOrder = draftOrderSlotsToSlotOrder(ls.draftOrderSlots, leagueTeamCount)
  const slotOrderJson: Prisma.InputJsonValue =
    slotOrder.length > 0
      ? (slotOrder as unknown as Prisma.InputJsonValue)
      : (session.slotOrder as Prisma.InputJsonValue)

  await prisma.draftSession.update({
    where: { id: session.id },
    data: {
      timerSeconds,
      draftType,
      thirdRoundReversal,
      rounds: Math.max(1, Math.min(50, ls.rounds)),
      aiAutoPick: ls.aiAutoPick,
      cpuAutoPick: ls.cpuAutoPick,
      playerPool: ls.playerPool,
      alphabeticalSort: ls.alphabeticalSort,
      ...(slotOrder.length > 0 ? { slotOrder: slotOrderJson } : {}),
      version: { increment: 1 },
    },
  })
}
