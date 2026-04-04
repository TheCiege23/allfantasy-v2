'use client'

import { PlayerImage } from '@/app/components/PlayerImage'
import type { PlayerMap } from '@/lib/hooks/useSleeperPlayers'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { mockIdpPoints, mockStatPills, idpRoleLabel } from './idpPositionUtils'

export type IDPPlayerModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  playerId: string
  name: string
  position: string
  team?: string | null
  sport: string
  week: number
  players: PlayerMap
}

export function IDPPlayerModal({
  open,
  onOpenChange,
  playerId,
  name,
  position,
  team,
  sport,
  week,
  players,
}: IDPPlayerModalProps) {
  const p = players[playerId]
  const stats = mockStatPills(playerId)
  const { pts, proj } = mockIdpPoints(playerId, week)
  const role = idpRoleLabel(playerId)
  const matchup: 'Favorable' | 'Average' | 'Tough' =
    playerId.length % 3 === 0 ? 'Favorable' : playerId.length % 3 === 1 ? 'Average' : 'Tough'
  const matchupClass =
    matchup === 'Favorable'
      ? 'text-emerald-300'
      : matchup === 'Tough'
        ? 'text-red-300'
        : 'text-white/50'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border border-[color:var(--idp-border)] bg-[color:var(--idp-panel)] text-white sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-start gap-3 pr-8 text-left text-base">
            <PlayerImage
              sleeperId={playerId}
              sport={sport}
              name={name}
              position={position}
              espnId={p?.espn_id}
              nbaId={p?.nba_id}
              size={48}
              variant="round"
            />
            <div className="min-w-0">
              <p className="truncate font-bold">{name}</p>
              <p className="text-sm font-normal text-white/55">
                {team ?? '—'} · {position}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <section className="space-y-2 border-t border-white/[0.06] pt-3">
          <h4 className="text-[11px] font-bold uppercase tracking-wide text-white/40">This week</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {Object.entries(stats).map(([k, v]) => (
              <div
                key={k}
                className="flex justify-between rounded-md border border-white/[0.06] bg-black/20 px-2 py-1.5"
              >
                <span className="text-white/50">{k}</span>
                <span className="font-semibold">{String(v)}</span>
              </div>
            ))}
          </div>
          <p className="text-sm">
            <span className="text-white/45">IDP points:</span>{' '}
            <span className="font-bold text-[color:var(--idp-defense)]">{pts}</span>{' '}
            <span className="text-white/35">proj {proj}</span>
          </p>
          <p className="text-xs text-white/45">Snap share (snapshot): ~{40 + (playerId.length % 55)}%</p>
        </section>

        <section className="space-y-2 border-t border-white/[0.06] pt-3">
          <h4 className="text-[11px] font-bold uppercase tracking-wide text-white/40">Season averages</h4>
          <p className="text-sm text-white/70">
            Avg tackles ~{(stats.soloTackles + stats.assistedTackles) / 2} · Avg sacks ~{stats.sacks} · Avg IDP pts
            ~{(pts + proj) / 2}
          </p>
          <div className="h-12 rounded-md bg-gradient-to-r from-red-500/20 via-violet-500/15 to-blue-500/20" title="Week-by-week sparkline (placeholder)" />
        </section>

        <section className="space-y-2 border-t border-white/[0.06] pt-3">
          <h4 className="text-[11px] font-bold uppercase tracking-wide text-white/40">Role + matchup</h4>
          <p className="text-sm text-white/80">
            {role} — Edge / box mix (illustrative). Defender role:{' '}
            <span className="text-white">{position === 'LB' ? 'Run Stopper – 4-3 MIKE' : 'Edge Rusher – 3-4 OLB'}</span>
          </p>
          <p className="text-sm">
            Matchup: <span className={matchupClass}>{matchup}</span> · Opp rank vs {position}: #
            {10 + (playerId.charCodeAt(0) ?? 0) % 22}
          </p>
        </section>

        <section className="space-y-2 border-t border-white/[0.06] pt-3">
          <h4 className="text-[11px] font-bold uppercase tracking-wide text-white/40">Projection</h4>
          <p className="text-sm text-white/70">Projected IDP pts for remaining schedule: ~{proj + 0.5} / game (UI placeholder).</p>
        </section>

        <div className="flex flex-wrap gap-2 border-t border-white/[0.06] pt-4">
          <button
            type="button"
            className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10"
          >
            Start / Sit
          </button>
          <button
            type="button"
            className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10"
          >
            Add / Drop
          </button>
          <button
            type="button"
            className="rounded-lg border border-cyan-500/30 bg-cyan-950/40 px-3 py-2 text-xs font-semibold text-cyan-100"
          >
            Propose Trade
          </button>
          <button
            type="button"
            className="rounded-lg border border-amber-500/35 bg-amber-950/35 px-3 py-2 text-xs font-semibold text-amber-100"
          >
            AI Analysis (AfSub)
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
