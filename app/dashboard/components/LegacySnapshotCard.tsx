'use client'

import Link from 'next/link'
import { Trophy } from 'lucide-react'

type LegacySnapshotCardProps = {
  rankPayload: Record<string, unknown> | null | undefined
}

export function LegacySnapshotCard({ rankPayload }: LegacySnapshotCardProps) {
  const rank = rankPayload?.rank ?? rankPayload?.overallRank ?? null
  const tier = rankPayload?.tier ?? rankPayload?.tierLabel ?? rankPayload?.tierName ?? null
  const archetype = rankPayload?.managerArchetype ?? rankPayload?.archetype ?? null
  const xp = rankPayload?.xp ?? rankPayload?.totalXp ?? rankPayload?.xpTotal ?? null

  return (
    <section className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.03] p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-400" />
          <p className="text-[12px] font-bold uppercase tracking-wider text-amber-400/70">
            Legacy Snapshot
          </p>
        </div>
        <Link
          href="/af-rankings"
          className="text-[11px] font-semibold text-amber-400/55 transition hover:text-amber-300"
        >
          Full legacy →
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/30">AF Rank</p>
          <p className="mt-1 text-lg font-black text-amber-300">
            {rank != null ? String(rank) : '—'}
          </p>
        </div>
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/30">Tier</p>
          <p className="mt-1 text-sm font-bold text-white/80">
            {tier != null ? String(tier) : '—'}
          </p>
        </div>
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/30">Archetype</p>
          <p className="mt-1 text-sm font-bold text-violet-300">
            {archetype != null ? String(archetype) : '—'}
          </p>
        </div>
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/30">XP</p>
          <p className="mt-1 text-sm font-bold text-emerald-300">
            {xp != null ? String(xp) : '—'}
          </p>
        </div>
      </div>

      <p className="mt-3 text-[11px] leading-snug text-white/30">
        Import your league history to unlock your full legacy profile — championships, commissioner
        trust, and manager archetype.
      </p>
    </section>
  )
}
