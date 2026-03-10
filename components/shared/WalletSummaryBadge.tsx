"use client"

import { useWalletSummary } from "@/hooks/useWalletSummary"

export default function WalletSummaryBadge() {
  const { wallet } = useWalletSummary()
  return (
    <div
      className="hidden rounded-lg border px-2.5 py-1.5 text-xs sm:block"
      style={{
        borderColor: "color-mix(in srgb, var(--accent-emerald) 40%, var(--border))",
        background: "color-mix(in srgb, var(--accent-emerald) 14%, transparent)",
        color: "var(--accent-emerald-strong)",
      }}
    >
      Bal: ${Number(wallet.balance || 0).toFixed(2)}
    </div>
  )
}
