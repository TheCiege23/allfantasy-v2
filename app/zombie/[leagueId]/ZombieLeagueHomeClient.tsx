'use client'

import Link from 'next/link'
import { useEffect, useState, useCallback } from 'react'
import clsx from 'clsx'
import { ZombieStatusBadge } from '@/app/zombie/components/ZombieStatusBadge'
import { ZombieEventFeed } from '@/app/zombie/components/ZombieEventFeed'
import { ZombieHordeBar } from '@/app/zombie/components/ZombieHordeBar'
import { ZombieWhispererCard } from '@/app/zombie/components/ZombieWhispererCard'
import { ZOMBIE_ITEM_ICON } from '@/lib/zombie/iconSystem'

type TeamRow = {
  rosterId: string
  status: string
  wins: number
  losses: number
  pointsFor: number
  fantasyTeamName: string | null
  displayName: string | null
  isWhisperer?: boolean
  weekBecameZombie?: number | null
  serumsHeld?: number
  weaponsHeld?: number
}

type Pack = {
  league: {
    name: string | null
    currentWeek: number
    isPaid: boolean
    potTotal: number
    whispererIsPublic: boolean
    universeId: string | null
    sport: string | null
    tierLabel: string | null
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
  dangerMatchups?: Array<{ opponentName: string; opponentStatus: string; riskLevel: string }>
  topPerformers?: Array<{ name: string; score: number; status: string }>
}

type AnimRow = { id: string; animationType: string; week: number; metadata: unknown; createdAt: string }

const STATUS_EMOJI: Record<string, string> = {
  survivor: '🧍',
  zombie: '🧟',
  whisperer: '🎭',
  revived: '⚡',
  eliminated: '💀',
}

function getStatusKey(s: string): string {
  const lower = s.toLowerCase()
  if (lower.includes('whisperer')) return 'whisperer'
  if (lower.includes('zombie')) return 'zombie'
  if (lower.includes('revived')) return 'revived'
  if (lower.includes('eliminat')) return 'eliminated'
  return 'survivor'
}

export function ZombieLeagueHomeClient({ leagueId, userId }: { leagueId: string; userId: string | null }) {
  const [data, setData] = useState<Pack | null>(null)
  const [anims, setAnims] = useState<AnimRow[]>([])
  const [newAnimCount, setNewAnimCount] = useState(0)
  const [lastAnimId, setLastAnimId] = useState<string | null>(null)
  const [pulseActive, setPulseActive] = useState(false)

  useEffect(() => {
    fetch(`/api/zombie/league?leagueId=${encodeURIComponent(leagueId)}`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Pack | null) => setData(d))
      .catch(() => setData(null))
  }, [leagueId])

  const pollEvents = useCallback(async () => {
    const r = await fetch(`/api/zombie/event-feed?leagueId=${encodeURIComponent(leagueId)}`, {
      credentials: 'include',
    }).catch(() => null)
    if (!r?.ok) return
    const j = (await r.json()) as { animations?: AnimRow[] }
    if (j.animations) {
      setAnims(j.animations)
      if (j.animations[0] && j.animations[0].id !== lastAnimId) {
        setNewAnimCount((c) => c + 1)
        setLastAnimId(j.animations[0].id)
        setPulseActive(true)
        setTimeout(() => setPulseActive(false), 2000)
      }
    }
  }, [leagueId, lastAnimId])

  useEffect(() => {
    void pollEvents()
    const iv = setInterval(pollEvents, 12_000)
    return () => clearInterval(iv)
  }, [pollEvents])

  if (!data?.league) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--zombie-crimson)] border-t-transparent" />
          <p className="text-[13px] text-[var(--zombie-text-dim)]">Entering the island...</p>
        </div>
      </div>
    )
  }

  const z = data.league
  const my = data.myTeam
  const displayName = my?.fantasyTeamName || my?.displayName || 'Your team'
  const whispererRevealed = z.whispererIsPublic && (z.whispererRecord?.isPubliclyRevealed ?? true)
  const lastUpdate = z.announcements.find((a) => a.type === 'weekly_update' || a.type === 'weekly_recap')
  const recentInfections = anims.filter((a) =>
    a.animationType === 'zombie_turn' || a.animationType === 'infection',
  ).slice(0, 3)
  const statusKey = my ? getStatusKey(my.status) : 'survivor'
  const total = data.hordeSize + data.survivorCount
  const hordePct = total > 0 ? Math.round((data.hordeSize / total) * 100) : 0

  // Top performers from sorted teams
  const topPerformers = [...(z.teams || [])].sort((a, b) => b.pointsFor - a.pointsFor).slice(0, 3)

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-3">
      {/* League header bar */}
      <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-[var(--zombie-crimson)]/10 via-transparent to-[var(--zombie-purple)]/10 px-4 py-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--zombie-text-dim)]">
            {z.tierLabel ?? 'Zombie League'} · Week {z.currentWeek}
          </p>
          <p className="text-[14px] font-bold text-[var(--zombie-text-full)]">{z.name ?? 'Zombie League'}</p>
        </div>
        <div className="flex gap-3 text-[11px]">
          <span className="text-[var(--zombie-green)]">🧍 {data.survivorCount}</span>
          <span className="text-[var(--zombie-purple)]">🧟 {data.hordeSize}</span>
          <span className="text-[var(--zombie-text-dim)]">{hordePct}%</span>
        </div>
      </div>

      {/* YOUR STATUS — Hero card */}
      <section
        className={clsx(
          'overflow-hidden rounded-2xl border bg-[var(--zombie-panel)]',
          statusKey === 'zombie' && 'border-[var(--zombie-purple)]/40',
          statusKey === 'whisperer' && 'border-[var(--zombie-crimson)]/40',
          statusKey === 'revived' && 'border-[var(--zombie-gold)]/40',
          statusKey === 'survivor' && 'border-[var(--zombie-green)]/30',
          statusKey === 'eliminated' && 'border-[var(--zombie-gray)]/30',
        )}
      >
        <div
          className={clsx(
            'p-5',
            statusKey === 'zombie' && 'bg-gradient-to-br from-[var(--zombie-purple)]/8 to-transparent',
            statusKey === 'whisperer' && 'bg-gradient-to-br from-[var(--zombie-crimson)]/8 to-transparent',
            statusKey === 'revived' && 'bg-gradient-to-br from-[var(--zombie-gold)]/8 to-transparent',
            statusKey === 'survivor' && 'bg-gradient-to-br from-[var(--zombie-green)]/5 to-transparent',
          )}
        >
          {userId && my ? (
            <>
              <div className="flex items-center gap-4">
                <div
                  className={clsx(
                    'flex h-[76px] w-[76px] items-center justify-center rounded-full text-4xl ring-3 ring-offset-2 ring-offset-[var(--zombie-panel)]',
                    statusKey === 'zombie' && 'ring-[var(--zombie-purple)] bg-[var(--zombie-purple)]/10',
                    statusKey === 'whisperer' && 'ring-[var(--zombie-crimson)] bg-[var(--zombie-crimson)]/10 animate-pulse',
                    statusKey === 'revived' && 'ring-[var(--zombie-gold)] bg-[var(--zombie-gold)]/10',
                    statusKey === 'survivor' && 'ring-[var(--zombie-green)] bg-[var(--zombie-green)]/10',
                    statusKey === 'eliminated' && 'ring-[var(--zombie-gray)] bg-white/5',
                  )}
                >
                  {STATUS_EMOJI[statusKey] ?? '🧍'}
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--zombie-text-dim)]">
                    Your Status
                  </p>
                  <p className="text-xl font-black text-white">{displayName}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <ZombieStatusBadge status={my.status} />
                    <span className="text-[12px] text-[var(--zombie-text-mid)]">
                      {my.wins}-{my.losses} · {my.pointsFor.toFixed(1)} PF
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick inventory bar */}
              <div className="mt-3 flex flex-wrap gap-2">
                {my.serumsHeld ? (
                  <Link
                    href={`/zombie/${leagueId}/items`}
                    className="flex items-center gap-1.5 rounded-lg bg-teal-500/12 px-3 py-1.5 text-[11px] font-semibold text-teal-300 transition hover:bg-teal-500/20"
                  >
                    {ZOMBIE_ITEM_ICON.serum_antidote} {my.serumsHeld} serum{my.serumsHeld > 1 ? 's' : ''}
                  </Link>
                ) : null}
                {my.weaponsHeld ? (
                  <Link
                    href={`/zombie/${leagueId}/items`}
                    className="flex items-center gap-1.5 rounded-lg bg-white/[0.06] px-3 py-1.5 text-[11px] font-semibold text-white/70 transition hover:bg-white/[0.08]"
                  >
                    ⚔️ {my.weaponsHeld} weapon{my.weaponsHeld > 1 ? 's' : ''}
                  </Link>
                ) : null}
                {statusKey === 'zombie' && (
                  <span className="flex items-center gap-1 rounded-lg bg-[var(--zombie-purple)]/12 px-3 py-1.5 text-[11px] font-semibold text-[var(--zombie-purple)]">
                    🧟 INFECTED — Week {my.weekBecameZombie ?? '?'}
                  </span>
                )}
              </div>
            </>
          ) : (
            <p className="text-[13px] text-[var(--zombie-text-mid)]">
              Join this league to see your survivor card here.
            </p>
          )}
        </div>
      </section>

      {/* Whisperer spotlight */}
      <ZombieWhispererCard
        revealed={whispererRevealed}
        displayName={z.whispererRecord?.displayName}
        ambushesRemaining={z.whispererRecord?.ambushesRemaining ?? 0}
        hordeSize={data.hordeSize}
      />

      {/* Horde growth tracker */}
      <ZombieHordeBar hordeCount={data.hordeSize} survivorCount={data.survivorCount} />

      {/* Danger zone + at-risk indicator */}
      {data.dangerMatchups && data.dangerMatchups.length > 0 ? (
        <section className="rounded-xl border border-[var(--zombie-red)]/30 bg-[var(--zombie-red)]/[0.04] p-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--zombie-red)]">
            Danger Zone — You Are At Risk
          </p>
          <div className="mt-2 space-y-1.5">
            {data.dangerMatchups.map((d, i) => (
              <div key={i} className="flex items-center gap-2 text-[12px]">
                <span className="text-[var(--zombie-red)]">⚠️</span>
                <span className="text-[var(--zombie-text-mid)]">
                  vs <span className="font-semibold text-white">{d.opponentName}</span>
                </span>
                <ZombieStatusBadge status={d.opponentStatus} compact />
                <span
                  className={clsx(
                    'rounded px-1.5 py-0.5 text-[9px] font-bold',
                    d.riskLevel === 'critical' && 'animate-pulse bg-red-500/30 text-red-100',
                    d.riskLevel === 'high' && 'bg-red-500/20 text-red-200',
                    d.riskLevel === 'medium' && 'bg-amber-500/20 text-amber-200',
                    d.riskLevel === 'low' && 'bg-green-500/20 text-green-200',
                  )}
                >
                  {d.riskLevel?.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="rounded-xl border border-[var(--zombie-border)] bg-black/20 p-4">
          <p className="text-[11px] font-semibold text-[var(--zombie-red)]">Danger Zone</p>
          <p className="mt-1 text-[12px] text-[var(--zombie-text-mid)]">
            Survivors facing Zombies or the Whisperer are at infection risk. See{' '}
            <Link href={`/zombie/${leagueId}/matchups`} className="text-sky-400 underline">
              Matchups
            </Link>.
          </p>
        </section>
      )}

      {/* Recent infections alert */}
      {recentInfections.length > 0 && (
        <section
          className={clsx(
            'rounded-xl border border-[var(--zombie-purple)]/30 bg-[var(--zombie-purple)]/[0.04] p-4',
            pulseActive && 'zombie-turn-anim',
          )}
        >
          <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--zombie-purple)]">
            Recent Infections
          </p>
          <div className="mt-2 space-y-1.5">
            {recentInfections.map((a) => {
              const meta = (a.metadata ?? {}) as Record<string, unknown>
              return (
                <p key={a.id} className="text-[12px] text-[var(--zombie-text-mid)]">
                  🧟 {typeof meta.victimName === 'string' ? meta.victimName : 'A survivor'} was turned
                  {typeof meta.infectorName === 'string' ? ` by ${meta.infectorName}` : ''}
                  {a.week ? ` · Wk ${a.week}` : ''}
                </p>
              )
            })}
          </div>
        </section>
      )}

      {/* Event feed */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[12px] font-bold uppercase tracking-wide text-[var(--zombie-text-dim)]">
            Event Feed
          </h2>
          {newAnimCount > 0 && (
            <span className="rounded-full bg-[var(--zombie-crimson)]/20 px-2 py-0.5 text-[10px] font-bold text-[var(--zombie-crimson)]">
              {newAnimCount} new
            </span>
          )}
        </div>
        <ZombieEventFeed
          animations={anims}
          announcements={z.announcements}
          maxItems={4}
          compact
          leagueId={leagueId}
          leagueName={z.name}
          animate
        />
      </section>

      {/* Top performers */}
      {topPerformers.length > 0 && (
        <section className="rounded-xl border border-[var(--zombie-border)] bg-[var(--zombie-panel)] p-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--zombie-text-dim)]">
            Top Performers
          </p>
          <div className="mt-2 space-y-1.5">
            {topPerformers.map((t, i) => (
              <div key={t.rosterId} className="flex items-center justify-between text-[12px]">
                <div className="flex items-center gap-2">
                  <span className="text-[var(--zombie-text-dim)]">#{i + 1}</span>
                  <span className="font-medium text-[var(--zombie-text-full)]">
                    {t.fantasyTeamName || t.displayName || t.rosterId}
                  </span>
                  <ZombieStatusBadge status={t.status} compact />
                </div>
                <span className="font-mono text-[var(--zombie-text-mid)]">{t.pointsFor.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Economy snapshot */}
      <section className="rounded-xl border border-[var(--zombie-border)] bg-[var(--zombie-panel)] p-4">
        <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--zombie-text-dim)]">
          {z.isPaid ? 'Weekly Pot' : 'Points Economy'}
        </p>
        <p className="mt-1 text-xl font-black text-white">
          {z.isPaid ? `$${(z.potTotal ?? 0).toFixed(2)}` : `${(z.potTotal ?? 0).toFixed(1)} pts`}
        </p>
      </section>

      {/* Latest weekly update */}
      {lastUpdate ? (
        <section className="rounded-xl border border-[var(--zombie-border)] bg-[var(--zombie-panel)] p-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--zombie-text-dim)]">
              Latest Update · Week {lastUpdate.week ?? '?'}
            </p>
            <span className="text-[10px] text-[var(--zombie-text-dim)]">
              {new Date(lastUpdate.createdAt).toLocaleDateString()}
            </span>
          </div>
          <p className="mt-2 line-clamp-5 whitespace-pre-wrap text-[12px] text-[var(--zombie-text-mid)]">
            {lastUpdate.content}
          </p>
        </section>
      ) : null}

      {/* Quick action nav */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {[
          { href: `/zombie/${leagueId}/chat`, label: 'Chat', icon: '💬' },
          { href: `/zombie/${leagueId}/standings`, label: 'Standings', icon: '📊' },
          { href: `/zombie/${leagueId}/matchups`, label: 'Matchups', icon: '🎯' },
          { href: `/zombie/${leagueId}/items`, label: 'Items', icon: '🎒' },
          { href: `/zombie/${leagueId}/rules`, label: 'Rules', icon: '📜' },
          ...(z.universeId ? [{ href: `/zombie/universe/${z.universeId}`, label: 'Universe', icon: '🌍' }] : []),
        ].map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className="flex flex-col items-center gap-1 rounded-xl border border-[var(--zombie-border)] bg-[var(--zombie-panel)] p-3 text-center transition hover:bg-white/[0.03]"
          >
            <span className="text-lg">{n.icon}</span>
            <span className="text-[10px] font-semibold text-[var(--zombie-text-mid)]">{n.label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
