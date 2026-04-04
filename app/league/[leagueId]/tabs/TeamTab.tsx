'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Settings } from 'lucide-react'
import type { LeagueTeam } from '@prisma/client'
import { PlayerImage } from '@/app/components/PlayerImage'
import { TeamLogo } from '@/app/components/TeamLogo'
import { getRosterPlayerIds } from '@/lib/waiver-wire/roster-utils'
import type { UserLeague } from '@/app/dashboard/types'
import { type PlayerMap, resolvePlayerName, useSleeperPlayers } from '@/lib/hooks/useSleeperPlayers'
import { getStarterSlotLabels } from '@/lib/league/rosterSlots'
import { IDPTeamDashboard } from '@/app/idp/components/IDPTeamDashboard'
import { isWeatherSensitiveSport } from '@/lib/weather/outdoorSportMetadata'
import { ProjectionDisplay } from '@/components/weather/ProjectionDisplay'
import { placeholderBaselineProjection } from '@/components/weather/placeholderBaseline'

export type TeamTabProps = {
  league: UserLeague
  userTeam: LeagueTeam | null
  onPlayerClick: (playerId: string) => void
  inviteToken?: string | null
  /** When set, overrides `league.sport` for Sleeper hooks / position labels */
  sport?: string
  /** IDP split roster dashboard when league has `IdpLeagueConfig`. */
  idpLeagueUi?: boolean
  idpViewMode?: 'offense' | 'defense' | 'full'
  idpPositionMode?: string
}

type DbRosterPayload = {
  source?: 'db'
  roster: unknown
  faabRemaining?: number
  slotLimits?: { starters: number; bench: number; ir: number; taxi: number; devy: number } | null
}

type SleeperRosterBody = {
  roster_id: number
  starters: string[]
  players: string[]
  reserve: string[]
  taxi: string[]
  picks: unknown[]
  settings: {
    wins: number
    losses: number
    ties: number
    fpts: number
    fpts_decimal: number
    waiver_budget_used: number
    waiver_position: number
  }
}

type SleeperUsersMap = Record<
  string,
  { display_name: string; avatar: string | null; team_name: string | null }
>

type SleeperApiPayload = {
  source: 'sleeper'
  roster: SleeperRosterBody | null
  ownerId?: string | null
  users: SleeperUsersMap
  rosterPositions?: string[]
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
  slotLimits: DbRosterPayload['slotLimits'],
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

function partitionSleeperRoster(r: SleeperRosterBody): {
  starters: string[]
  bench: string[]
  ir: string[]
  taxi: string[]
} {
  const starters = r.starters.map(String)
  const reserve = new Set((r.reserve ?? []).map(String))
  const taxiSet = new Set((r.taxi ?? []).map(String))
  const starterSet = new Set(starters)
  const players = (r.players ?? []).map(String)
  const bench = players.filter(
    (id) => !starterSet.has(id) && !reserve.has(id) && !taxiSet.has(id),
  )
  return {
    starters,
    bench,
    ir: (r.reserve ?? []).map(String),
    taxi: (r.taxi ?? []).map(String),
  }
}

function formatDraftPick(p: unknown): string {
  if (!p || typeof p !== 'object') return 'Draft pick'
  const o = p as Record<string, unknown>
  const season = o.season ?? o.year
  const round = o.round
  const order = o.order ?? o.pick_no
  if (season == null && round == null) return 'Draft pick'
  const line = `${season} Round ${round} Pick`
  return order != null ? `${line} #${order}` : line
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

function managerInitials(name: string): string {
  const t = name.trim()
  if (!t) return '?'
  const parts = t.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[1]![0]!).toUpperCase()
  }
  return t.slice(0, 2).toUpperCase()
}

