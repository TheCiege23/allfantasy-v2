'use client'

import { UserPlus } from 'lucide-react'
import type { WaiverDashboardResponse } from '@/app/dashboard/dashboardStripApiTypes'
import { WarRoomCard } from './WarRoomCard'

export function WaiverWirePreview({
  data,
  onOpenAll,
}: {
  data: WaiverDashboardResponse | null
  onOpenAll: () => void
}) {
  const rows = (data?.recommendations ?? []).flatMap((rec) =>
    rec.pickups.slice(0, 2).map((p) => ({ ...p, leagueName: rec.leagueName })),
  )

  if (rows.length === 0) return null

  return (
    <WarRoomCard className="overflow-hidden" accentBorder="rgba(255,255,255,0.08)">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
        <p className="text-[11px] font-bold uppercase tracking-widest text-white/40">Waiver Wire</p>
        <button type="button" onClick={onOpenAll} className="text-[11px] font-semibold text-cyan-300/80 hover:text-cyan-200">
          View all →
        </button>
      </div>
      <ul className="grid gap-px bg-white/[0.03] sm:grid-cols-2">
        {rows.slice(0, 4).map((row) => (
          <li key={`${row.leagueName}-${row.playerId}`} className="flex items-start gap-2.5 bg-[#0a0e1c] px-3 py-2.5">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-300">
              <UserPlus className="h-3 w-3" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[12px] font-semibold text-white/90">
                {row.playerName} <span className="text-white/35">· {row.position}</span>
              </p>
              <p className="truncate text-[10px] text-white/40">{row.addReason}</p>
              <p className="mt-0.5 truncate text-[9px] uppercase tracking-wide text-white/25">{row.leagueName}</p>
            </div>
          </li>
        ))}
      </ul>
    </WarRoomCard>
  )
}
