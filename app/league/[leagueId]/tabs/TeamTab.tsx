'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Settings } from 'lucide-react'
import type { LeagueTeam } from '@prisma/client'
import { getRosterPlayerIds } from '@/lib/waiver-wire/roster-utils'
import type { UserLeague } from '@/app/dashboard/types'

export type TeamTabProps = {
  league: UserLeague
  userTeam: LeagueTeam | null
  onPlayerClick: (playerId: string) => void
  inviteToken?: string | null
}

type RosterPayload = {
  roster: unknown
  faabRemaining?: number
  slotLimits?: { starters: number; bench: number; ir: number; taxi: number; devy: number } | null
}

function toRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null
}

function getStringIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map((x) => String(x)).filter(Boolean)
}

function getStarterIds(playerData: unknown): string[] {
  const rec = toRecord(playerData)
  if (!rec) return []
  return getStringIds(rec.starters)
}

function getIrIds(playerData: unknown): string[] {
  const rec = toRecord(playerData)
  if (!rec) return []
  return getStringIds(rec.reserve ?? rec.ir)
}

function getTaxiIds(playerData: unknown): string[] {
  const rec = toRecord(playerData)
  if (!rec) return []
  return getStringIds(rec.taxi)
}

function partitionRoster(
  playerData: unknown,
  slotLimits: RosterPayload['slotLimits'],
): { starters: string[]; bench: string[]; ir: string[]; taxi: string[] } {
  const all = getRosterPlayerIds(playerData)
  const starterIds = getStarterIds(playerData)
  const irIds = getIrIds(playerData)
  const taxiIds = getTaxiIds(playerData)

  let starters: string[]
  if (starterIds.length > 0) {
    starters = starterIds.filter((id) => all.includes(id))
  } else {
    const n = Math.max(0, slotLimits?.starters ?? 9)
    starters = all.slice(0, Math.min(n, all.length))
  }

  const starterSet = new Set(starters)
  const irSet = new Set(irIds)
  const taxiSet = new Set(taxiIds)

  const reserved = new Set([...starterSet, ...irSet, ...taxiSet])
  const bench = all.filter((id) => !reserved.has(id))

  const ir = irIds.filter((id) => all.includes(id))
  const taxi = taxiIds.filter((id) => all.includes(id))

  return { starters, bench, ir, taxi }
}

function playerThumbUrl(sport: string, playerId: string): string {
  const s = sport.toUpperCase()
  if (s === 'NFL' || s === 'NCAAF') {
    return `https://sleepercdn.com/content/nfl/players/thumb/${playerId}.jpg`
  }
  return `https://sleepercdn.com/content/nfl/players/thumb/${playerId}.jpg`
}

function positionBadgeClass(pos: string): string {
  const p = pos.toUpperCase()
  if (p === 'QB') return 'border-red-500/35 bg-red-500/25 text-red-400'
  if (p === 'RB') return 'border-emerald-500/35 bg-emerald-500/25 text-emerald-400'
  if (p === 'WR') return 'border-blue-500/35 bg-blue-500/25 text-blue-400'
  if (p === 'TE') return 'border-orange-500/35 bg-orange-500/25 text-orange-400'
  if (p === 'K') return 'border-gray-500/35 bg-gray-500/25 text-gray-400'
  if (p === 'DEF' || p === 'DST') return 'border-purple-500/35 bg-purple-500/25 text-purple-400'
  return 'border-white/15 bg-white/10 text-white/60'
}

function RosterRow({
  playerId,
  sport,
  onPlayerClick,
}: {
  playerId: string
  sport: string
  onPlayerClick: (id: string) => void
}) {
  const label = `Player ${playerId.length > 6 ? `…${playerId.slice(-6)}` : playerId}`
  return (
    <button
      type="button"
      onClick={() => onPlayerClick(playerId)}
      className="flex w-full items-center gap-2 rounded-lg border border-transparent px-2 py-2 text-left transition hover:border-white/[0.08] hover:bg-white/[0.04]"
    >
      <span
        className={`inline-flex min-w-[2rem] shrink-0 justify-center rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${positionBadgeClass('—')}`}
      >
        —
      </span>
      <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-white/10">
        <img src={playerThumbUrl(sport, playerId)} alt="" className="h-full w-full object-cover" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-white">{label}</p>
        <p className="text-[10px] text-white/40">— · —</p>
      </div>
      <div className="flex shrink-0 gap-3 text-right text-xs text-white/45">
        <span className="w-10">—</span>
        <span className="w-10">—</span>
      </div>
    </button>
  )
}

