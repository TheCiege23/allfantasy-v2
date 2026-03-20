/**
 * Commit import: backup current state, apply preview in transaction, optional rollback.
 * Deterministic; no AI.
 */

import { prisma } from '@/lib/prisma'
import type { DraftImportPreview } from './DraftImportPreview'

export interface ImportCommitResult {
  success: boolean
  error?: string
  backupId?: string
}

/**
 * Create backup of current draft session state (for rollback). Returns backup id.
 */
export async function createImportBackup(leagueId: string): Promise<string | null> {
  const session = await prisma.draftSession.findUnique({
    where: { leagueId },
    include: { picks: { orderBy: { overall: 'asc' } } },
  })
  if (!session) return null
  const snapshot = {
    sessionPatch: {
      slotOrder: session.slotOrder,
      tradedPicks: session.tradedPicks,
      keeperConfig: session.keeperConfig,
      keeperSelections: session.keeperSelections,
      status: session.status,
      version: session.version,
      rounds: session.rounds,
      teamCount: session.teamCount,
      draftType: session.draftType,
      thirdRoundReversal: session.thirdRoundReversal,
    },
    picks: session.picks.map((p) => ({
      overall: p.overall,
      round: p.round,
      slot: p.slot,
      rosterId: p.rosterId,
      displayName: p.displayName,
      playerName: p.playerName,
      position: p.position,
      team: p.team,
      byeWeek: p.byeWeek,
      playerId: p.playerId,
      tradedPickMeta: p.tradedPickMeta,
      source: p.source,
      amount: p.amount,
    })),
  }
  const backup = await prisma.draftImportBackup.upsert({
    where: { leagueId },
    create: { leagueId, snapshot: snapshot as any },
    update: { snapshot: snapshot as any },
  })
  return backup.id
}

/**
 * Apply import preview to draft session. Runs in transaction. Creates backup first if backupBeforeCommit.
 */
export async function commitImport(
  leagueId: string,
  preview: DraftImportPreview,
  options: { backupBeforeCommit?: boolean } = {}
): Promise<ImportCommitResult> {
  const session = await prisma.draftSession.findUnique({
    where: { leagueId },
    include: { picks: true },
  })
  if (!session) return { success: false, error: 'Draft session not found' }

  let backupId: string | null = null
  if (options.backupBeforeCommit) {
    backupId = await createImportBackup(leagueId)
  }

  try {
    await prisma.$transaction(async (tx) => {
      const sess = await (tx as any).draftSession.findUnique({ where: { leagueId } })
      if (!sess) throw new Error('Draft session not found')
      await (tx as any).draftPick.deleteMany({ where: { sessionId: sess.id } })
      const sessionId = sess.id
      const teamCount = preview.slotOrder.length
      const rounds = preview.metadata?.rounds ?? preview.picks.length ? Math.max(...preview.picks.map((p) => p.round)) : sess.rounds
      const draftType = preview.metadata?.draftType ?? sess.draftType
      const thirdRoundReversal = preview.metadata?.thirdRoundReversal ?? sess.thirdRoundReversal
      for (const p of preview.picks) {
        await (tx as any).draftPick.create({
          data: {
            sessionId,
            sportType: (sess as any).sportType ?? null,
            overall: p.overall,
            round: p.round,
            slot: p.slot,
            rosterId: p.rosterId,
            displayName: p.displayName,
            playerName: p.playerName,
            position: p.position,
            team: p.team,
            byeWeek: p.byeWeek,
            playerId: p.playerId,
            tradedPickMeta: p.tradedPickMeta ?? undefined,
            source: p.source ?? 'user',
            amount: p.amount ?? undefined,
          },
        })
      }
      await (tx as any).draftSession.update({
        where: { id: sessionId },
        data: {
          slotOrder: preview.slotOrder as any,
          tradedPicks: (preview.tradedPicks ?? []) as any,
          keeperConfig: preview.keeperConfig ?? (sess.keeperConfig as any),
          keeperSelections: preview.keeperSelections ?? (sess.keeperSelections as any),
          rounds: typeof rounds === 'number' ? rounds : sess.rounds,
          teamCount: preview.metadata?.teamCount ?? teamCount,
          draftType: preview.metadata?.draftType ?? sess.draftType,
          thirdRoundReversal: preview.metadata?.thirdRoundReversal ?? sess.thirdRoundReversal,
          status: preview.picks.length >= teamCount * rounds ? 'completed' : 'pre_draft',
          version: { increment: 1 },
          updatedAt: new Date(),
        },
      })
    })
    return { success: true, backupId: backupId ?? undefined }
  } catch (e) {
    return { success: false, error: (e as Error).message, backupId: backupId ?? undefined }
  }
}

/**
 * Rollback last import: restore session and picks from backup.
 */
export async function rollbackImport(leagueId: string): Promise<ImportCommitResult> {
  const backup = await prisma.draftImportBackup.findUnique({
    where: { leagueId },
  })
  if (!backup) return { success: false, error: 'No import backup found for this league' }
  const snapshot = backup.snapshot as {
    sessionPatch: {
      slotOrder: unknown
      tradedPicks: unknown
      keeperConfig: unknown
      keeperSelections: unknown
      status: string
      version: number
      rounds?: number
      teamCount?: number
      draftType?: string
      thirdRoundReversal?: boolean
    }
    picks: Array<{
      overall: number
      round: number
      slot: number
      rosterId: string
      displayName: string | null
      playerName: string
      position: string
      team: string | null
      byeWeek: number | null
      playerId: string | null
      tradedPickMeta?: unknown
      source: string | null
      amount?: number | null
    }>
  }
  const session = await prisma.draftSession.findUnique({
    where: { leagueId },
  })
  if (!session) return { success: false, error: 'Draft session not found' }

  try {
    await prisma.$transaction(async (tx) => {
      await (tx as any).draftPick.deleteMany({ where: { sessionId: session.id } })
      const patch = snapshot.sessionPatch
      for (const p of snapshot.picks ?? []) {
        await (tx as any).draftPick.create({
          data: {
            sessionId: session.id,
            sportType: (session as any).sportType ?? null,
            overall: p.overall,
            round: p.round,
            slot: p.slot,
            rosterId: p.rosterId,
            displayName: p.displayName,
            playerName: p.playerName,
            position: p.position,
            team: p.team,
            byeWeek: p.byeWeek,
            playerId: p.playerId,
            tradedPickMeta: p.tradedPickMeta ?? undefined,
            source: p.source ?? 'user',
            amount: p.amount ?? undefined,
          },
        })
      }
      await (tx as any).draftSession.update({
        where: { id: session.id },
        data: {
          slotOrder: patch.slotOrder,
          tradedPicks: patch.tradedPicks,
          keeperConfig: patch.keeperConfig,
          keeperSelections: patch.keeperSelections,
          status: patch.status,
          version: patch.version,
          rounds: patch.rounds ?? session.rounds,
          teamCount: patch.teamCount ?? session.teamCount,
          draftType: patch.draftType ?? session.draftType,
          thirdRoundReversal: patch.thirdRoundReversal ?? session.thirdRoundReversal,
          updatedAt: new Date(),
        },
      })
    })
    await prisma.draftImportBackup.delete({ where: { id: backup.id } })
    return { success: true }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

/**
 * Check if rollback is available for league.
 */
export async function hasImportBackup(leagueId: string): Promise<boolean> {
  const b = await prisma.draftImportBackup.findUnique({ where: { leagueId } })
  return !!b
}
