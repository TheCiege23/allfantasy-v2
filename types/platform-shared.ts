export type PlatformNotification = {
  id: string
  type: string
  title: string
  body?: string | null
  product: 'shared' | 'app' | 'bracket' | 'legacy'
  severity?: 'low' | 'medium' | 'high'
  read: boolean
  createdAt: string
  meta?: Record<string, unknown>
}

export type PlatformWalletSummary = {
  currency: 'USD'
  balance: number
  pendingBalance: number
  potentialWinnings: number
  totalDeposited: number
  totalEntryFees: number
  totalWithdrawn: number
}

export type PlatformChatThread = {
  id: string
  threadType: 'dm' | 'group' | 'league' | 'bracket_pool' | 'ai'
  productType: 'shared' | 'app' | 'bracket' | 'legacy'
  title: string
  lastMessageAt: string
  unreadCount: number
  memberCount: number
  context?: Record<string, unknown>
}

export type PlatformChatMessage = {
  id: string
  threadId: string
  senderUserId: string | null
  senderName: string
  messageType: string
  body: string
  createdAt: string
  metadata?: Record<string, unknown>
}
