'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import clsx from 'clsx'
import { ZombieEventFeed } from '@/app/zombie/components/ZombieEventFeed'
import { ZombieStatusBadge } from '@/app/zombie/components/ZombieStatusBadge'
import { ZombieHordeBar } from '@/app/zombie/components/ZombieHordeBar'

type LeaderboardRow = {
  userId: string
  displayName: string
  leagueName: string
  leagueId: string
  tierLabel: string | null
  currentStatus: string
  isWhisperer: boolean
  wins: number
  losses: number
  pointsFor: number
  ppw: number
  winPct: number
  infectionsInflicted: number
  infectionsReceived: number
  weekSurvived: number
  serumsUsed: number
  weaponsUsed: number
  bashingsWon: number
  maulingsWon: number
  revivals: number
  universeRank: number | null
}

type MovementRow = {
  id: string
  userId: string
  displayName: string | null
  season: number
  week: number | null
  movementType: string
  fromTierLabel: string | null
  toTierLabel: string | null
  reason: string | null
  createdAt: string
}

type UniverseData = {
  universe: {
    name: string
    sport: string
    leagues: { leagueId: string; name: string | null; levelId: string | null }[]
  }
  counts: { survivorCount: number; zombieCount: number; whispererCount: number; leagueCount: number }
  animations: Array<{
    id: string
    animationType: string
    week: number
    metadata: unknown
    createdAt: string
  }>
  announcements: Array<{
    id: string
    type: string
    title: string
    content: string
    week: number | null
    createdAt: string
  }>
  topByPpw: Array<{ displayName: string; leagueName: string; currentSeasonPPW: number; currentStatus?: string }>
  leaderboard?: LeaderboardRow[]
  movements?: MovementRow[]
  tiers?: Array<{ name: string; rankOrder: number; leagueCount: number; survivorCount: number; zombieCount: number }>
}

type Tab = 'overview' | 'leaderboard' | 'movement' | 'events'

