'use client'

import Link from 'next/link'
import { useRightRailData } from '@/hooks/useRightRailData'

export default function SharedRightRail() {
  const { data, loading, error } = useRightRailData()

  return (
    <aside className="space-y-4">
      <section className="mode-panel rounded-2xl p-4">
        <h3 className="text-sm font-semibold mode-text">Notifications</h3>
        {loading ? (
          <p className="mt-2 text-xs mode-muted">Loading...</p>
        ) : data.notifications.length > 0 ? (
          <ul className="mt-2 space-y-2">
            {data.notifications.slice(0, 3).map((n) => (
              <li key={n.id} className="text-xs mode-muted">{n.title}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs mode-muted">No new notifications.</p>
        )}
        <Link
          href="/messages"
          className="mt-3 inline-flex rounded-lg border px-3 py-1.5 text-xs transition"
          style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
        >
          Open Message Center
        </Link>
      </section>

      <section className="mode-panel-soft rounded-2xl p-4" style={{ borderColor: 'color-mix(in srgb, var(--accent-cyan) 40%, var(--border))' }}>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--accent-cyan-strong)' }}>AI Quick Ask</h3>
        {data.aiQuickActions.length > 0 ? (
          <ul className="mt-2 space-y-2">
            {data.aiQuickActions.slice(0, 3).map((q) => (
              <li key={q} className="text-xs mode-muted">{q}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs mode-muted">Ask Chimmy from any product context.</p>
        )}
        <Link
          href="/af-legacy?tab=chat"
          className="mt-3 inline-flex rounded-lg border px-3 py-1.5 text-xs transition"
          style={{ borderColor: 'color-mix(in srgb, var(--accent-cyan) 45%, var(--border))', color: 'var(--accent-cyan-strong)' }}
        >
          Open AI Chat
        </Link>
      </section>

      <section className="mode-panel-soft rounded-2xl p-4" style={{ borderColor: 'color-mix(in srgb, var(--accent-emerald) 40%, var(--border))' }}>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--accent-emerald-strong)' }}>Wallet Summary</h3>
        <div className="mt-2 space-y-1 text-xs mode-muted">
          <div>Balance: ${data.wallet.balance.toFixed(2)}</div>
          <div>Pending: ${data.wallet.pendingBalance.toFixed(2)}</div>
          <div>Winnings: ${data.wallet.potentialWinnings.toFixed(2)}</div>
        </div>
        <Link
          href="/wallet"
          className="mt-3 inline-flex rounded-lg border px-3 py-1.5 text-xs transition"
          style={{ borderColor: 'color-mix(in srgb, var(--accent-emerald) 45%, var(--border))', color: 'var(--accent-emerald-strong)' }}
        >
          Open Wallet
        </Link>
      </section>

      {error && (
        <section className="rounded-2xl border p-3 text-xs" style={{ borderColor: 'color-mix(in srgb, var(--accent-red) 45%, var(--border))', background: 'color-mix(in srgb, var(--accent-red) 12%, transparent)', color: 'var(--accent-red-strong)' }}>
          {error}
        </section>
      )}
    </aside>
  )
}