function SkeletonRows() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={`sk-${i}`}
          className="flex animate-pulse items-center gap-2 rounded-lg px-2 py-2"
        >
          <div className="h-6 w-10 rounded-md bg-white/10" />
          <div className="h-8 w-8 rounded-full bg-white/10" />
          <div className="flex-1 space-y-1">
            <div className="h-3 w-32 rounded bg-white/10" />
            <div className="h-2 w-24 rounded bg-white/10" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function TeamTab({ league, userTeam, onPlayerClick, inviteToken }: TeamTabProps) {
  const [week, setWeek] = useState(1)
  const [loading, setLoading] = useState(Boolean(userTeam))
  const [error, setError] = useState<string | null>(null)
  const [payload, setPayload] = useState<RosterPayload | null>(null)

  const load = useCallback(async () => {
    if (!userTeam) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/league/roster?leagueId=${encodeURIComponent(league.id)}`, {
        cache: 'no-store',
      })
      if (!res.ok) {
        const errText = res.status === 404 ? 'No roster synced yet for your account.' : 'Could not load roster.'
        setError(errText)
        setPayload(null)
        return
      }
      const data = (await res.json()) as RosterPayload
      setPayload(data)
    } catch {
      setError('Could not load roster.')
      setPayload(null)
    } finally {
      setLoading(false)
    }
  }, [league.id, userTeam])

  useEffect(() => {
    void load()
  }, [load])

  const parts = useMemo(() => {
    if (!payload?.roster) return null
    return partitionRoster(payload.roster, payload.slotLimits ?? null)
  }, [payload])

  const showIrSection = (parts?.ir.length ?? 0) > 0 || (payload?.slotLimits?.ir ?? 0) > 0
  const showTaxiSection = league.isDynasty === true && ((parts?.taxi.length ?? 0) > 0 || (payload?.slotLimits?.taxi ?? 0) > 0)

  if (!userTeam) {
    const href = inviteToken ? `/join/${inviteToken}` : '/dashboard'
    return (
      <div className="flex min-h-[240px] flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-sm font-semibold text-white/80">You haven&apos;t claimed a team in this league</p>
        <Link
          href={href}
          className="rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-bold text-black transition hover:bg-cyan-400"
        >
          Claim a team
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white">{userTeam.teamName}</h2>
            <button
              type="button"
              className="rounded-lg p-1 text-white/40 hover:bg-white/10 hover:text-white/70"
              aria-label="Team settings"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-1 text-[11px] text-white/35">
            FAAB: {payload?.faabRemaining != null ? `$${payload.faabRemaining}` : '—'} · Trade hub (soon)
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.04] px-2 py-1">
          <button
            type="button"
            className="px-2 text-white/50 hover:text-white"
            onClick={() => setWeek((w) => Math.max(1, w - 1))}
            aria-label="Previous week"
          >
            ←
          </button>
          <span className="min-w-[4rem] text-center text-xs font-semibold text-white/80">Wk {week}</span>
          <button
            type="button"
            className="px-2 text-white/50 hover:text-white"
            onClick={() => setWeek((w) => w + 1)}
            aria-label="Next week"
          >
            →
          </button>
        </div>
      </div>

      {loading ? <SkeletonRows /> : null}

      {!loading && error ? (
        <p className="rounded-xl border border-white/[0.07] bg-[#0c0c1e] px-4 py-3 text-sm text-white/50">{error}</p>
      ) : null}

      {!loading && !error && parts ? (
        <>
          <section>
            <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-white/35">Starters</p>
                <p className="text-[11px] text-white/35">Click a row to open the player card (stub).</p>
              </div>
              <div className="flex gap-4 text-[10px] font-semibold uppercase tracking-wide text-white/35">
                <span className="w-10 text-right">OWN%</span>
                <span className="w-10 text-right">START%</span>
              </div>
            </div>
            <div className="space-y-1">
              {parts.starters.map((id) => (
                <RosterRow key={id} playerId={id} sport={league.sport} onPlayerClick={onPlayerClick} />
              ))}
            </div>
          </section>

          <section>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-white/35">Bench</p>
            <div className="space-y-1">
              {parts.bench.map((id) => (
                <RosterRow key={id} playerId={id} sport={league.sport} onPlayerClick={onPlayerClick} />
              ))}
            </div>
          </section>

          {showIrSection ? (
            <section>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-white/35">IR</p>
              <div className="space-y-1">
                {parts.ir.length > 0 ? (
                  parts.ir.map((id) => (
                    <RosterRow key={id} playerId={id} sport={league.sport} onPlayerClick={onPlayerClick} />
                  ))
                ) : (
                  <p className="text-xs text-white/35">No players on IR</p>
                )}
              </div>
            </section>
          ) : null}

          {showTaxiSection ? (
            <section>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-white/35">Taxi</p>
              <div className="space-y-1">
                {parts.taxi.length > 0 ? (
                  parts.taxi.map((id) => (
                    <RosterRow key={id} playerId={id} sport={league.sport} onPlayerClick={onPlayerClick} />
                  ))
                ) : (
                  <p className="text-xs text-white/35">No taxi squad players</p>
                )}
              </div>
            </section>
          ) : null}
        </>
      ) : null}

      {!loading && !error && !parts ? (
        <p className="text-sm text-white/45">No roster data.</p>
      ) : null}
    </div>
  )
}
