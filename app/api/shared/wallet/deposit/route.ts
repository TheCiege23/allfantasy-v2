import { NextRequest, NextResponse } from 'next/server'
import { resolvePlatformUser } from '@/lib/platform/current-user'
import { createWalletLedgerEntry } from '@/lib/platform/wallet-service'

export async function POST(req: NextRequest) {
  const user = await resolvePlatformUser()
  if (!user.appUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const amount = Number(body?.amount || 0)
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'Invalid deposit amount' }, { status: 400 })
  }

  const result = await createWalletLedgerEntry({
    userId: user.appUserId,
    entryType: 'deposit',
    amountCents: Math.round(amount * 100),
    status: 'completed',
    description: 'Manual deposit',
    refProduct: 'shared',
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error || 'Deposit failed' }, { status: 500 })
  }

  return NextResponse.json({ status: 'ok', transactionId: result.id })
}
