import { NextRequest, NextResponse } from 'next/server'
import { resolvePlatformUser } from '@/lib/platform/current-user'
import { createWalletLedgerEntry, getPlatformWalletSummary } from '@/lib/platform/wallet-service'

export async function POST(req: NextRequest) {
  const user = await resolvePlatformUser()
  if (!user.appUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const amount = Number(body?.amount || 0)
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'Invalid withdrawal amount' }, { status: 400 })
  }

  const summary = await getPlatformWalletSummary(user.appUserId)
  if (summary.balance < amount) {
    return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 })
  }

  const result = await createWalletLedgerEntry({
    userId: user.appUserId,
    entryType: 'withdrawal',
    amountCents: Math.round(amount * 100),
    status: 'pending',
    description: 'Withdrawal request',
    refProduct: 'shared',
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error || 'Withdrawal failed' }, { status: 500 })
  }

  return NextResponse.json({ status: 'ok', transactionId: result.id, state: 'pending' })
}
