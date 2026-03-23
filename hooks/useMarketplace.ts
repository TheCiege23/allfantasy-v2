"use client"

import { useEffect, useCallback, useState } from "react"

export interface MarketplaceItemRow {
  itemId: string
  itemName: string
  description: string | null
  price: number
  cosmeticCategory: string
  cosmeticCategoryLabel: string
  sportRestriction: string | null
}

export function useMarketplaceItems(sport: string | null, category: string | null) {
  const [items, setItems] = useState<MarketplaceItemRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (sport) params.set("sport", sport)
      if (category) params.set("cosmeticCategory", category)
      const res = await fetch(`/api/marketplace/items?${params}`, { cache: "no-store" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error ?? "Failed to load items")
        setItems([])
        return
      }
      setItems(data?.items ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load")
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [sport, category])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { items, loading, error, refresh }
}

export interface WalletRow {
  managerId: string
  currencyBalance: number
  earnedLifetime: number
  spentLifetime: number
}

export function useWallet() {
  const [wallet, setWallet] = useState<WalletRow | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/marketplace/wallet", { cache: "no-store" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error ?? "Failed to load wallet")
        setWallet(null)
        return
      }
      setWallet(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load")
      setWallet(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { wallet, loading, error, refresh }
}

export interface InventoryItemRow {
  itemId: string
  itemName: string
  cosmeticCategory: string
  cosmeticCategoryLabel: string
  count: number
}

export function useInventory(includeHistory?: boolean) {
  const [inventory, setInventory] = useState<InventoryItemRow[]>([])
  const [history, setHistory] = useState<{ purchaseId: string; itemName: string; price: number; createdAt: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const url = includeHistory ? "/api/marketplace/inventory?history=1" : "/api/marketplace/inventory"
      const res = await fetch(url, { cache: "no-store" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error ?? "Failed to load inventory")
        setInventory([])
        setHistory([])
        return
      }
      setInventory(data?.inventory ?? [])
      if (includeHistory && data?.history) {
        setHistory(
          data.history.map((h: { createdAt: string }) => ({
            ...h,
            createdAt: typeof h.createdAt === "string" ? h.createdAt : new Date(h.createdAt).toISOString(),
          }))
        )
      } else {
        setHistory([])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load")
      setInventory([])
      setHistory([])
    } finally {
      setLoading(false)
    }
  }, [includeHistory])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { inventory, history, loading, error, refresh }
}

export interface ResolvedCosmeticRow {
  category: string
  itemId: string | null
  itemName: string | null
}

export function useResolvedCosmetics(enabled: boolean) {
  const [cosmetics, setCosmetics] = useState<ResolvedCosmeticRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!enabled) {
      setCosmetics([])
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/marketplace/cosmetics", { cache: "no-store" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error ?? "Failed to load cosmetics")
        setCosmetics([])
        return
      }
      setCosmetics(Array.isArray(data?.cosmetics) ? data.cosmetics : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load cosmetics")
      setCosmetics([])
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { cosmetics, loading, error, refresh }
}
