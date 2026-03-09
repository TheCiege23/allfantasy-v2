import { NextResponse } from 'next/server'
import { resolvePlatformUser } from '@/lib/platform/current-user'
import { getPlatformNotifications } from '@/lib/platform/notification-service'
import { getPlatformWalletSummary } from '@/lib/platform/wallet-service'

const QUICK_ACTIONS = [
  'Should I accept this trade?',
  'Who is my best waiver add this week?',
  'Who should I draft at my next pick?',
]

export async function GET() {
  const user = await resolvePlatformUser()

  if (!user.appUserId) {
    return NextResponse.json({
      status: 'ok',
      notifications: [],
      wallet: {
        currency: 'USD',
        balance: 0,
        pendingBalance: 0,
        potentialWinnings: 0,
        totalDeposited: 0,
        totalEntryFees: 0,
        totalWithdrawn: 0,
      },
      aiQuickActions: QUICK_ACTIONS,
    })
  }

  const [notifications, wallet] = await Promise.all([
    getPlatformNotifications(user.appUserId, 8),
    getPlatformWalletSummary(user.appUserId),
  ])

  return NextResponse.json({
    status: 'ok',
    notifications,
    wallet,
    aiQuickActions: QUICK_ACTIONS,
  })
}
