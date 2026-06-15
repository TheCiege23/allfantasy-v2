import 'server-only'

import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { normalizeSurvivorFoundationSettings } from './normalizeSurvivorSettings'

/**
 * SURVIVOR ELIMINATION SCAFFOLDING (canonical Phase 3) — truthful, no faked end-game.
 *
 * Applies the elimination outcome for a revealed council:
 *  - removed_to_waivers → player marked eliminated + a PENDING roster-release event (the real
 *    waiver release is intentionally NOT triggered here; we record a truthful pending state).
 *  - exile_island       → player marked pending-exile (placeholder; the Exile Island engine is
 *    deferred — no exile gameplay is fabricated).
 * Eliminated/exiled players are removed from active tribe-chat membership and their tribe-member
 * row; the game state's active count is decremented. Idempotent.
 */

export type EliminationOutcome =
  | { ok: true; alreadyResolved: boolean; outcome: 'removed_to_waivers' | 'exile_island'; eliminatedUserId: string; removedFromChats: number; pendingRelease: boolean; pendingExile: boolean }
  | { ok: false; status: 400 | 404 | 409; code: string; error: string }

export async function resolveElimination(leagueId: string, councilId: string, actorUserId?: string): Promise<EliminationOutcome> {
  const council = await prisma.survivorTribalCouncil.findFirst({ where: { id: councilId, leagueId } })
  if (!council) return { ok: false, status: 404, code: 'not_found', error: 'Council not found.' }
  if (council.status === 'tie_pending' || council.isTie) {
    return { ok: false, status: 409, code: 'tie_unresolved', error: 'This council is tied — a revote or commissioner tiebreak is required first.' }
  }
  if (!council.isRevealed) {
    return { ok: false, status: 409, code: 'not_revealed', error: 'Reveal the votes before resolving elimination.' }
  }
  if (!council.eliminatedUserId) {
    return { ok: false, status: 409, code: 'no_eliminated', error: 'No eliminated player on this council (no valid votes counted).' }
  }

  const league = await prisma.league.findUnique({ where: { id: leagueId }, select: { settings: true } })
  const settings = normalizeSurvivorFoundationSettings(
    league?.settings && typeof league.settings === 'object' ? (league.settings as Record<string, unknown>) : {},
  )
  const outcome = settings.eliminationOutcome // 'removed_to_waivers' | 'exile_island'
  const userId = council.eliminatedUserId

  const player = await prisma.survivorPlayer.findUnique({
    where: { leagueId_userId: { leagueId, userId } },
    select: { playerState: true, redraftRosterId: true, tribeId: true },
  })
  if (!player) return { ok: false, status: 404, code: 'player_not_found', error: 'Eliminated player record not found.' }

  if (player.playerState === 'eliminated' || player.playerState === 'exile') {
    return { ok: true, alreadyResolved: true, outcome, eliminatedUserId: userId, removedFromChats: 0, pendingRelease: false, pendingExile: player.playerState === 'exile' }
  }

  const newState = outcome === 'exile_island' ? 'exile' : 'eliminated'
  const rosterId = player.redraftRosterId ?? userId
  let removedFromChats = 0

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.survivorPlayer.update({
      where: { leagueId_userId: { leagueId, userId } },
      data: { playerState: newState, eliminatedWeek: council.week, canAccessTribeChat: false },
    })

    // Remove from active tribe chat membership.
    const tribeChannels = await tx.survivorChatChannel.findMany({
      where: { leagueId, channelType: 'tribe' },
      select: { id: true, memberUserIds: true },
    })
    for (const ch of tribeChannels as Array<{ id: string; memberUserIds: string[] }>) {
      if (ch.memberUserIds.includes(userId)) {
        await tx.survivorChatChannel.update({ where: { id: ch.id }, data: { memberUserIds: ch.memberUserIds.filter((u) => u !== userId) } })
        removedFromChats += 1
      }
    }

    // Update tribe membership: drop the eliminated roster's tribe-member row.
    await tx.survivorTribeMember.deleteMany({ where: { rosterId, tribe: { leagueId } } })

    // Decrement active count + clear the active council pointer.
    const gs = await tx.survivorGameState.findUnique({ where: { leagueId }, select: { activePlayerCount: true } })
    await tx.survivorGameState.upsert({
      where: { leagueId },
      create: { leagueId, phase: council.phase, currentWeek: council.week, activePlayerCount: Math.max(0, (gs?.activePlayerCount ?? 1) - 1), tribalCompleteAt: new Date(), needsTribalLock: false },
      update: {
        activePlayerCount: Math.max(0, (gs?.activePlayerCount ?? 1) - 1),
        exilePlayerCount: outcome === 'exile_island' ? { increment: 1 } : undefined,
        activeCouncilId: null,
        needsTribalLock: false,
        tribalCompleteAt: new Date(),
      },
    })

    await tx.survivorAuditEntry.create({
      data: {
        leagueId,
        week: council.week,
        category: 'elimination',
        action: 'player_eliminated',
        actorUserId: actorUserId ?? null,
        targetUserId: userId,
        relatedEntityId: councilId,
        relatedEntityType: 'council',
        data: { outcome, newState, removedFromChats, pendingRelease: outcome === 'removed_to_waivers', pendingExile: outcome === 'exile_island' },
        isVisibleToCommissioner: true,
        isVisibleToPublic: true,
      },
    })

    // Truthful pending events (no waiver/exile engine fired this phase).
    if (outcome === 'removed_to_waivers') {
      await tx.survivorAuditEntry.create({
        data: { leagueId, week: council.week, category: 'roster', action: 'roster_release_pending', targetUserId: userId, relatedEntityId: rosterId, relatedEntityType: 'roster', data: { reason: 'voted_out', note: 'Roster release queued; waiver processing handled by the existing waiver flow.' }, isVisibleToCommissioner: true, isVisibleToPublic: true },
      })
    } else {
      await tx.survivorAuditEntry.create({
        data: { leagueId, week: council.week, category: 'exile', action: 'exile_pending', targetUserId: userId, relatedEntityId: rosterId, relatedEntityType: 'roster', data: { note: 'Exile Island engine deferred; player marked pending-exile.' }, isVisibleToCommissioner: true, isVisibleToPublic: true },
      })
    }
  })

  return {
    ok: true,
    alreadyResolved: false,
    outcome,
    eliminatedUserId: userId,
    removedFromChats,
    pendingRelease: outcome === 'removed_to_waivers',
    pendingExile: outcome === 'exile_island',
  }
}
