/**
 * Supplemental draft state machine (configure → in progress → complete).
 * Server-only: uses Prisma + crypto.
 */

import { randomBytes } from 'node:crypto'

import type { Prisma } from '@prisma/client'

import { prisma } from '@/lib/prisma'
import { isOrphanPlatformUserId } from '@/lib/orphan-ai-manager/orphanRosterResolver'

import { buildAssetPoolFromRosters } from './assetPoolBuilder'
import type { SupplementalAsset, SupplementalDraftConfig, SupplementalDraftState } from './types'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor((randomBytes(4).readUInt32BE(0) / 0x1_0000_0000) * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

function parseAssetPool(raw: unknown): SupplementalAsset[] {
  if (!Array.isArray(raw)) return []
  return raw as SupplementalAsset[]
}

function buildLinearDraftOrder(baseOrder: string[], rounds: number): string[] {
  const out: string[] = []
  for (let r = 0; r < rounds; r++) {
    for (const id of baseOrder) out.push(id)
  }
  return out
}

/** Rounds from spec: countable = players + draft picks (exclude FAAB from divisor); ensure enough slots for FAAB too. */
function computeRoundsPicksPerRound(
  assets: SupplementalAsset[],
  participantCount: number
): { totalRounds: number; picksPerRound: number } {
  const n = Math.max(1, participantCount)
  const countable = assets.filter((a) => a.assetType !== 'faab').length
  let totalRounds = Math.max(1, Math.ceil(countable / n))
  while (totalRounds * n < assets.length) {
    totalRounds += 1
  }
  return { totalRounds, picksPerRound: n }
}

async function rowToState(row: {
  id: string
  leagueId: string
  scenario: string
  status: string
  participantRosterIds: string[]
  passedRosterIds: string[]
  draftOrder: string[]
  currentPickIndex: number
  totalRounds: number
  picksPerRound: number
  assetPool: unknown
  sourceRosterIds: string[]
  pickTimeSeconds: number
  autoPickOnTimeout: boolean
  startedAt: Date | null
  completedAt: Date | null
  picks: {
    pickNumber: number
    round: number
    pickInRound: number
    rosterId: string
    assetType: string | null
    assetId: string | null
    assetDisplayName: string | null
    isPassed: boolean
    pickedAt: Date | null
  }[]
}): Promise<SupplementalDraftState> {
  const assetPool = parseAssetPool(row.assetPool)
  const draftOrder = row.draftOrder
  const currentRosterId = getCurrentRosterId(draftOrder, row.currentPickIndex, row.passedRosterIds)
  const isComplete = row.status === 'completed' || row.status === 'cancelled'
  const lastPick = row.picks[row.picks.length - 1]
  const currentPickNumber = lastPick ? lastPick.pickNumber + 1 : 1

  return {
    id: row.id,
    leagueId: row.leagueId,
    scenario: row.scenario as SupplementalDraftState['scenario'],
    status: row.status as SupplementalDraftState['status'],
    participantRosterIds: row.participantRosterIds,
    passedRosterIds: row.passedRosterIds,
    draftOrder: row.draftOrder,
    currentPickIndex: row.currentPickIndex,
    totalRounds: row.totalRounds,
    picksPerRound: row.picksPerRound,
    assetPool,
    sourceRosterIds: row.sourceRosterIds,
    picks: row.picks.map((p) => ({
      pickNumber: p.pickNumber,
      round: p.round,
      pickInRound: p.pickInRound,
      rosterId: p.rosterId,
      assetType: p.assetType ?? undefined,
      assetId: p.assetId ?? undefined,
      assetDisplayName: p.assetDisplayName ?? undefined,
      isPassed: p.isPassed,
      pickedAt: p.pickedAt?.toISOString(),
    })),
    currentRosterId,
    currentPickNumber,
    isComplete,
    startedAt: row.startedAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    pickTimeSeconds: row.pickTimeSeconds,
    autoPickOnTimeout: row.autoPickOnTimeout,
  }
}

function getCurrentRosterId(
  draftOrder: string[],
  startIndex: number,
  passedRosterIds: string[]
): string | null {
  const passed = new Set(passedRosterIds)
  let i = startIndex
  while (i < draftOrder.length) {
    const rid = draftOrder[i]!
    if (!passed.has(rid)) return rid
    i++
  }
  return null
}

function advanceToNextSlot(
  draftOrder: string[],
  startIndex: number,
  passedRosterIds: string[]
): number {
  const passed = new Set(passedRosterIds)
  let i = startIndex + 1
  while (i < draftOrder.length) {
    if (!passed.has(draftOrder[i]!)) return i
    i++
  }
  return i
}

function allAssetsClaimed(assets: SupplementalAsset[]): boolean {
  if (assets.length === 0) return true
  return assets.every((a) => !a.isAvailable)
}

function allParticipantsPassed(participantRosterIds: string[], passedRosterIds: string[]): boolean {
  if (participantRosterIds.length === 0) return false
  const passed = new Set(passedRosterIds)
  return participantRosterIds.every((id) => passed.has(id))
}

export class SupplementalDraftEngine {
  static async createDraft(
    config: SupplementalDraftConfig,
    commissionerUserId: string
  ): Promise<SupplementalDraftState> {
    const { assets } = await buildAssetPoolFromRosters(config.leagueId, config.sourceRosterIds)
    const participants = [...new Set(config.participantRosterIds)]
    if (participants.length === 0) {
      throw new Error('Supplemental draft requires at least one participant roster')
    }

    let baseOrder: string[] = []
    if (config.orderMode === 'commissioner_set') {
      const manual = config.manualOrder?.filter((id) => participants.includes(id)) ?? []
      baseOrder = manual.length > 0 ? manual : participants
      for (const p of participants) {
        if (!baseOrder.includes(p)) baseOrder.push(p)
      }
    } else {
      baseOrder = shuffle(participants)
    }

    const { totalRounds, picksPerRound } = computeRoundsPicksPerRound(assets, baseOrder.length)
    const draftOrder = buildLinearDraftOrder(baseOrder, totalRounds)

    const draft = await prisma.supplementalDraft.create({
      data: {
        leagueId: config.leagueId,
        scenario: config.scenario,
        status: 'configuring',
        participantRosterIds: participants,
        passedRosterIds: [],
        draftOrder,
        currentPickIndex: 0,
        totalRounds,
        picksPerRound,
        sourceRosterIds: config.sourceRosterIds,
        assetPool: JSON.parse(JSON.stringify(assets)) as Prisma.InputJsonValue,
        orderMode: config.orderMode,
        draftType: 'linear',
        pickTimeSeconds: config.pickTimeSeconds,
        autoPickOnTimeout: config.autoPickOnTimeout,
        createdByUserId: commissionerUserId,
      },
      include: { picks: { orderBy: { pickNumber: 'asc' } } },
    })

    return rowToState(draft)
  }

  static async startDraft(draftId: string, commissionerUserId: string): Promise<SupplementalDraftState> {
    const row = await prisma.supplementalDraft.findFirst({
      where: { id: draftId, createdByUserId: commissionerUserId },
      include: { picks: { orderBy: { pickNumber: 'asc' } } },
    })
    if (!row) throw new Error('Draft not found')
    if (row.status !== 'configuring') throw new Error('Draft is not in configuring status')

    const participants = await prisma.roster.findMany({
      where: { id: { in: row.participantRosterIds }, leagueId: row.leagueId },
      select: { id: true, platformUserId: true },
    })
    if (participants.length !== row.participantRosterIds.length) {
      throw new Error('One or more participant rosters are invalid for this league')
    }
    for (const p of participants) {
      if (isOrphanPlatformUserId(p.platformUserId)) {
        throw new Error('Cannot start supplemental draft while a participant slot is still orphaned')
      }
    }

    let nextIndex = row.currentPickIndex
    const passed = new Set(row.passedRosterIds)
    while (nextIndex < row.draftOrder.length && passed.has(row.draftOrder[nextIndex]!)) {
      nextIndex++
    }

    const updated = await prisma.supplementalDraft.update({
      where: { id: draftId },
      data: {
        status: 'in_progress',
        startedAt: new Date(),
        currentPickIndex: nextIndex,
      },
      include: { picks: { orderBy: { pickNumber: 'asc' } } },
    })

    return rowToState(updated)
  }

  static async makePick(draftId: string, rosterId: string, assetId: string): Promise<SupplementalDraftState> {
    const row = await prisma.supplementalDraft.findUnique({
      where: { id: draftId },
      include: { picks: { orderBy: { pickNumber: 'asc' } } },
    })
    if (!row) throw new Error('Draft not found')
    if (row.status !== 'in_progress') throw new Error('Draft is not active')
    if (!row.participantRosterIds.includes(rosterId)) throw new Error('Roster is not a participant in this draft')

    const assets = parseAssetPool(row.assetPool)
    const currentRoster = getCurrentRosterId(row.draftOrder, row.currentPickIndex, row.passedRosterIds)
    if (!currentRoster || currentRoster !== rosterId) {
      throw new Error('Not your pick')
    }

    const pickNo = row.picks.length > 0 ? Math.max(...row.picks.map((p) => p.pickNumber)) + 1 : 1
    const round = Math.ceil(pickNo / Math.max(1, row.picksPerRound))
    const pickInRound = ((pickNo - 1) % Math.max(1, row.picksPerRound)) + 1

    if (assetId === 'PASS' || assetId === 'pass') {
      const passed = [...new Set([...row.passedRosterIds, rosterId])]
      const nextIndex = advanceToNextSlot(row.draftOrder, row.currentPickIndex, passed)

      await prisma.$transaction(async (tx) => {
        await tx.supplementalDraftPick.create({
          data: {
            supplementalDraftId: draftId,
            pickNumber: pickNo,
            round,
            pickInRound,
            rosterId,
            isPassed: true,
            pickedAt: new Date(),
          },
        })
        await tx.roster.updateMany({
          where: { id: rosterId, leagueId: row.leagueId },
          data: { supplementalDraftPasses: true },
        })

        let status: string = row.status
        let completedAt: Date | null = row.completedAt
        if (
          allParticipantsPassed(row.participantRosterIds, passed) ||
          allAssetsClaimed(assets) ||
          nextIndex >= row.draftOrder.length
        ) {
          status = 'completed'
          completedAt = new Date()
        }

        await tx.supplementalDraft.update({
          where: { id: draftId },
          data: {
            passedRosterIds: passed,
            currentPickIndex: nextIndex,
            status: status as never,
            completedAt,
          },
        })
      })

      const after = await prisma.supplementalDraft.findUnique({
        where: { id: draftId },
        include: { picks: { orderBy: { pickNumber: 'asc' } } },
      })
      if (after?.status === 'completed') {
        await SupplementalDraftEngine.completeDraft(draftId)
      }
      return rowToState(after!)
    }

    const asset = assets.find((a) => a.id === assetId)
    if (!asset || !asset.isAvailable) throw new Error('Asset not available')

    asset.isAvailable = false
    asset.claimedByRosterId = rosterId
    asset.claimedAt = new Date().toISOString()

    const display =
      asset.assetType === 'player'
        ? asset.playerName ?? asset.playerId ?? 'Player'
        : asset.assetType === 'draft_pick'
          ? asset.pickLabel ?? 'Draft pick'
          : asset.assetType === 'faab'
            ? `FAAB $${asset.faabAmount ?? 0}`
            : 'Asset'

    const nextIndex = advanceToNextSlot(row.draftOrder, row.currentPickIndex, row.passedRosterIds)

    await prisma.$transaction(async (tx) => {
      await tx.supplementalDraftPick.create({
        data: {
          supplementalDraftId: draftId,
          pickNumber: pickNo,
          round,
          pickInRound,
          rosterId,
          assetType: asset.assetType,
          assetId: asset.playerId ?? asset.pickId ?? asset.id,
          assetDisplayName: display,
          isPassed: false,
          pickedAt: new Date(),
        },
      })

      let status: string = row.status
      let completedAt: Date | null = row.completedAt
      if (allAssetsClaimed(assets) || nextIndex >= row.draftOrder.length) {
        status = 'completed'
        completedAt = new Date()
      }

      await tx.supplementalDraft.update({
        where: { id: draftId },
        data: {
          assetPool: JSON.parse(JSON.stringify(assets)) as Prisma.InputJsonValue,
          currentPickIndex: nextIndex,
          status: status as never,
          completedAt,
        },
      })
    })

    const after = await prisma.supplementalDraft.findUnique({
      where: { id: draftId },
      include: { picks: { orderBy: { pickNumber: 'asc' } } },
    })
    if (after?.status === 'completed') {
      await SupplementalDraftEngine.completeDraft(draftId)
    }
    return rowToState(after!)
  }

  static async passManager(
    draftId: string,
    rosterId: string,
    commissionerOverride: boolean = false
  ): Promise<void> {
    const row = await prisma.supplementalDraft.findUnique({ where: { id: draftId } })
    if (!row) throw new Error('Draft not found')

    let passed = [...row.passedRosterIds]
    if (commissionerOverride) {
      passed = passed.filter((id) => id !== rosterId)
    } else {
      if (!passed.includes(rosterId)) passed = [...passed, rosterId]
    }

    await prisma.$transaction([
      prisma.supplementalDraft.update({
        where: { id: draftId },
        data: { passedRosterIds: passed },
      }),
      prisma.roster.updateMany({
        where: { id: rosterId, leagueId: row.leagueId },
        data: { supplementalDraftPasses: commissionerOverride ? false : true },
      }),
    ])
  }

  static async completeDraft(draftId: string): Promise<void> {
    const row = await prisma.supplementalDraft.findUnique({ where: { id: draftId } })
    if (!row || row.status !== 'completed') return

    const assets = parseAssetPool(row.assetPool)

    await prisma.$transaction(async (tx) => {
      for (const asset of assets) {
        if (!asset.claimedByRosterId) {
          if (asset.assetType === 'faab' && asset.sourceRosterId) {
            await tx.roster.updateMany({
              where: { id: asset.sourceRosterId, leagueId: row.leagueId },
              data: { faabRemaining: 0 },
            })
          }
          continue
        }

        if (asset.assetType === 'player' && asset.playerId) {
          const destId = asset.claimedByRosterId
          const dest = await tx.roster.findFirst({
            where: { id: destId, leagueId: row.leagueId },
            select: { playerData: true },
          })
          if (dest) {
            const pd = dest.playerData
            const arr = Array.isArray(pd) ? [...pd] : []
            const already = arr.some((p: unknown) => {
              const o = p && typeof p === 'object' ? (p as Record<string, unknown>) : null
              const pid = o?.playerId ?? o?.player_id ?? o?.id
              return String(pid) === String(asset.playerId)
            })
            if (!already) {
              arr.push({
                playerId: asset.playerId,
                name: asset.playerName,
                position: asset.playerPosition,
                team: asset.playerTeam,
                source: 'supplemental_draft',
              })
            }
            await tx.roster.update({
              where: { id: destId },
              data: { playerData: arr },
            })
          }

          const src = await tx.roster.findFirst({
            where: { id: asset.sourceRosterId, leagueId: row.leagueId },
            select: { playerData: true },
          })
          if (src && Array.isArray(src.playerData)) {
            const filtered = src.playerData.filter((p: unknown) => {
              const o = p && typeof p === 'object' ? (p as Record<string, unknown>) : null
              const pid = o?.playerId ?? o?.player_id ?? o?.id
              return String(pid) !== String(asset.playerId)
            })
            await tx.roster.update({
              where: { id: asset.sourceRosterId },
              data: { playerData: filtered },
            })
          }
        }

        if (asset.assetType === 'draft_pick' && asset.claimedByRosterId) {
          // Future: persist traded pick ownership on a first-class model or league JSON.
          void asset.pickId
        }
      }

      await tx.roster.updateMany({
        where: { leagueId: row.leagueId },
        data: { supplementalDraftPasses: false },
      })
    })

    // Remaining players → waivers; remaining picks → FAAB auction for non-participants: follow-up tasks.
  }

  static async getDraftState(draftId: string): Promise<SupplementalDraftState | null> {
    const row = await prisma.supplementalDraft.findUnique({
      where: { id: draftId },
      include: { picks: { orderBy: { pickNumber: 'asc' } } },
    })
    if (!row) return null
    return rowToState(row)
  }

  static async getActiveDraftForLeague(leagueId: string): Promise<SupplementalDraftState | null> {
    const row = await prisma.supplementalDraft.findFirst({
      where: {
        leagueId,
        status: { in: ['pending', 'configuring', 'in_progress'] },
      },
      orderBy: { updatedAt: 'desc' },
      include: { picks: { orderBy: { pickNumber: 'asc' } } },
    })
    if (!row) return null
    return rowToState(row)
  }
}
