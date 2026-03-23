/**
 * WalletService — get or create manager wallet; credit/debit balance (used by PurchaseProcessor).
 */

import { prisma } from '@/lib/prisma'
import type { ManagerWalletView } from './types'

export async function getOrCreateWallet(managerId: string): Promise<ManagerWalletView> {
  const w = await prisma.managerWallet.upsert({
    where: { managerId },
    create: { managerId, currencyBalance: 0, earnedLifetime: 0, spentLifetime: 0 },
    update: {},
  })
  return {
    managerId: w.managerId,
    currencyBalance: w.currencyBalance,
    earnedLifetime: w.earnedLifetime,
    spentLifetime: w.spentLifetime,
    updatedAt: w.updatedAt,
  }
}

export async function getWallet(managerId: string): Promise<ManagerWalletView | null> {
  const w = await prisma.managerWallet.findUnique({
    where: { managerId },
  })
  if (!w) return null
  return {
    managerId: w.managerId,
    currencyBalance: w.currencyBalance,
    earnedLifetime: w.earnedLifetime,
    spentLifetime: w.spentLifetime,
    updatedAt: w.updatedAt,
  }
}

/**
 * Compute deterministic cosmetic-currency earnings from existing career systems.
 * This keeps the economy earnable without introducing gameplay advantages.
 */
async function computeCareerEarnedCurrency(managerId: string): Promise<number> {
  const [xp, gm, awards, records, hof] = await Promise.all([
    prisma.managerXPProfile.findUnique({
      where: { managerId },
      select: { totalXP: true },
    }),
    prisma.managerFranchiseProfile.findUnique({
      where: { managerId },
      select: { championshipCount: true },
    }),
    prisma.awardRecord.count({ where: { managerId } }),
    prisma.recordBookEntry.count({ where: { holderId: managerId } }),
    prisma.hallOfFameEntry.count({
      where: { entityType: 'MANAGER', entityId: managerId },
    }),
  ])
  const fromXP = Math.floor((xp?.totalXP ?? 0) / 10)
  const fromTitles = (gm?.championshipCount ?? 0) * 75
  const fromAwards = awards * 20
  const fromRecords = records * 25
  const fromHof = hof * 50
  return fromXP + fromTitles + fromAwards + fromRecords + fromHof
}

/**
 * Sync wallet with deterministic earned currency. Idempotent and monotonic.
 */
export async function syncWalletEarnings(managerId: string): Promise<ManagerWalletView> {
  await getOrCreateWallet(managerId)
  const targetEarned = await computeCareerEarnedCurrency(managerId)
  while (true) {
    const current = await prisma.managerWallet.findUnique({
      where: { managerId },
    })
    if (!current) {
      break
    }
    if (targetEarned <= current.earnedLifetime) {
      return {
        managerId: current.managerId,
        currencyBalance: current.currencyBalance,
        earnedLifetime: current.earnedLifetime,
        spentLifetime: current.spentLifetime,
        updatedAt: current.updatedAt,
      }
    }

    const delta = targetEarned - current.earnedLifetime
    const result = await prisma.managerWallet.updateMany({
      where: {
        managerId,
        earnedLifetime: current.earnedLifetime,
      },
      data: {
        currencyBalance: { increment: delta },
        earnedLifetime: targetEarned,
      },
    })
    if (result.count === 1) break
  }

  const updated = await prisma.managerWallet.findUnique({
    where: { managerId },
  })
  if (!updated) {
    const fallback = await getOrCreateWallet(managerId)
    return fallback
  }
  return {
    managerId: updated.managerId,
    currencyBalance: updated.currencyBalance,
    earnedLifetime: updated.earnedLifetime,
    spentLifetime: updated.spentLifetime,
    updatedAt: updated.updatedAt,
  }
}

/** Credit currency (e.g. from achievements). Returns new balance. */
export async function creditBalance(
  managerId: string,
  amount: number,
  options?: { reason?: string }
): Promise<number> {
  if (amount <= 0) {
    const w = await getOrCreateWallet(managerId)
    return w.currencyBalance
  }
  const w = await prisma.managerWallet.upsert({
    where: { managerId },
    create: {
      managerId,
      currencyBalance: amount,
      earnedLifetime: amount,
      spentLifetime: 0,
    },
    update: {
      currencyBalance: { increment: amount },
      earnedLifetime: { increment: amount },
    },
  })
  return w.currencyBalance
}

/** Debit currency (e.g. purchase). Returns new balance or null if insufficient. */
export async function debitBalance(
  managerId: string,
  amount: number
): Promise<number | null> {
  if (amount <= 0) {
    const w = await getOrCreateWallet(managerId)
    return w.currencyBalance
  }
  const wallet = await prisma.managerWallet.findUnique({
    where: { managerId },
  })
  if (!wallet || wallet.currencyBalance < amount) return null
  const w = await prisma.managerWallet.update({
    where: { managerId },
    data: {
      currencyBalance: { decrement: amount },
      spentLifetime: { increment: amount },
    },
  })
  return w.currencyBalance
}
