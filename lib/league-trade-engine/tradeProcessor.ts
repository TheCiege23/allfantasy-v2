/**
 * Applies AF league trade items to `Roster.playerData` / `faabRemaining` in a transaction.
 */

import { prisma } from '@/lib/prisma'
import { extractDraftPicksFromPlayerData } from '@/lib/dispersal-draft/assetPoolBuilder'
import {
  addPlayerToRosterData,
  getRosterPlayerIds,
  removePlayerFromRosterData,
} from '@/lib/waiver-wire/roster-utils'
import type { TradeAssetInput } from '@/lib/league-trade-engine/types'

export type LeagueTradeTx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0]

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}

function pickKey(raw: unknown): string {
  const o = asRecord(raw)
  if (!o) return ''
  return String(o.id ?? o.pick_id ?? o.draft_pick_id ?? o.pickId ?? '')
}

function removePickFromPlayerData(playerData: unknown, pickRef: string): unknown {
  const root = asRecord(playerData) ?? {}
  const out = { ...root }
  for (const key of ['draftPicks', 'futurePicks', 'draft_picks', 'picks']) {
    const v = out[key]
    if (!Array.isArray(v)) continue
    out[key] = v.filter((raw) => pickKey(raw) !== pickRef)
  }
  if (Array.isArray(playerData)) return out.players ?? out
  return out
}

function addPickToPlayerData(playerData: unknown, pick: unknown): unknown {
  const root = asRecord(playerData) ?? {}
  const draftPicks = Array.isArray(root.draftPicks) ? [...root.draftPicks] : []
  draftPicks.push(pick)
  return { ...root, draftPicks }
}

function extractPickObject(fromData: unknown, pickRef: string): unknown | null {
  const root = asRecord(fromData)
  if (!root) return null
  for (const key of ['draftPicks', 'futurePicks', 'draft_picks', 'picks']) {
    const v = root[key]
    if (!Array.isArray(v)) continue
    const found = v.find((raw) => pickKey(raw) === pickRef)
    if (found) return found
  }
  const picks = extractDraftPicksFromPlayerData(fromData, '')
  const hit = picks.find((p) => p.pickId === pickRef)
  return hit ? { id: hit.pickId, season: hit.pickYear, round: hit.pickRound } : null
}

export async function applyTradeAssetsInTransaction(
  tx: LeagueTradeTx,
  input: {
    leagueId: string
    proposerRosterId: string
    receiverRosterId: string
    assets: TradeAssetInput[]
  },
): Promise<void> {
  const proposer = await tx.roster.findUniqueOrThrow({ where: { id: input.proposerRosterId } })
  const receiver = await tx.roster.findUniqueOrThrow({ where: { id: input.receiverRosterId } })
  if (proposer.leagueId !== input.leagueId || receiver.leagueId !== input.leagueId) {
    throw new Error('Roster league mismatch')
  }

  let pData: unknown = proposer.playerData
  let rData: unknown = receiver.playerData
  let pFaab = proposer.faabRemaining ?? 0
  let rFaab = receiver.faabRemaining ?? 0

  for (const a of input.assets) {
    const fromId = a.fromRosterId
    const toId = a.toRosterId

    if (a.itemType === 'player' && a.itemReference) {
      const pid = a.itemReference
      if (fromId === proposer.id) {
        if (!getRosterPlayerIds(pData).includes(pid)) throw new Error(`Player ${pid} not on proposer`)
        pData = removePlayerFromRosterData(pData, pid)
        rData = addPlayerToRosterData(rData, pid)
      } else {
        if (!getRosterPlayerIds(rData).includes(pid)) throw new Error(`Player ${pid} not on receiver`)
        rData = removePlayerFromRosterData(rData, pid)
        pData = addPlayerToRosterData(pData, pid)
      }
    }

    if (a.itemType === 'faab') {
      const amt = Math.floor(Number(a.faabAmount ?? 0))
      if (amt <= 0) throw new Error('Invalid FAAB')
      if (fromId === proposer.id) {
        if (pFaab < amt) throw new Error('Insufficient FAAB (proposer)')
        pFaab -= amt
        rFaab += amt
      } else {
        if (rFaab < amt) throw new Error('Insufficient FAAB (receiver)')
        rFaab -= amt
        pFaab += amt
      }
    }

    if (a.itemType === 'rookie_pick' || a.itemType === 'future_pick' || a.itemType === 'devy_pick') {
      const ref = String(a.itemReference ?? '')
      if (!ref) throw new Error('Pick ref required')
      const fromData = fromId === proposer.id ? pData : rData
      const toData = toId === proposer.id ? pData : rData
      const pickObj = extractPickObject(fromData, ref)
      if (!pickObj) throw new Error('Pick not found on roster')
      const nextFrom = removePickFromPlayerData(fromData, ref)
      const nextTo = addPickToPlayerData(toData, pickObj)
      if (fromId === proposer.id) {
        pData = nextFrom
        rData = nextTo
      } else {
        rData = nextFrom
        pData = nextTo
      }
    }

    if (a.itemType === 'specialty_asset') {
      const fromData = fromId === proposer.id ? pData : rData
      const toData = toId === proposer.id ? pData : rData
      const fromRoot = asRecord(fromData) ?? {}
      const spec = Array.isArray(fromRoot.specialtyAssets) ? [...fromRoot.specialtyAssets] : []
      const key = String(a.itemReference ?? '')
      const idx = spec.findIndex((x) => asRecord(x)?.id === key || JSON.stringify(x) === key)
      if (idx < 0) throw new Error('Specialty asset not found on sending roster')
      const [row] = spec.splice(idx, 1)
      const toRoot = asRecord(toData) ?? {}
      const toSpec = Array.isArray(toRoot.specialtyAssets) ? [...toRoot.specialtyAssets] : []
      toSpec.push(row)
      const nextFrom = { ...fromRoot, specialtyAssets: spec }
      const nextTo = { ...toRoot, specialtyAssets: toSpec }
      if (fromId === proposer.id) {
        pData = nextFrom
        rData = nextTo
      } else {
        rData = nextFrom
        pData = nextTo
      }
    }
  }

  await tx.roster.update({
    where: { id: proposer.id },
    data: { playerData: pData as import('@prisma/client').Prisma.InputJsonValue, faabRemaining: pFaab },
  })
  await tx.roster.update({
    where: { id: receiver.id },
    data: { playerData: rData as import('@prisma/client').Prisma.InputJsonValue, faabRemaining: rFaab },
  })
}
