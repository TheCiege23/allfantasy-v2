import { prisma } from '@/lib/prisma'
import { getSurvivorConfig } from './SurvivorLeagueConfig'
import { appendSurvivorAudit } from './SurvivorAuditLog'
import type { IdolPowerType } from './types'

export type IdolPlayResult = { ok: true; message: string } | { ok: false; error: string }

const DEFAULT_POOL: IdolPowerType[] = ['protect_self', 'extra_vote', 'vote_nullifier']

export async function seedIdolsAfterDraft(
  leagueId: string,
  assignmentMode: 'random' | 'weighted' | 'manual',
): Promise<void> {
  const config = await getSurvivorConfig(leagueId)
  if (!config) throw new Error('Survivor config not found')

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { survivorIdolCount: true },
  })
  const count = league?.survivorIdolCount ?? config.idolCount
  const rosters = await prisma.roster.findMany({ where: { leagueId }, select: { id: true } })
  const pool =
    (config.idolPowerPool as string[] | null)?.length ?
      (config.idolPowerPool as IdolPowerType[])
    : DEFAULT_POOL

  let i = 0
  for (const r of rosters) {
    if (i >= count) break
    const powerType = pool[i % pool.length]!
    const playerId = `bound_${r.id}`
    await prisma.survivorIdol.create({
      data: {
        leagueId,
        configId: config.configId,
        rosterId: r.id,
        playerId,
        powerType,
        powerLabel: powerType.replace(/_/g, ' '),
        status: 'hidden',
      },
    })
    await appendSurvivorAudit(leagueId, config.configId, 'idol_assigned', {
      rosterId: r.id,
      powerType,
      mode: assignmentMode,
    })
    i++
  }
}

export async function playIdol(
  idolId: string,
  playingUserId: string,
  councilId: string,
  protectedUserId?: string,
): Promise<IdolPlayResult> {
  const council = await prisma.survivorTribalCouncil.findUnique({ where: { id: councilId } })
  if (!council || council.status !== 'voting_open') {
    return { ok: false, error: 'Idol play window has closed.' }
  }
  const idol = await prisma.survivorIdol.findFirst({ where: { id: idolId, leagueId: council.leagueId } })
  if (!idol || idol.status !== 'hidden') return { ok: false, error: 'Invalid idol' }

  await prisma.survivorIdol.update({
    where: { id: idolId },
    data: {
      status: 'used',
      usedAt: new Date(),
      usedAtCouncilId: councilId,
      currentOwnerUserId: playingUserId,
    },
  })

  const prev = Array.isArray(council.idolsPlayed) ? (council.idolsPlayed as object[]) : []
  await prisma.survivorTribalCouncil.update({
    where: { id: councilId },
    data: {
      idolsPlayed: [...prev, { userId: playingUserId, idolId, protectedUserId }] as object,
    },
  })

  const cfg = await getSurvivorConfig(council.leagueId)
  if (cfg) {
    await appendSurvivorAudit(council.leagueId, cfg.configId, 'idol_used', { idolId, councilId })
  }

  return { ok: true, message: 'Your idol has been registered.' }
}

export async function transferIdol(
  idolId: string,
  fromUserId: string,
  toUserId: string,
  reason: string,
): Promise<void> {
  const idol = await prisma.survivorIdol.findUnique({ where: { id: idolId } })
  if (!idol) throw new Error('Idol not found')
  if (idol.currentOwnerUserId && idol.currentOwnerUserId !== fromUserId) {
    throw new Error('Not your idol')
  }
  const league = await prisma.league.findUnique({
    where: { id: idol.leagueId },
    select: { survivorIdolsTradable: true },
  })
  if (!idol.isTradable && !league?.survivorIdolsTradable) throw new Error('Idol is not tradable')

  const history = (Array.isArray(idol.transferHistory) ? idol.transferHistory : []) as object[]
  await prisma.survivorIdol.update({
    where: { id: idolId },
    data: {
      currentOwnerUserId: toUserId,
      transferHistory: [...history, { fromUserId, toUserId, reason, transferredAt: new Date() }] as object,
    },
  })
  const cfg = await getSurvivorConfig(idol.leagueId)
  if (cfg) await appendSurvivorAudit(idol.leagueId, cfg.configId, 'idol_transferred', { idolId, toUserId })
}

export async function expireIdolsAtMerge(leagueId: string): Promise<void> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { survivorIdolConvertRule: true, survivorIdolsExpireAtMerge: true },
  })
  if (league?.survivorIdolsExpireAtMerge === false) return

  const idols = await prisma.survivorIdol.findMany({
    where: { leagueId, expiresAtMerge: true, status: 'hidden' },
  })
  const rule = league?.survivorIdolConvertRule ?? 'faab'
  for (const id of idols) {
    await prisma.survivorIdol.update({
      where: { id: id.id },
      data: { status: 'expired', expiredAt: new Date() },
    })
    if (rule === 'faab' && id.rosterId) {
      const rr = await prisma.redraftRoster.findFirst({ where: { id: id.rosterId } })
      if (rr) {
        await prisma.redraftRoster.update({
          where: { id: rr.id },
          data: { faabBalance: { increment: 5 } },
        })
      }
    }
  }
}
