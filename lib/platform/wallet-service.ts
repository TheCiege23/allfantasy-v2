import { prisma } from '@/lib/prisma'
import type { PlatformWalletSummary } from '@/types/platform-shared'

function toUsd(cents: number): number {
  return Number((cents / 100).toFixed(2))
}

async function getOrCreateWalletAccount(userId: string): Promise<{ id: string; balanceCents: number; pendingBalanceCents: number } | null> {
  try {
    const existing = await (prisma as any).platformWalletAccount.findUnique({
      where: { userId },
      select: { id: true, balanceCents: true, pendingBalanceCents: true },
    })

    if (existing) return existing

    return await (prisma as any).platformWalletAccount.create({
      data: { userId, currency: 'USD' },
      select: { id: true, balanceCents: true, pendingBalanceCents: true },
    })
  } catch {
    return null
  }
}

async function getWalletSummaryFromLedger(userId: string): Promise<PlatformWalletSummary | null> {
  const account = await getOrCreateWalletAccount(userId)
  if (!account) return null

  const rows = await (prisma as any).walletLedgerEntry
    .findMany({
      where: { userId },
      select: { amountCents: true, entryType: true, status: true },
      orderBy: { createdAt: 'desc' },
      take: 2000,
    })
    .catch(() => null)

  if (!rows) return null

  let deposited = 0
  let entryFees = 0
  let withdrawn = 0
  let pending = 0
  let potential = 0

  for (const row of rows) {
    const amount = Number(row.amountCents || 0)
    const entryType = String(row.entryType || '').toLowerCase()
    const status = String(row.status || '').toLowerCase()
    const isCompleted = status === 'completed'

    if (!isCompleted) {
      pending += amount
      if (entryType === 'payout' || entryType === 'winnings') potential += amount
      continue
    }

    if (entryType === 'deposit') deposited += amount
    else if (entryType === 'entry_fee' || entryType === 'dues') entryFees += amount
    else if (entryType === 'withdrawal' || entryType === 'payout') withdrawn += amount
  }

  return {
    currency: 'USD',
    balance: toUsd(Number(account.balanceCents || 0)),
    pendingBalance: toUsd(Number(account.pendingBalanceCents || 0)),
    potentialWinnings: toUsd(potential),
    totalDeposited: toUsd(deposited),
    totalEntryFees: toUsd(entryFees),
    totalWithdrawn: toUsd(withdrawn),
  }
}

async function getWalletSummaryFallback(userId: string): Promise<PlatformWalletSummary> {
  const rows = await (prisma as any).bracketPayment
    .findMany({
      where: { userId },
      select: { amountCents: true, status: true, paymentType: true },
      orderBy: { createdAt: 'desc' },
      take: 500,
    })
    .catch(() => [])

  let deposited = 0
  let entryFees = 0
  let withdrawn = 0
  let pending = 0
  let potential = 0

  for (const row of rows) {
    const amount = Number(row.amountCents || 0)
    const status = String(row.status || '').toLowerCase()
    const type = String(row.paymentType || '').toLowerCase()
    const isCompleted = status === 'completed'

    if (!isCompleted) {
      pending += amount
      if (type.includes('payout') || type.includes('winning') || type.includes('prize')) potential += amount
      continue
    }

    if (type.includes('payout') || type.includes('withdraw')) withdrawn += amount
    else if (type.includes('entry') || type.includes('dues') || type.includes('buyin')) entryFees += amount
    else deposited += amount
  }

  const balance = deposited - entryFees - withdrawn

  return {
    currency: 'USD',
    balance: toUsd(balance),
    pendingBalance: toUsd(pending),
    potentialWinnings: toUsd(potential),
    totalDeposited: toUsd(deposited),
    totalEntryFees: toUsd(entryFees),
    totalWithdrawn: toUsd(withdrawn),
  }
}

export async function getPlatformWalletSummary(appUserId: string): Promise<PlatformWalletSummary> {
  const fromLedger = await getWalletSummaryFromLedger(appUserId)
  if (fromLedger) return fromLedger
  return getWalletSummaryFallback(appUserId)
}

export async function createWalletLedgerEntry(params: {
  userId: string
  entryType: 'deposit' | 'withdrawal' | 'entry_fee' | 'payout' | 'adjustment' | 'dues'
  amountCents: number
  status?: 'pending' | 'completed' | 'failed'
  description?: string
  refProduct?: string
  refId?: string
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const status = params.status || 'completed'
  const amountCents = Math.trunc(params.amountCents)
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    return { ok: false, error: 'Invalid amountCents' }
  }

  try {
    const account = await getOrCreateWalletAccount(params.userId)
    if (!account) return { ok: false, error: 'Wallet account unavailable' }

    const updateDelta =
      params.entryType === 'deposit' || params.entryType === 'payout' || params.entryType === 'adjustment'
        ? amountCents
        : -amountCents

    const created = await (prisma as any).$transaction(async (tx: any) => {
      const ledger = await tx.walletLedgerEntry.create({
        data: {
          walletAccountId: account.id,
          userId: params.userId,
          entryType: params.entryType,
          status,
          amountCents,
          description: params.description || null,
          refProduct: params.refProduct || null,
          refId: params.refId || null,
          effectiveAt: status === 'completed' ? new Date() : null,
        },
        select: { id: true },
      })

      if (status === 'completed') {
        await tx.platformWalletAccount.update({
          where: { id: account.id },
          data: {
            balanceCents: { increment: updateDelta },
          },
        })
      } else {
        await tx.platformWalletAccount.update({
          where: { id: account.id },
          data: {
            pendingBalanceCents: { increment: amountCents },
          },
        })
      }

      return ledger
    })

    return { ok: true, id: created.id }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Wallet ledger write failed' }
  }
}
