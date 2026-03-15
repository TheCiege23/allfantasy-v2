"use client"

import { useCallback, useState } from "react"
import { useMarketplaceItems, useWallet, useInventory } from "@/hooks/useMarketplace"
import type { LeagueTabProps } from "@/components/app/tabs/types"
import { ShoppingBag, Coins, Package, RefreshCw } from "lucide-react"
import { COSMETIC_CATEGORIES, COSMETIC_CATEGORY_LABELS } from "@/lib/league-economy/types"
import { SUPPORTED_SPORTS } from "@/lib/sport-scope"

export default function StoreTab({ leagueId: _leagueId }: LeagueTabProps) {
  const [sportFilter, setSportFilter] = useState<string>("")
  const [categoryFilter, setCategoryFilter] = useState<string>("")
  const [confirmPurchase, setConfirmPurchase] = useState<{ itemId: string; itemName: string; price: number } | null>(null)
  const [purchaseLoading, setPurchaseLoading] = useState(false)
  const [purchaseError, setPurchaseError] = useState<string | null>(null)
  const [seedLoading, setSeedLoading] = useState(false)
  const [activeSection, setActiveSection] = useState<"store" | "inventory">("store")

  const { wallet, loading: walletLoading, refresh: refreshWallet } = useWallet()
  const { items, loading: itemsLoading, error: itemsError, refresh: refreshItems } = useMarketplaceItems(
    sportFilter || null,
    categoryFilter || null
  )
  const { inventory, loading: inventoryLoading, refresh: refreshInventory } = useInventory(true)

  const refreshAll = useCallback(() => {
    refreshWallet()
    refreshItems()
    refreshInventory()
  }, [refreshWallet, refreshItems, refreshInventory])

  const handlePurchase = useCallback(
    (itemId: string, itemName: string, price: number) => {
      setConfirmPurchase({ itemId, itemName, price })
      setPurchaseError(null)
    },
    []
  )

  const confirmPurchaseSubmit = useCallback(async () => {
    if (!confirmPurchase) return
    setPurchaseLoading(true)
    setPurchaseError(null)
    try {
      const res = await fetch("/api/marketplace/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: confirmPurchase.itemId, sport: sportFilter || undefined }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.success) {
        setPurchaseError(data?.error ?? "Purchase failed")
        return
      }
      setConfirmPurchase(null)
      refreshAll()
    } catch {
      setPurchaseError("Purchase failed")
    } finally {
      setPurchaseLoading(false)
    }
  }, [confirmPurchase, sportFilter, refreshAll])

  const runSeed = useCallback(() => {
    setSeedLoading(true)
    fetch("/api/marketplace/seed", { method: "POST" })
      .then(() => refreshItems())
      .finally(() => setSeedLoading(false))
  }, [refreshItems])

  return (
    <div className="space-y-4 p-4">
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-emerald-400" />
            <div>
              <h2 className="text-lg font-bold text-white">League Marketplace</h2>
              <p className="text-xs text-white/60">
                Cosmetic only — team upgrades, frames, trophies, skins. Never affects competitive balance.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-xl bg-zinc-800 px-3 py-2 text-sm">
              <Coins className="h-4 w-4 text-amber-400" />
              <span className="font-mono text-amber-300">{walletLoading ? "…" : (wallet?.currencyBalance ?? 0)}</span>
            </div>
            <button
              type="button"
              className="rounded-xl bg-zinc-700 text-white px-3 py-2 text-sm disabled:opacity-60"
              disabled={walletLoading || itemsLoading || inventoryLoading}
              onClick={refreshAll}
            >
              <RefreshCw className={`h-4 w-4 inline ${itemsLoading ? "animate-spin" : ""}`} /> Refresh
            </button>
            <button
              type="button"
              className="rounded-xl bg-zinc-600 text-white px-3 py-2 text-sm disabled:opacity-60"
              disabled={seedLoading}
              onClick={runSeed}
            >
              {seedLoading ? "…" : "Seed store"}
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          className={`rounded-lg px-3 py-1.5 text-sm ${activeSection === "store" ? "bg-emerald-600 text-white" : "bg-zinc-800 text-white/70"}`}
          onClick={() => setActiveSection("store")}
        >
          Store
        </button>
        <button
          type="button"
          className={`rounded-lg px-3 py-1.5 text-sm ${activeSection === "inventory" ? "bg-emerald-600 text-white" : "bg-zinc-800 text-white/70"}`}
          onClick={() => setActiveSection("inventory")}
        >
          Inventory
        </button>
      </div>

      {activeSection === "store" && (
        <>
          <div className="flex flex-wrap gap-2">
            <select
              className="rounded-lg bg-zinc-950 border border-zinc-800 px-2 py-1.5 text-sm"
              value={sportFilter}
              onChange={(e) => setSportFilter(e.target.value)}
            >
              <option value="">All sports</option>
              {SUPPORTED_SPORTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              className="rounded-lg bg-zinc-950 border border-zinc-800 px-2 py-1.5 text-sm"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">All categories</option>
              {COSMETIC_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {COSMETIC_CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
          {itemsError && (
            <div className="rounded-xl bg-red-900/20 border border-red-500/30 p-3 text-sm text-red-200">
              {itemsError}
            </div>
          )}
          {itemsLoading && <div className="text-sm text-white/50">Loading store…</div>}
          {!itemsLoading && items.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <div
                  key={item.itemId}
                  className="rounded-xl border border-zinc-800 bg-zinc-950 p-3"
                >
                  <div className="font-medium text-white">{item.itemName}</div>
                  <div className="text-xs text-zinc-400">{item.cosmeticCategoryLabel}</div>
                  {item.description && (
                    <p className="mt-1 text-xs text-zinc-500">{item.description}</p>
                  )}
                  <div className="mt-2 flex items-center justify-between">
                    <span className="font-mono text-amber-400">{item.price} pts</span>
                    <button
                      type="button"
                      className="rounded-lg bg-emerald-600 px-2 py-1 text-xs text-white hover:bg-emerald-500 disabled:opacity-50"
                      disabled={(wallet?.currencyBalance ?? 0) < item.price}
                      onClick={() => handlePurchase(item.itemId, item.itemName, item.price)}
                    >
                      Buy
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {!itemsLoading && items.length === 0 && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center text-sm text-white/60">
              No items yet. Click &quot;Seed store&quot; to add default cosmetic items.
            </div>
          )}
        </>
      )}

      {activeSection === "inventory" && (
        <>
          <p className="text-xs text-white/50">
            Cosmetics apply to your profile and team display only. They never affect competitive balance.
          </p>
          {inventoryLoading && <div className="text-sm text-white/50">Loading inventory…</div>}
          {!inventoryLoading && inventory.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-white/80">Your items</h3>
              <div className="space-y-1">
                {inventory.map((inv) => (
                  <div
                    key={inv.itemId}
                    className="flex flex-wrap items-center justify-between rounded-lg bg-zinc-900/50 px-3 py-2 text-sm"
                  >
                    <span className="text-white">{inv.itemName}</span>
                    <span className="text-zinc-400">{inv.cosmeticCategoryLabel} × {inv.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {!inventoryLoading && inventory.length === 0 && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center text-sm text-white/60">
              No items in inventory. Buy cosmetics from the Store.
            </div>
          )}
        </>
      )}

      {confirmPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-700 bg-zinc-900 p-4 shadow-xl">
            <h3 className="font-semibold text-white">Confirm purchase</h3>
            <p className="mt-2 text-sm text-zinc-300">
              Buy &quot;{confirmPurchase.itemName}&quot; for <span className="font-mono text-amber-400">{confirmPurchase.price} pts</span>?
            </p>
            {purchaseError && (
              <p className="mt-2 text-sm text-red-400">{purchaseError}</p>
            )}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-lg bg-zinc-700 py-2 text-sm text-white hover:bg-zinc-600"
                onClick={() => { setConfirmPurchase(null); setPurchaseError(null) }}
                disabled={purchaseLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="flex-1 rounded-lg bg-emerald-600 py-2 text-sm text-white hover:bg-emerald-500 disabled:opacity-50"
                onClick={confirmPurchaseSubmit}
                disabled={purchaseLoading}
              >
                {purchaseLoading ? "…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