export default function ZombieUniverseHubPage() {
  const { universeId } = useParams<{ universeId: string }>()
  const [data, setData] = useState<UniverseData | null>(null)
  const [tab, setTab] = useState<Tab>('overview')
  const [leaderSort, setLeaderSort] = useState<'ppw' | 'wins' | 'infections' | 'survived'>('ppw')
  const [leaderFilter, setLeaderFilter] = useState<string>('')

  useEffect(() => {
    if (!universeId) return
    fetch(`/api/zombie/universe-hub?universeId=${encodeURIComponent(universeId)}`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => setData(null))
  }, [universeId])

  const sortedLeaderboard = useMemo(() => {
    if (!data?.leaderboard) return data?.topByPpw?.map((r, i) => ({
      ...r,
      userId: `ppw-${i}`,
      leagueId: '',
      tierLabel: null,
      currentStatus: r.currentStatus ?? 'survivor',
      isWhisperer: false,
      wins: 0,
      losses: 0,
      pointsFor: 0,
      ppw: r.currentSeasonPPW,
      winPct: 0,
      infectionsInflicted: 0,
      infectionsReceived: 0,
      weekSurvived: 0,
      serumsUsed: 0,
      weaponsUsed: 0,
      bashingsWon: 0,
      maulingsWon: 0,
      revivals: 0,
      universeRank: i + 1,
    } as LeaderboardRow)) ?? []

    let list = [...data.leaderboard]
    if (leaderFilter) {
      const q = leaderFilter.toLowerCase()
      list = list.filter(
        (r) =>
          r.displayName.toLowerCase().includes(q) ||
          r.leagueName.toLowerCase().includes(q) ||
          (r.tierLabel ?? '').toLowerCase().includes(q),
      )
    }
    list.sort((a, b) => {
      if (leaderSort === 'ppw') return b.ppw - a.ppw
      if (leaderSort === 'wins') return b.wins - a.wins || b.ppw - a.ppw
      if (leaderSort === 'infections') return b.infectionsInflicted - a.infectionsInflicted || b.ppw - a.ppw
      return b.weekSurvived - a.weekSurvived || b.ppw - a.ppw
    })
    return list
  }, [data, leaderSort, leaderFilter])

  if (!data?.universe) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--zombie-bg)]">
        <p className="text-[13px] text-[var(--zombie-text-dim)]">Loading universe...</p>
      </div>
    )
  }

  const u = data.universe
  const totalPlayers = data.counts.survivorCount + data.counts.zombieCount + data.counts.whispererCount
  const hordePct = totalPlayers > 0 ? Math.round((data.counts.zombieCount / totalPlayers) * 100) : 0

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'leaderboard', label: 'Leaderboard' },
    { id: 'movement', label: 'Movement' },
    { id: 'events', label: 'Events' },
  ]

  return (
    <div className="min-h-screen bg-[var(--zombie-bg)] text-[var(--zombie-text-mid)]">
      {/* Hero header */}
      <header className="border-b border-[var(--zombie-border)] bg-gradient-to-b from-[var(--zombie-crimson)]/10 to-transparent px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--zombie-crimson)]">
            Zombie Universe
          </p>
          <h1 className="mt-1 text-3xl font-black text-[var(--zombie-text-full)]">{u.name}</h1>
          <p className="mt-1 text-[13px] text-[var(--zombie-text-mid)]">
            {u.sport.toUpperCase()} · {data.counts.leagueCount} leagues · {totalPlayers} players
          </p>

          {/* Status counters */}
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Survivors" value={data.counts.survivorCount} color="var(--zombie-green)" icon="🧍" />
            <StatCard label="Zombies" value={data.counts.zombieCount} color="var(--zombie-purple)" icon="🧟" />
            <StatCard label="Whisperers" value={data.counts.whispererCount} color="var(--zombie-crimson)" icon="🎭" />
            <StatCard label="Horde %" value={`${hordePct}%`} color="var(--zombie-red)" icon="📊" />
          </div>

          {/* Horde bar */}
          <div className="mt-5">
            <ZombieHordeBar hordeCount={data.counts.zombieCount} survivorCount={data.counts.survivorCount} />
          </div>
        </div>
      </header>

      {/* Tab nav */}
      <nav className="sticky top-0 z-10 border-b border-[var(--zombie-border)] bg-[var(--zombie-panel)]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl gap-1 px-4 sm:px-6">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={clsx(
                'px-4 py-3 text-[12px] font-semibold transition-colors',
                tab === t.id
                  ? 'border-b-2 border-[var(--zombie-crimson)] text-[var(--zombie-text-full)]'
                  : 'text-[var(--zombie-text-dim)] hover:text-[var(--zombie-text-mid)]',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        {tab === 'overview' && (
          <OverviewTab data={data} universeId={universeId} />
        )}
        {tab === 'leaderboard' && (
          <LeaderboardTab
            rows={sortedLeaderboard ?? []}
            sort={leaderSort}
            onSort={setLeaderSort}
            filter={leaderFilter}
            onFilter={setLeaderFilter}
          />
        )}
        {tab === 'movement' && (
          <MovementTab movements={data.movements ?? []} />
        )}
        {tab === 'events' && (
          <EventsTab data={data} />
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, color, icon }: { label: string; value: number | string; color: string; icon: string }) {
  return (
    <div className="rounded-xl border border-[var(--zombie-border)] bg-[var(--zombie-panel)] p-3">
      <div className="flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--zombie-text-dim)]">{label}</p>
          <p className="text-xl font-black" style={{ color }}>{value}</p>
        </div>
      </div>
    </div>
  )
}

function OverviewTab({ data, universeId }: { data: UniverseData; universeId: string }) {
  const u = data.universe

  return (
    <div className="space-y-6">
      {/* Tier breakdown */}
      {data.tiers && data.tiers.length > 0 && (
        <section>
          <h2 className="mb-3 text-[12px] font-bold uppercase tracking-wide text-[var(--zombie-text-dim)]">
            Tier breakdown
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.tiers.map((tier) => (
              <div
                key={tier.name}
                className="rounded-xl border border-[var(--zombie-border)] bg-[var(--zombie-panel)] p-4"
              >
                <p className="text-[13px] font-bold text-[var(--zombie-text-full)]">{tier.name}</p>
                <p className="mt-1 text-[11px] text-[var(--zombie-text-mid)]">
                  {tier.leagueCount} leagues · {tier.survivorCount} survivors · {tier.zombieCount} zombies
                </p>
                <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full bg-[var(--zombie-green)]/60"
                    style={{ width: `${Math.max(1, (tier.survivorCount / Math.max(1, tier.survivorCount + tier.zombieCount)) * 100)}%` }}
                  />
                  <div
                    className="h-full bg-[var(--zombie-purple)]/60"
                    style={{ width: `${(tier.zombieCount / Math.max(1, tier.survivorCount + tier.zombieCount)) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Top survivors */}
      <section>
        <h2 className="mb-3 text-[12px] font-bold uppercase tracking-wide text-[var(--zombie-text-dim)]">
          Top survivors by PPW
        </h2>
        <div className="overflow-x-auto rounded-xl border border-[var(--zombie-border)]">
          <table className="w-full text-left text-[12px]">
            <thead className="border-b border-[var(--zombie-border)] text-[10px] uppercase text-[var(--zombie-text-dim)]">
              <tr>
                <th className="p-2.5">#</th>
                <th className="p-2.5">Name</th>
                <th className="p-2.5">League</th>
                <th className="p-2.5">Status</th>
                <th className="p-2.5 text-right">PPW</th>
              </tr>
            </thead>
            <tbody>
              {data.topByPpw.map((r, i) => (
                <tr key={`${r.displayName}-${i}`} className="border-t border-white/[0.04]">
                  <td className="p-2.5 font-bold text-[var(--zombie-text-dim)]">{i + 1}</td>
                  <td className="p-2.5 text-[var(--zombie-text-full)]">{r.displayName}</td>
                  <td className="p-2.5">{r.leagueName}</td>
                  <td className="p-2.5">
                    {r.currentStatus ? <ZombieStatusBadge status={r.currentStatus} compact /> : '—'}
                  </td>
                  <td className="p-2.5 text-right font-mono">{r.currentSeasonPPW.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Recent events */}
      <section>
        <h2 className="mb-3 text-[12px] font-bold uppercase tracking-wide text-[var(--zombie-text-dim)]">
          Notable events
        </h2>
        <ZombieEventFeed
          animations={data.animations}
          announcements={data.announcements}
          maxItems={6}
        />
      </section>

      {/* Leagues */}
      <section>
        <h2 className="mb-3 text-[12px] font-bold uppercase tracking-wide text-[var(--zombie-text-dim)]">
          Leagues in this universe
        </h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {u.leagues.map((l) => (
            <Link
              key={l.leagueId}
              href={`/zombie/${l.leagueId}`}
              className="flex items-center gap-3 rounded-xl border border-[var(--zombie-border)] bg-[var(--zombie-panel)] p-3 transition hover:bg-white/[0.04]"
            >
              <span className="text-lg">🧟</span>
              <div>
                <p className="text-[13px] font-semibold text-[var(--zombie-text-full)]">
                  {l.name ?? l.leagueId}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}

function LeaderboardTab({
  rows,
  sort,
  onSort,
  filter,
  onFilter,
}: {
  rows: LeaderboardRow[]
  sort: string
  onSort: (s: 'ppw' | 'wins' | 'infections' | 'survived') => void
  filter: string
  onFilter: (s: string) => void
}) {
  const sortOpts: { id: 'ppw' | 'wins' | 'infections' | 'survived'; label: string }[] = [
    { id: 'ppw', label: 'PPW' },
    { id: 'wins', label: 'Wins' },
    { id: 'infections', label: 'Infections' },
    { id: 'survived', label: 'Weeks survived' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search player or league..."
          value={filter}
          onChange={(e) => onFilter(e.target.value)}
          className="min-w-[200px] flex-1 rounded-xl border border-[var(--zombie-border)] bg-[var(--zombie-panel)] px-3 py-2 text-[12px] text-white placeholder:text-[var(--zombie-text-dim)] focus:outline-none focus:ring-1 focus:ring-[var(--zombie-crimson)]"
        />
        <div className="flex gap-1">
          {sortOpts.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => onSort(o.id)}
              className={clsx(
                'rounded-lg px-3 py-1.5 text-[11px] font-semibold transition',
                sort === o.id
                  ? 'bg-[var(--zombie-crimson)]/20 text-[var(--zombie-crimson)]'
                  : 'text-[var(--zombie-text-dim)] hover:bg-white/[0.04]',
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[var(--zombie-border)]">
        <table className="w-full min-w-[900px] text-left text-[12px]">
          <thead className="border-b border-[var(--zombie-border)] text-[10px] uppercase text-[var(--zombie-text-dim)]">
            <tr>
              <th className="p-2.5">#</th>
              <th className="p-2.5">Player</th>
              <th className="p-2.5">League</th>
              <th className="p-2.5">Tier</th>
              <th className="p-2.5">Status</th>
              <th className="p-2.5 text-right">W-L</th>
              <th className="p-2.5 text-right">PPW</th>
              <th className="p-2.5 text-right">Infections</th>
              <th className="p-2.5 text-right">Survived</th>
              <th className="p-2.5 text-right">Items</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.userId} className="border-t border-white/[0.04] hover:bg-white/[0.02]">
                <td className="p-2.5 font-bold text-[var(--zombie-text-dim)]">{i + 1}</td>
                <td className="p-2.5 text-[var(--zombie-text-full)]">{r.displayName}</td>
                <td className="p-2.5">
                  {r.leagueId ? (
                    <Link href={`/zombie/${r.leagueId}`} className="text-sky-400 hover:underline">
                      {r.leagueName}
                    </Link>
                  ) : (
                    r.leagueName
                  )}
                </td>
                <td className="p-2.5">{r.tierLabel ?? '—'}</td>
                <td className="p-2.5">
                  <ZombieStatusBadge status={r.currentStatus} compact />
                </td>
                <td className="p-2.5 text-right font-mono">
                  {r.wins}-{r.losses}
                </td>
                <td className="p-2.5 text-right font-mono">{r.ppw.toFixed(2)}</td>
                <td className="p-2.5 text-right font-mono">{r.infectionsInflicted}</td>
                <td className="p-2.5 text-right font-mono">{r.weekSurvived}w</td>
                <td className="p-2.5 text-right">
                  {r.serumsUsed > 0 && <span title="Serums used">🧪{r.serumsUsed}</span>}
                  {r.weaponsUsed > 0 && <span className="ml-1" title="Weapons used">⚔️{r.weaponsUsed}</span>}
                  {r.bashingsWon > 0 && <span className="ml-1" title="Bashings won">🔥{r.bashingsWon}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && (
        <p className="py-8 text-center text-[12px] text-[var(--zombie-text-dim)]">No players found.</p>
      )}
    </div>
  )
}

function MovementTab({ movements }: { movements: MovementRow[] }) {
  const ICONS: Record<string, string> = {
    promoted: '⬆️',
    relegated: '⬇️',
    lateral: '↔️',
    joined: '🆕',
    left: '🚪',
  }

  const COLORS: Record<string, string> = {
    promoted: 'border-l-[var(--zombie-green)]',
    relegated: 'border-l-[var(--zombie-red)]',
    lateral: 'border-l-sky-500',
    joined: 'border-l-[var(--zombie-gold)]',
    left: 'border-l-[var(--zombie-gray)]',
  }

  if (movements.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-[13px] text-[var(--zombie-text-dim)]">
          No movement history yet. Promotions and relegations appear here after each season.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {movements.map((m) => (
        <div
          key={m.id}
          className={clsx(
            'rounded-xl border border-[var(--zombie-border)] bg-[var(--zombie-panel)] py-3 pl-4 pr-4 border-l-4',
            COLORS[m.movementType] ?? 'border-l-white/15',
          )}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">{ICONS[m.movementType] ?? '📋'}</span>
            <div className="flex-1">
              <p className="text-[13px] text-[var(--zombie-text-full)]">
                <span className="font-semibold">{m.displayName ?? m.userId}</span>
                {' — '}
                <span className="capitalize">{m.movementType}</span>
              </p>
              <p className="text-[11px] text-[var(--zombie-text-mid)]">
                {m.fromTierLabel && m.toTierLabel
                  ? `${m.fromTierLabel} → ${m.toTierLabel}`
                  : m.reason ?? ''}
                {m.week != null ? ` · Week ${m.week}` : ''}
                {` · Season ${m.season}`}
              </p>
            </div>
            <span className="text-[10px] text-[var(--zombie-text-dim)]">
              {new Date(m.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

function EventsTab({ data }: { data: UniverseData }) {
  return (
    <ZombieEventFeed
      animations={data.animations}
      announcements={data.announcements}
      maxItems={20}
    />
  )
}
