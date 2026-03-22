"use client"

import { Plus, TrendingUp } from "lucide-react"
import { teamLogoUrl } from "@/lib/media-url"

type Props = {
  player: {
    id: string
    name: string
    position: string | null
    team: string | null
  }
  sport?: string | null
  onAddClick: () => void
  alreadyClaimed?: boolean
  trendScore?: number
}

export default function WaiverPlayerRow({ player, sport, onAddClick, alreadyClaimed, trendScore }: Props) {
  const pos = player.position || "—"
  const team = player.team || "FA"
  const trend = typeof trendScore === "number" ? trendScore : 0
  const logo = player.team ? teamLogoUrl(player.team, sport ?? 'NFL') : ''

  return (
    <li className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm sm:px-4">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-500/15 text-xs font-semibold text-cyan-100">
          {pos}
        </div>
        {logo ? (
          <img
            src={logo}
            alt={`${team} logo`}
            data-testid={`waiver-player-team-logo-${player.id}`}
            className="h-7 w-7 rounded object-contain"
            loading="lazy"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1 text-white">
            <span className="truncate font-medium">{player.name}</span>
            <span className="text-xs text-white/60">· {team}</span>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-white/55">
            <span className="inline-flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-emerald-300" />
              <span>Trend: {trend > 0 ? `+${trend}` : 'neutral'}</span>
            </span>
            <span className="text-white/40">Waiver activity score</span>
          </div>
        </div>
      </div>
      {alreadyClaimed ? (
        <span className="inline-flex items-center rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-200">
          Already claimed
        </span>
      ) : (
        <button
          type="button"
          onClick={onAddClick}
          data-testid={`waiver-claim-open-${player.id}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/50 bg-cyan-500/15 px-3 py-1.5 text-xs font-medium text-cyan-100 hover:bg-cyan-500/25"
        >
          <Plus className="h-3.5 w-3.5" />
          Claim
        </button>
      )}
    </li>
  )
}

