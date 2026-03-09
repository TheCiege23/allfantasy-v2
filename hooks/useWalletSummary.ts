'use client'

import { useEffect, useState } from 'react'
import type { PlatformWalletSummary } from '@/types/platform-shared'

const EMPTY_WALLET: PlatformWalletSummary = {
  currency: 'USD',
  balance: 0,
  pendingBalance: 0,
  potentialWinnings: 0,
  totalDeposited: 0,
  totalEntryFees: 0,
  totalWithdrawn: 0,
}

export function useWalletSummary() {
  const [wallet, setWallet] = useState<PlatformWalletSummary>(EMPTY_WALLET)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        const res = await fetch('/api/shared/wallet', { cache: 'no-store' })
        const json = await res.json().catch(() => ({}))
        if (!mounted) return
        setWallet(json?.wallet || EMPTY_WALLET)
        setError(null)
      } catch (err) {
        if (!mounted) return
        setError(err instanceof Error ? err.message : 'Failed to load wallet')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    void load()
    const timer = setInterval(() => void load(), 60_000)
    return () => {
      mounted = false
      clearInterval(timer)
    }
  }, [])

  return { wallet, loading, error }
}
