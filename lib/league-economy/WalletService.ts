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
