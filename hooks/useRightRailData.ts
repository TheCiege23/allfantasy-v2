'use client'

import { useMemo } from 'react'
import { useNotifications } from '@/hooks/useNotifications'
import { useWalletSummary } from '@/hooks/useWalletSummary'
import { useQuickAI } from '@/hooks/useQuickAI'

type RightRailNotification = {
  id: string
  title: string
  type: string
  createdAt: string
}

type RightRailData = {
  notifications: RightRailNotification[]
  wallet: {
    balance: number
    pendingBalance: number
    potentialWinnings: number
  }
  aiQuickActions: string[]
}

const EMPTY: RightRailData = {
  notifications: [],
  wallet: { balance: 0, pendingBalance: 0, potentialWinnings: 0 },
  aiQuickActions: [],
}

export function useRightRailData() {
  const notificationsState = useNotifications(8)
  const walletState = useWalletSummary()
  const quickAIState = useQuickAI()

  const data = useMemo<RightRailData>(() => {
    return {
      notifications: notificationsState.notifications.map((n) => ({
        id: n.id,
        title: n.title,
        type: n.type,
        createdAt: n.createdAt,
      })),
      wallet: {
        balance: Number(walletState.wallet.balance || 0),
        pendingBalance: Number(walletState.wallet.pendingBalance || 0),
        potentialWinnings: Number(walletState.wallet.potentialWinnings || 0),
      },
      aiQuickActions: quickAIState.aiQuickActions,
    }
  }, [notificationsState.notifications, walletState.wallet, quickAIState.aiQuickActions])

  return {
    data: data || EMPTY,
    loading: notificationsState.loading || walletState.loading || quickAIState.loading,
    error: notificationsState.error || walletState.error || quickAIState.error,
  }
}
