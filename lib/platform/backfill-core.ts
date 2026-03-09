import { prisma } from '@/lib/prisma'

type BackfillResult = {
  notificationsInserted: number
  walletEntriesInserted: number
  walletAccountsTouched: number
  skipped: string[]
}

function normalizeLedgerType(paymentType: string): 'deposit' | 'entry_fee' | 'withdrawal' | 'payout' | 'dues' {
  const type = paymentType.toLowerCase()
  if (type.includes('entry') || type.includes('buyin')) return 'entry_fee'
  if (type.includes('dues')) return 'dues'
  if (type.includes('withdraw')) return 'withdrawal'
  if (type.includes('payout') || type.includes('winning') || type.includes('prize')) return 'payout'
  return 'deposit'
}

function normalizeStatus(status: string): 'pending' | 'completed' | 'failed' {
  const s = status.toLowerCase()
  if (s === 'completed' || s === 'succeeded' || s === 'success') return 'completed'
  if (s === 'failed' || s === 'canceled' || s === 'cancelled') return 'failed'
  return 'pending'
}

async function tableExists(tableName: string): Promise<boolean> {
  try {
    const result = await (prisma as any).$queryRawUnsafe(
      'SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2) as "exists"',
      'public',
      tableName,
    )

    const row = Array.isArray(result) ? result[0] : null
    return Boolean((row as any)?.exists)
  } catch {
    return false
  }
}

