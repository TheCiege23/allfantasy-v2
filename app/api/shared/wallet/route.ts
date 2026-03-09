import { NextResponse } from 'next/server'
import { resolvePlatformUser } from '@/lib/platform/current-user'
import { getPlatformWalletSummary } from '@/lib/platform/wallet-service'

export async function GET() {
  const user = await resolvePlatformUser()
  if (!user.appUserId) {
    return NextResponse.json({
      status: 'ok',
      wallet: {
        currency: 'USD',
        balance: 0,
        pendingBalance: 0,
        potentialWinnings: 0,
        totalDeposited: 0,
        totalEntryFees: 0,
        totalWithdrawn: 0,
      },
    })
  }

  const wallet = await getPlatformWalletSummary(user.appUserId)
  return NextResponse.json({ status: 'ok', wallet })
}
