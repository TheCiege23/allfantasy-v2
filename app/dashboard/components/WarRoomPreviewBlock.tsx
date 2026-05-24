'use client'

import Link from 'next/link'
import { Swords } from 'lucide-react'

const SPORT_TILES = [
  { sport: 'NFL', status: 'Active' as const },
  { sport: 'NBA', status: 'Preview' as const },
  { sport: 'MLB', status: 'Preview' as const },
  { sport: 'NHL', status: 'Preview' as const },
  { sport: 'Soccer', status: 'Preview' as const },
]

export function WarRoomPreviewBlock() {
  return (
    <section className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
      <div className="mb-2.5 flex items-center gap-2">
        <Swords className="h-4 w-4 text-cyan-400" />
        <p className="text-[12px] font-bold uppercase tracking-wider text-white/40">AF War Room</p>
      </div>

      <p className="mb-3 max-w-lg text-[13px] leading-snug text-white/60">
        NFL draft intelligence is fully active. More sports are being tuned through the shared AllFantasy engine.
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        {SPORT_TILES.map(({ sport, status }) => (
          <div
            key={sport}
            className={`rounded-lg border px-3 py-1.5 text-[11px] font-semibold ${
              status === 'Active'
                ? 'border-cyan-500/35 bg-cyan-500/10 text-cyan-300'
                : 'border-white/10 bg-white/[0.03] text-white/35'
            }`}
          >
            {sport}
            <span
              className={`ml-1.5 font-normal ${status === 'Active' ? 'text-cyan-400/80' : 'text-white/25'}`}
            >
              · {status}
            </span>
          </div>
        ))}
      </div>

      <Link
        href="/war-room"
        className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/25 bg-cyan-500/10 px-4 py-2 text-xs font-semibold text-cyan-300 transition hover:bg-cyan-500/20"
      >
        <Swords className="h-3.5 w-3.5" />
        Open War Room
      </Link>
    </section>
  )
}