export async function runPlatformCoreBackfill(limitPerModel = 5000): Promise<BackfillResult> {
  let notificationsInserted = 0
  let walletEntriesInserted = 0
  let walletAccountsTouched = 0
  const skipped: string[] = []

  const hasNotificationTable = await tableExists('platform_notifications')
  const hasWalletTables = (await tableExists('platform_wallet_accounts')) && (await tableExists('wallet_ledger_entries'))

  if (!hasNotificationTable) skipped.push('platform_notifications table missing (apply migration first)')
  if (!hasWalletTables) skipped.push('wallet ledger tables missing (apply migration first)')

  if (hasNotificationTable) {
    const tradeRows = await (prisma as any).tradeNotification
      .findMany({
        orderBy: { createdAt: 'asc' },
        take: limitPerModel,
        select: {
          id: true,
          userId: true,
          type: true,
          status: true,
          aiVerdict: true,
          leagueId: true,
          sleeperLeagueId: true,
          createdAt: true,
          seenAt: true,
        },
      })
      .catch(() => [])

    if (tradeRows.length > 0) {
      const payload = tradeRows.map((row: any) => ({
        sourceKey: `trade_notification:${row.id}`,
        userId: row.userId,
        productType: 'legacy',
        type: row.type || 'trade',
        title: row.aiVerdict ? `Trade Alert: ${row.aiVerdict}` : 'Trade Alert',
        body: row.status ? `Status: ${row.status}` : null,
        severity: row.status === 'pending' ? 'medium' : 'low',
        meta: {
          leagueId: row.leagueId || null,
          sleeperLeagueId: row.sleeperLeagueId || null,
        },
        createdAt: row.createdAt,
        readAt: row.seenAt || null,
      }))

      const created = await (prisma as any).platformNotification
        .createMany({ data: payload, skipDuplicates: true })
        .catch(() => ({ count: 0 }))

      notificationsInserted += Number(created.count || 0)
    }

    const globalRecipients = await (prisma as any).bracketLeagueMember
      .findMany({
        distinct: ['userId'],
        select: { userId: true },
        take: limitPerModel,
      })
      .catch(() => [])

    const leagueEvents = await (prisma as any).bracketFeedEvent
      .findMany({
        orderBy: { createdAt: 'asc' },
        take: limitPerModel,
        select: {
          id: true,
          leagueId: true,
          tournamentId: true,
          eventType: true,
          headline: true,
          detail: true,
          metadata: true,
          createdAt: true,
        },
      })
      .catch(() => [])

    for (const event of leagueEvents) {
      let recipientUserIds: string[] = []

      if (event.leagueId) {
        const members = await (prisma as any).bracketLeagueMember
          .findMany({
            where: { leagueId: event.leagueId },
            select: { userId: true },
            take: limitPerModel,
          })
          .catch(() => [])
        recipientUserIds = members.map((m: any) => m.userId)
      } else {
        recipientUserIds = globalRecipients.map((m: any) => m.userId)
      }

      if (recipientUserIds.length === 0) continue

      const eventPayload = recipientUserIds.map((userId) => ({
        sourceKey: `bracket_feed:${event.id}:user:${userId}`,
        userId,
        productType: 'bracket',
        type: event.eventType || 'bracket_event',
        title: event.headline || 'Bracket update',
        body: event.detail || null,
        severity: event.eventType === 'breaking_news' ? 'high' : 'low',
        meta: {
          leagueId: event.leagueId || null,
          tournamentId: event.tournamentId || null,
          metadata: event.metadata || null,
        },
        createdAt: event.createdAt,
        readAt: null,
      }))

      const inserted = await (prisma as any).platformNotification
        .createMany({ data: eventPayload, skipDuplicates: true })
        .catch(() => ({ count: 0 }))

      notificationsInserted += Number(inserted.count || 0)
    }
  }

  if (hasWalletTables) {
    const payments = await (prisma as any).bracketPayment
      .findMany({
        orderBy: { createdAt: 'asc' },
        take: limitPerModel,
        select: {
          id: true,
          userId: true,
          amountCents: true,
          paymentType: true,
          status: true,
          createdAt: true,
          completedAt: true,
        },
      })
      .catch(() => [])

    const userIds = Array.from(new Set(payments.map((p: any) => p.userId).filter(Boolean)))

    for (const userId of userIds) {
      const account = await (prisma as any).platformWalletAccount
        .upsert({
          where: { userId },
          create: { userId, currency: 'USD' },
          update: {},
          select: { id: true },
        })
        .catch(() => null)

      if (!account?.id) continue
      walletAccountsTouched += 1

      const userPayments = payments.filter((p: any) => p.userId === userId)
      if (userPayments.length === 0) continue

      const ledgerPayload = userPayments.map((p: any) => ({
        sourceKey: `bracket_payment:${p.id}`,
        walletAccountId: account.id,
        userId,
        entryType: normalizeLedgerType(String(p.paymentType || 'deposit')),
        status: normalizeStatus(String(p.status || 'pending')),
        amountCents: Math.abs(Number(p.amountCents || 0)),
        description: `Backfill from bracketPayment ${p.id}`,
        refProduct: 'bracket',
        refId: p.id,
        createdAt: p.createdAt,
        effectiveAt: p.completedAt || null,
      }))

      const inserted = await (prisma as any).walletLedgerEntry
        .createMany({ data: ledgerPayload, skipDuplicates: true })
        .catch(() => ({ count: 0 }))

      walletEntriesInserted += Number(inserted.count || 0)

      const ledgerRows = await (prisma as any).walletLedgerEntry
        .findMany({
          where: { userId },
          select: { amountCents: true, entryType: true, status: true },
        })
        .catch(() => [])

      let balanceCents = 0
      let pendingCents = 0

      for (const row of ledgerRows) {
        const amount = Number(row.amountCents || 0)
        const entryType = String(row.entryType || '').toLowerCase()
        const status = String(row.status || '').toLowerCase()
        const isPending = status !== 'completed'
        const signed = entryType === 'entry_fee' || entryType === 'withdrawal' || entryType === 'dues' ? -amount : amount

        if (isPending) pendingCents += amount
        else balanceCents += signed
      }

      await (prisma as any).platformWalletAccount
        .update({
          where: { id: account.id },
          data: {
            balanceCents,
            pendingBalanceCents: pendingCents,
          },
        })
        .catch(() => null)
    }
  }

  return {
    notificationsInserted,
    walletEntriesInserted,
    walletAccountsTouched,
    skipped,
  }
}
