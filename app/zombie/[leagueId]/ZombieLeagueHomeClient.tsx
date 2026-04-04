'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ZombieStatusBadge } from '@/app/zombie/components/ZombieStatusBadge'
import { ZombieEventFeed } from '@/app/zombie/components/ZombieEventFeed'
import { ZombieHordeBar } from '@/app/zombie/components/ZombieHordeBar'
import { ZombieWhispererCard } from '@/app/zombie/components/ZombieWhispererCard'

type TeamRow = {
  rosterId: string
  status: string
  wins: number
  losses: number
  pointsFor: number
  fantasyTeamName: string | null
  displayName: string | null
}

type Pack = {
  league: {
    name: string | null
    currentWeek: number
    isPaid: boolean
    potTotal: number
    whispererIsPublic: boolean
    universeId: string | null
    teams: TeamRow[]
    whispererRecord: {
      displayName: string
      ambushesRemaining: number
      isPubliclyRevealed: boolean
    } | null
    announcements: Array<{
      id: string
      type: string
      title: string
      content: string
      week: number | null
      createdAt: string
    }>
  }
  hordeSize: number
  survivorCount: number
  myTeam: TeamRow | null
}

export function ZombieLeagueHomeClient({ leagueId, userId }: { leagueId: string; userId: string | null }) {
  const [data, setData] = useState<Pack | null>(null)
  const [anims, setAnims] = useState<
    Array<{ id: string; animationType: string; week: number; metadata: unknown; createdAt: string }>
  >([])

  useEffect(() => {
    fetch(`/api/zombie/league?leagueId=${encodeURIComponent(leagueId)}`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Pack | null) => setData(d))
      .catch(() => setData(null))
  }, [leagueId])

  useEffect(() => {
    let cancelled = false
    const tick = async () => {
      const r = await fetch(`/api/zombie/event-feed?leagueId=${encodeURIComponent(leagueId)}`, {
        credentials: 'include',
      }).catch(() => null)
      if (!r?.ok || cancelled) return
      const j = (await r.json()) as {
        animations?: Array<{
          id: string
          animationType: string
          week: number
          metadata: unknown
          createdAt: string
        }>
      }
      if (j.animations) setAnims(j.animations)
    }
    void tick()
    const iv = setInterval(tick, 20_000)
    return () => {
      cancelled = true
      clearInterval(iv)
    }
  }, [leagueId])

  if (!data?.league) {
    return <p className="text-[13px] text-[var(--zombie-text-dim)]">Loading island…</p>
  }

  const z = data.league
  const my = data.myTeam
  const displayName = my?.fantasyTeamName || my?.displayName || 'Your team'

  const whispererRevealed = z.whispererIsPublic && (z.whispererRecord?.isPubliclyRevealed ?? true)

  const lastUpdate = z.announcements.find((a) => a.type === 'weekly_update' || a.type === 'weekly_recap')

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <section className="rounded-2xl border border-[var(--zombie-border)] bg-[var(--zombie-panel)] p-5">
        <p className="text-[11px] uppercase tracking-wide text-[var(--zombie-text-dim)]">Your status</p>
        {userId && my ? (
          <>
            <div className="mt-2 flex items-center gap-3">
              <div
                className="h-[72px] w-[72px] rounded-full ring-2 ring-[var(--zombie-green)] ring-offset-2 ring-offset-[var(--zombie-panel)]"
                aria-hidden
              />
              <div>
                <p className="text-lg font-bold text-white">{displayName}</p>
                <ZombieStatusBadge status={my.status} />
              </div>
            </div>
            <p className="mt-3 text-[12px] text-[var(--zombie-text-mid)]">
              Record {my.wins}-{my.losses} · PF {my.pointsFor.toFixed(1)}
            </p>
          </>
        ) : (
          <p className="mt-2 text-[12px] text-[var(--zombie-text-mid)]">
            Join this league to see your survivor card here.
          </p>
        )}
      </section>

      <ZombieWhispererCard
        revealed={whispererRevealed}
        displayName={z.whispererRecord?.displayName}
        ambushesRemaining={z.whispererRecord?.ambushesRemaining ?? 0}
        hordeSize={data.hordeSize}
      />

      <ZombieHordeBar hordeCount={data.hordeSize} survivorCount={data.survivorCount} />

      <section>
        <h2 className="mb-2 text-[12px] font-bold uppercase tracking-wide text-[var(--zombie-text-dim)]">
          Event feed
        </h2>
        <ZombieEventFeed
          animations={anims}
          announcements={z.announcements}
          maxItems={5}
          compact
          leagueId={leagueId}
          leagueName={z.name}
        />
      </section>

      <section className="rounded-xl border border-[var(--zombie-border)] bg-black/20 p-4">
        <p className="text-[11px] font-semibold text-[var(--zombie-red)]">Danger matchups</p>
        <p className="mt-1 text-[12px] text-[var(--zombie-text-mid)]">
          Survivors facing Zombies or the Whisperer are at infection risk. See{' '}
          <Link href={`/zombie/${leagueId}/matchups`} className="text-sky-400 underline">
            Matchups
          </Link>
          .
        </p>
      </section>

      <section className="rounded-xl border border-[var(--zombie-border)] bg-[var(--zombie-panel)] p-4">
        <p className="text-[11px] font-semibold text-[var(--zombie-text-dim)]">
          {z.isPaid ? 'Pot snapshot' : 'Points economy'}
        </p>
        <p className="mt-1 text-[14px] text-white">
          {z.isPaid ? `💰 Pot: $${(z.potTotal ?? 0).toFixed(2)}` : `🏅 Points in play: ${(z.potTotal ?? 0).toFixed(1)}`}
        </p>
      </section>

      {lastUpdate ? (
        <section className="rounded-xl border border-[var(--zombie-border)] bg-[var(--zombie-panel)] p-4">
          <p className="text-[11px] font-semibold text-[var(--zombie-text-dim)]">
            Latest update · Week {lastUpdate.week ?? '?'}
          </p>
          <p className="mt-1 line-clamp-4 whitespace-pre-wrap text-[12px] text-[var(--zombie-text-mid)]">
            {lastUpdate.content}
          </p>
        </section>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Link
          href={`/league/${leagueId}`}
          className="rounded-lg bg-sky-500/20 px-4 py-2 text-[12px] font-semibold text-sky-200"
          data-testid="zombie-go-chat"
        >
          Go to Chat
        </Link>
        <Link
          href={`/zombie/${leagueId}/standings`}
          className="rounded-lg border border-white/10 px-4 py-2 text-[12px] text-white/80"
        >
          Standings
        </Link>
        <Link
          href={`/zombie/${leagueId}/rules`}
          className="rounded-lg border border-white/10 px-4 py-2 text-[12px] text-white/80"
        >
          Rules
        </Link>
        {z.universeId ? (
          <Link
            href={`/zombie/universe/${z.universeId}`}
            className="rounded-lg border border-white/10 px-4 py-2 text-[12px] text-white/80"
          >
            Universe
          </Link>
        ) : null}
      </div>
    </div>
  )
}
