'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { buildSurvivorNotifications } from '@/lib/survivor/notifications'
import type { SurvivorSeasonPayload } from '@/lib/survivor/survivorUiTypes'

export function NotificationBell({
  leagueId,
  season,
}: {
  leagueId: string
  season: SurvivorSeasonPayload | null
}) {
  const [open, setOpen] = useState(false)
  const items = useMemo(() => buildSurvivorNotifications(leagueId, season), [leagueId, season])

  return (
    <div className="relative">
      <button
        type="button"
        className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-lg text-white/80"
        aria-label={`Notifications${items.length ? `, ${items.length} items` : ''}`}
        onClick={() => setOpen((v) => !v)}
      >
        🔔
        {items.length ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {items.length > 9 ? '9+' : items.length}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 top-12 z-50 w-[min(92vw,320px)] rounded-xl border border-white/10 bg-[var(--survivor-panel)] shadow-2xl">
          <div className="max-h-80 overflow-y-auto p-2">
            {items.length === 0 ? (
              <p className="px-2 py-4 text-center text-[12px] text-white/45">No alerts right now.</p>
            ) : (
              items.map((n) => (
                <Link
                  key={n.id}
                  href={n.href ?? `#`}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-2 py-2 hover:bg-white/[0.05]"
                >
                  <div className="flex gap-2">
                    <span className="text-lg">{n.icon}</span>
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold text-white">{n.title}</p>
                      <p className="text-[11px] text-white/50">{n.body}</p>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
