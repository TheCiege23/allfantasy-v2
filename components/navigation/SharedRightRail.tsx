'use client'

import Link from 'next/link'
import { useRightRailData } from '@/hooks/useRightRailData'

export default function SharedRightRail() {
  const { data, loading, error } = useRightRailData()

  return (
    <aside className="space-y-4">
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <h3 className="text-sm font-semibold text-white">Notifications</h3>
        {loading ? (
          <p className="mt-2 text-xs text-white/50">Loading...</p>
        ) : data.notifications.length > 0 ? (
          <ul className="mt-2 space-y-2">
            {data.notifications.slice(0, 3).map((n) => (
              <li key={n.id} className="text-xs text-white/70">{n.title}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-white/60">No new notifications.</p>
        )}
        <Link href="/messages" className="mt-3 inline-flex rounded-lg border border-white/20 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10">
          Open Message Center
        </Link>
      </section>

      <section className="rounded-2xl border border-cyan-400/20 bg-cyan-500/5 p-4">
        <h3 className="text-sm font-semibold text-cyan-200">AI Quick Ask</h3>
        {data.aiQuickActions.length > 0 ? (
          <ul className="mt-2 space-y-2">
            {data.aiQuickActions.slice(0, 3).map((q) => (
              <li key={q} className="text-xs text-cyan-100/85">{q}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-cyan-100/80">Ask Chimmy from any product context.</p>
        )}
        <Link href="/legacy?tab=chat" className="mt-3 inline-flex rounded-lg border border-cyan-400/40 px-3 py-1.5 text-xs text-cyan-200 hover:bg-cyan-500/20">
          Open AI Chat
        </Link>
      </section>

      <section className="rounded-2xl border border-emerald-400/20 bg-emerald-500/5 p-4">
        <h3 className="text-sm font-semibold text-emerald-200">Wallet Summary</h3>
        <div className="mt-2 space-y-1 text-xs text-emerald-100/85">
          <div>Balance: ${data.wallet.balance.toFixed(2)}</div>
          <div>Pending: ${data.wallet.pendingBalance.toFixed(2)}</div>
          <div>Winnings: ${data.wallet.potentialWinnings.toFixed(2)}</div>
        </div>
        <Link href="/wallet" className="mt-3 inline-flex rounded-lg border border-emerald-400/40 px-3 py-1.5 text-xs text-emerald-200 hover:bg-emerald-500/20">
          Open Wallet
        </Link>
      </section>

      {error && (
        <section className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">{error}</section>
      )}
    </aside>
  )
}