function slotBadgeClass(slot: string): string {
  const u = slot.toUpperCase()
  if (u.includes('QB')) return 'border-red-500/35 bg-red-500/25 text-red-400'
  if (u.includes('RB')) return 'border-emerald-500/35 bg-emerald-500/25 text-emerald-400'
  if (u.includes('WR')) return 'border-blue-500/35 bg-blue-500/25 text-blue-400'
  if (u.includes('TE')) return 'border-orange-500/35 bg-orange-500/25 text-orange-400'
  if (u.includes('FLEX') || u.includes('SF') || u.includes('SUPER')) return 'border-cyan-500/35 bg-cyan-500/25 text-cyan-400'
  if (u.includes('K')) return 'border-gray-500/35 bg-gray-500/25 text-gray-400'
  if (u.includes('DEF') || u.includes('DST')) return 'border-purple-500/35 bg-purple-500/25 text-purple-400'
  return 'border-white/15 bg-white/10 text-white/60'
}

function RosterRow({
  playerId,
  sport,
  players,
  playersLoading,
  onPlayerClick,
  slotLabel,
  week,
  season,
}: {
  playerId: string
  sport: string
  players: PlayerMap
  playersLoading: boolean
  onPlayerClick: (id: string) => void
  slotLabel?: string
  week: number
  season: number
}) {
  const resolved = resolvePlayerName(playerId, players)
  const label = playersLoading ? `Player ${playerId.slice(-4)}` : resolved.name
  const pos = resolved.position || '—'
  const showTeam = resolved.team && resolved.team !== 'FA'
  const leftBadge = slotLabel ?? pos
  const badgeClass = slotLabel ? slotBadgeClass(slotLabel) : positionBadgeClass(pos)
  const baseline = placeholderBaselineProjection(playerId)
  const crestSport = sport
  const showCrest = isWeatherSensitiveSport(crestSport)
  return (
    <button
      type="button"
      onClick={() => onPlayerClick(playerId)}
      className="flex w-full items-center gap-2 rounded-lg border border-transparent px-2 py-2 text-left transition hover:border-white/[0.08] hover:bg-white/[0.04]"
      data-testid={`roster-row-${playerId}`}
    >
      <span
        className={`inline-flex min-w-[2.25rem] shrink-0 justify-center rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${badgeClass}`}
      >
        {leftBadge}
      </span>
      <div className="relative shrink-0">
        <PlayerImage
          sleeperId={playerId}
          sport={sport}
          name={label}
          position={resolved.position}
          espnId={players[playerId]?.espn_id}
          nbaId={players[playerId]?.nba_id}
          size={28}
          variant="round"
        />
        <span
          className="absolute bottom-0 right-0 h-2 w-2 rounded-full border border-[#0a1228] bg-white/25"
          title="Injury status (coming soon)"
          aria-hidden
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-white">{label}</p>
        <p className="flex flex-wrap items-center gap-1 text-[10px] text-white/40">
          {playersLoading ? (
            '— · —'
          ) : (
            <>
              <span>{resolved.position || '—'}</span>
              <span className="text-white/25">·</span>
              {showTeam ? (
                <>
                  <TeamLogo teamAbbr={resolved.team} sport={sport} size={16} />
                  <span className="text-white/45">{resolved.team}</span>
                </>
              ) : (
                <span>—</span>
              )}
            </>
          )}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2 text-right text-xs text-white/45">
        <span className="flex w-[4.5rem] items-center justify-end gap-0.5">
          <ProjectionDisplay
            projection={baseline}
            suffix=""
            showAFCrest={showCrest}
            pointsClassName="text-xs text-white/45"
            afCrestProps={
              showCrest
                ? {
                    playerId,
                    playerName: label,
                    sport: crestSport,
                    position: pos,
                    week,
                    season,
                    size: 'sm',
                  }
                : undefined
            }
          />
        </span>
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

export function TeamTab({
  league,
  userTeam,
  onPlayerClick,
  inviteToken,
  sport,
  idpLeagueUi = false,
  idpViewMode = 'full',
  idpPositionMode = 'standard',
}: TeamTabProps) {
  const resolvedSport = sport ?? league.sport
  const { players, loading: playersLoading } = useSleeperPlayers(resolvedSport)
  const isSleeper = league.platform === 'sleeper'
  const [week, setWeek] = useState(1)
  const seasonYear = new Date().getFullYear()
  const [loading, setLoading] = useState(() => isSleeper || Boolean(userTeam))
  const [error, setError] = useState<string | null>(null)
  const [payload, setPayload] = useState<DbRosterPayload | SleeperApiPayload | null>(null)

  const load = useCallback(async () => {
    if (!isSleeper && !userTeam) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/league/roster?leagueId=${encodeURIComponent(league.id)}`, {
        cache: 'no-store',
      })
      const data = (await res.json()) as Record<string, unknown>

      if (!res.ok) {
        const errText =
          res.status === 404 ? 'No roster synced yet for your account.' : 'Could not load roster.'
        setError(errText)
        setPayload(null)
        return
      }

      if (data.source === 'sleeper') {
        setPayload(data as unknown as SleeperApiPayload)
        return
      }

      setPayload(data as unknown as DbRosterPayload)
    } catch {
      setError('Could not load roster.')
      setPayload(null)
    } finally {
      setLoading(false)
    }
  }, [isSleeper, league.id, userTeam])

  useEffect(() => {
    void load()
  }, [load])

  const sleeperParts = useMemo(() => {
    if (!payload || payload.source !== 'sleeper' || !payload.roster) return null
    return partitionSleeperRoster(payload.roster)
  }, [payload])

  const sleeperStarterLabels = useMemo(() => {
    if (!payload || payload.source !== 'sleeper' || !payload.roster) return []
    const rp = payload.rosterPositions?.length
      ? payload.rosterPositions
      : ((league.settings as Record<string, unknown> | undefined)?.roster_positions as string[] | undefined) ??
        []
    return rp.length > 0 ? getStarterSlotLabels(rp) : payload.roster.starters.map((_, i) => `S${i + 1}`)
  }, [payload, league.settings])

  const dbParts = useMemo(() => {
    if (!payload || payload.source === 'sleeper') return null
    if (!payload.roster) return null
    return partitionRoster(payload.roster, payload.slotLimits ?? null)
  }, [payload])

  const showIrSectionSleeper = (sleeperParts?.ir.length ?? 0) > 0
  const showTaxiSectionSleeper = (sleeperParts?.taxi.length ?? 0) > 0
  const showIrSectionDb = (dbParts?.ir.length ?? 0) > 0 || ((payload as DbRosterPayload)?.slotLimits?.ir ?? 0) > 0
  const showTaxiSectionDb =
    league.isDynasty === true &&
    ((dbParts?.taxi.length ?? 0) > 0 || ((payload as DbRosterPayload)?.slotLimits?.taxi ?? 0) > 0)

  if (!isSleeper && !userTeam) {
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

  if (isSleeper && !loading && !error && payload?.source === 'sleeper' && payload.roster === null) {
    const href = inviteToken ? `/join/${inviteToken}` : '/dashboard'
    return (
      <div className="flex min-h-[240px] flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-sm font-semibold text-white/80">
          No Sleeper roster linked to your account in this league
        </p>
        <p className="max-w-sm text-xs text-white/45">
          Link your Sleeper profile in settings or claim a team so we can match your owner ID.
        </p>
        <Link
          href={href}
          className="rounded-xl border border-white/[0.12] px-5 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-white/[0.06]"
        >
          Back to dashboard
        </Link>
      </div>
    )
  }

  const headerTeamName =
    payload?.source === 'sleeper' && payload.ownerId && payload.users[payload.ownerId]
      ? payload.users[payload.ownerId].team_name ||
        payload.users[payload.ownerId].display_name ||
        userTeam?.teamName
      : userTeam?.teamName ?? 'Your team'

  const sleeperOwner =
    payload?.source === 'sleeper' && payload.ownerId ? payload.users[payload.ownerId] : null
  const ownerAvatarSrc = (() => {
    if (!sleeperOwner?.avatar?.trim()) return null
    const raw = sleeperOwner.avatar.trim()
    if (raw.startsWith('http://') || raw.startsWith('https://')) return raw
    return `https://sleepercdn.com/avatars/${raw}`
  })()

  const waiverLine =
    payload?.source === 'sleeper' && payload.roster
      ? `$FAAB: ${payload.roster.settings.waiver_budget_used}/1000 · Waiver position: #${payload.roster.settings.waiver_position}`
      : payload && payload.source !== 'sleeper' && (payload as DbRosterPayload).faabRemaining != null
        ? `FAAB: $${(payload as DbRosterPayload).faabRemaining} · Trade hub (soon)`
        : 'FAAB: — · Trade hub (soon)'

  const showIdpDashboard =
    idpLeagueUi &&
    !loading &&
    !error &&
    ((payload?.source === 'sleeper' && sleeperParts) ||
      (payload && payload.source !== 'sleeper' && dbParts))

  return (
    <div className="space-y-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            {sleeperOwner ? (
              ownerAvatarSrc ? (
                <img
                  src={ownerAvatarSrc}
                  alt=""
                  className="h-9 w-9 shrink-0 rounded-full border border-white/10 object-cover"
                />
              ) : (
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500/80 to-cyan-600/80 text-[11px] font-bold text-white"
                  aria-hidden
                >
                  {managerInitials(sleeperOwner.display_name ?? headerTeamName ?? 'Manager')}
                </div>
              )
            ) : null}
            <h2 className="text-base font-bold text-white">{headerTeamName}</h2>
            <button
              type="button"
              className="rounded-lg p-1 text-white/40 hover:bg-white/10 hover:text-white/70"
              aria-label="Team settings"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-1 text-[11px] text-white/35">{waiverLine}</p>
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

      {!loading && !error && showIdpDashboard && payload?.source === 'sleeper' && sleeperParts ? (
        <IDPTeamDashboard
          leagueId={league.id}
          week={week}
          sport={resolvedSport}
          players={players}
          playersLoading={playersLoading}
          idpViewMode={idpViewMode}
          positionMode={idpPositionMode}
          starterIds={sleeperParts.starters}
          benchIds={[...sleeperParts.bench, ...sleeperParts.taxi, ...sleeperParts.ir]}
          slotLabels={sleeperStarterLabels}
          onOffensePlayerClick={onPlayerClick}
        />
      ) : null}

      {!loading && !error && showIdpDashboard && payload && payload.source !== 'sleeper' && dbParts ? (
        <IDPTeamDashboard
          leagueId={league.id}
          week={week}
          sport={resolvedSport}
          players={players}
          playersLoading={playersLoading}
          idpViewMode={idpViewMode}
          positionMode={idpPositionMode}
          starterIds={dbParts.starters}
          benchIds={[...dbParts.bench, ...dbParts.taxi, ...dbParts.ir]}
          onOffensePlayerClick={onPlayerClick}
        />
      ) : null}

      {!loading && !error && !showIdpDashboard && payload?.source === 'sleeper' && payload.roster && sleeperParts ? (
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
              {sleeperParts.starters.map((id, i) => (
                <RosterRow
                  key={`${id}-${i}`}
                  playerId={id}
                  sport={resolvedSport}
                  players={players}
                  playersLoading={playersLoading}
                  onPlayerClick={onPlayerClick}
                  slotLabel={sleeperStarterLabels[i]}
                  week={week}
                  season={seasonYear}
                />
              ))}
            </div>
          </section>

          <section>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-white/35">Bench</p>
            <div className="space-y-1">
              {sleeperParts.bench.map((id) => (
                <RosterRow
                  key={id}
                  playerId={id}
                  sport={resolvedSport}
                  players={players}
                  playersLoading={playersLoading}
                  onPlayerClick={onPlayerClick}
                  week={week}
                  season={seasonYear}
                />
              ))}
            </div>
          </section>

          {showTaxiSectionSleeper ? (
            <section>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-white/35">Taxi</p>
              <div className="space-y-1">
                {sleeperParts.taxi.map((id) => (
                  <RosterRow
                    key={id}
                    playerId={id}
                    sport={resolvedSport}
                    players={players}
                    playersLoading={playersLoading}
                    onPlayerClick={onPlayerClick}
                    week={week}
                    season={seasonYear}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {showIrSectionSleeper ? (
            <section>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-white/35">Reserve / IR</p>
              <div className="space-y-1">
                {sleeperParts.ir.map((id) => (
                  <RosterRow
                    key={id}
                    playerId={id}
                    sport={resolvedSport}
                    players={players}
                    playersLoading={playersLoading}
                    onPlayerClick={onPlayerClick}
                    week={week}
                    season={seasonYear}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {payload.roster.picks.length > 0 ? (
            <section>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-white/35">Draft picks</p>
              <ul className="space-y-1 text-xs text-white/70">
                {payload.roster.picks.map((p, i) => (
                  <li
                    key={`pick-${i}`}
                    className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2"
                  >
                    {formatDraftPick(p)}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      ) : null}

      {!loading && !error && !showIdpDashboard && payload && payload.source !== 'sleeper' && dbParts ? (
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
              {dbParts.starters.map((id) => (
                <RosterRow
                  key={id}
                  playerId={id}
                  sport={resolvedSport}
                  players={players}
                  playersLoading={playersLoading}
                  onPlayerClick={onPlayerClick}
                  week={week}
                  season={seasonYear}
                />
              ))}
            </div>
          </section>

          <section>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-white/35">Bench</p>
            <div className="space-y-1">
              {dbParts.bench.map((id) => (
                <RosterRow
                  key={id}
                  playerId={id}
                  sport={resolvedSport}
                  players={players}
                  playersLoading={playersLoading}
                  onPlayerClick={onPlayerClick}
                  week={week}
                  season={seasonYear}
                />
              ))}
            </div>
          </section>

          {showIrSectionDb ? (
            <section>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-white/35">IR</p>
              <div className="space-y-1">
                {dbParts.ir.length > 0 ? (
                  dbParts.ir.map((id) => (
                    <RosterRow
                      key={id}
                      playerId={id}
                      sport={resolvedSport}
                      players={players}
                      playersLoading={playersLoading}
                      onPlayerClick={onPlayerClick}
                      week={week}
                      season={seasonYear}
                    />
                  ))
                ) : (
                  <p className="text-xs text-white/35">No players on IR</p>
                )}
              </div>
            </section>
          ) : null}

          {showTaxiSectionDb ? (
            <section>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-white/35">Taxi</p>
              <div className="space-y-1">
                {dbParts.taxi.length > 0 ? (
                  dbParts.taxi.map((id) => (
                    <RosterRow
                      key={id}
                      playerId={id}
                      sport={resolvedSport}
                      players={players}
                      playersLoading={playersLoading}
                      onPlayerClick={onPlayerClick}
                      week={week}
                      season={seasonYear}
                    />
                  ))
                ) : (
                  <p className="text-xs text-white/35">No taxi squad players</p>
                )}
              </div>
            </section>
          ) : null}
        </>
      ) : null}

      {!loading && !error && payload?.source === 'sleeper' && payload.roster && !sleeperParts ? (
        <p className="text-sm text-white/45">No roster data.</p>
      ) : null}

      {!loading && !error && payload && payload.source !== 'sleeper' && !dbParts ? (
        <p className="text-sm text-white/45">No roster data.</p>
      ) : null}
    </div>
  )
}
