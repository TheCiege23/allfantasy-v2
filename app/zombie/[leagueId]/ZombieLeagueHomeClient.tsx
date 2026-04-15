'use client'

import Link from 'next/link'
import { type ReactNode, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowUpRight,
  Biohazard,
  Crosshair,
  FlaskConical,
  Shield,
  Skull,
  Sparkles,
  Swords,
  Trophy,
} from 'lucide-react'
import { ZombieStatusBadge } from '@/app/zombie/components/ZombieStatusBadge'
import { ZombieEventFeed } from '@/app/zombie/components/ZombieEventFeed'
import { ZombieHordeBar } from '@/app/zombie/components/ZombieHordeBar'
import { ZombieWhispererCard } from '@/app/zombie/components/ZombieWhispererCard'
import { LeagueClipOverlayHost } from '@/components/league/LeagueClipOverlayHost'

type TeamRow = {
  rosterId: string
  status: string
  wins: number
  losses: number
  pointsFor: number
  fantasyTeamName: string | null
  displayName: string | null
  riskScore?: number | null
  weeklyScore?: number | null
}

type Pack = {
  league: {
    name: string | null
    currentWeek: number
    isPaid: boolean
    potTotal: number
    whispererIsPublic: boolean
    universeId: string | null
    status?: string | null
    level?: {
      name?: string | null
      rankOrder?: number | null
    } | null
    counts?: {
      survivor?: number
      zombie?: number
      whisperer?: number
      revived?: number
      alive?: number
      total?: number
      horde?: number
    } | null
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
    latestResolution?: {
      status?: string | null
      resolvedAt?: string | null
    } | null
    topPerformers?: TeamRow[]
    dangerZone?: TeamRow[]
  }
  hordeSize: number
  survivorCount: number
  myTeam: TeamRow | null
  myActiveItemCount?: number
  myPendingItemCount?: number
  myResources?: {
    serums?: number
    weapons?: number
    activeItems?: number
    pendingItems?: number
  } | null
  recentInfections?: Array<{ id: string }>
  recentBashings?: Array<{ id: string }>
  recentMaulings?: Array<{ id: string }>
}

type FeedAnimation = {
  id: string
  animationType: string
  week: number
  metadata: unknown
  createdAt: string
}

function teamName(team: TeamRow | null | undefined) {
  if (!team) return 'Unknown team'
  return team.fantasyTeamName || team.displayName || team.rosterId
}

function toDangerLevel(score?: number | null): 'stable' | 'exposed' | 'critical' | 'doomed' {
  if ((score ?? 0) >= 80) return 'doomed'
  if ((score ?? 0) >= 55) return 'critical'
  if ((score ?? 0) >= 30) return 'exposed'
  return 'stable'
}

function summaryLine(data: Pack['league'], pack: Pack) {
  const infections = pack.recentInfections?.length ?? 0
  const bashings = pack.recentBashings?.length ?? 0
  const maulings = pack.recentMaulings?.length ?? 0
  const living = data.counts?.alive ?? pack.survivorCount
  const horde = data.counts?.horde ?? pack.hordeSize

  return `${living} alive, ${horde} in the horde, ${infections} new infections, ${bashings} bashings, ${maulings} maulings.`
}

function StatCard({
  label,
  value,
  tone,
  icon,
  hint,
}: {
  label: string
  value: string
  tone: 'emerald' | 'rose' | 'amber' | 'sky'
  icon: ReactNode
  hint: string
}) {
  const toneClasses =
    tone === 'emerald'
      ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-100'
      : tone === 'amber'
        ? 'border-amber-500/20 bg-amber-500/10 text-amber-100'
        : tone === 'sky'
          ? 'border-sky-500/20 bg-sky-500/10 text-sky-100'
          : 'border-rose-500/20 bg-rose-500/10 text-rose-100'

  return (
    <div className={`rounded-2xl border p-4 ${toneClasses}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55">{label}</p>
        <div className="text-white/80">{icon}</div>
      </div>
      <p className="mt-3 text-2xl font-black">{value}</p>
      <p className="mt-1 text-xs text-white/60">{hint}</p>
    </div>
  )
}

export function ZombieLeagueHomeClient({ leagueId, userId }: { leagueId: string; userId: string | null }) {
  const [data, setData] = useState<Pack | null>(null)
  const [anims, setAnims] = useState<FeedAnimation[]>([])

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
      const j = (await r.json()) as { animations?: FeedAnimation[] }
      if (j.animations) setAnims(j.animations)
    }
    void tick()
    const iv = setInterval(tick, 20_000)
    return () => {
      cancelled = true
      clearInterval(iv)
    }
  }, [leagueId])

  const topPerformers = useMemo(() => {
    if (!data?.league?.topPerformers?.length) return []
    return data.league.topPerformers.slice(0, 3)
  }, [data])

  if (!data?.league) {
    return <p className="text-[13px] text-[var(--zombie-text-dim)]">Loading island...</p>
  }

  const z = data.league
  const my = data.myTeam
  const displayName = teamName(my)
  const whispererRevealed = z.whispererIsPublic && (z.whispererRecord?.isPubliclyRevealed ?? true)
  const lastUpdate = z.announcements.find((a) => a.type === 'weekly_update' || a.type === 'weekly_recap')
  const hordeCount = z.counts?.horde ?? data.hordeSize
  const survivorCount = z.counts?.alive ?? data.survivorCount
  const leagueTier = z.level?.name ?? `Tier ${z.level?.rankOrder ?? 1}`
  const myDanger = toDangerLevel(my?.riskScore)
  const hasUrgentRisk = myDanger === 'critical' || myDanger === 'doomed'
  const inventory = data.myResources ?? {}
  const quickActions = [
    {
      href: `/zombie/${leagueId}/matchups`,
      label: hasUrgentRisk ? 'Check Risk Matchup' : 'Open Matchups',
      tone: 'bg-rose-600/20 text-rose-100 border-rose-500/25',
    },
    {
      href: `/zombie/${leagueId}/items`,
      label: (inventory.serums ?? 0) > 0 ? 'Use Serum or Weapon' : 'Open Inventory',
      tone: 'bg-sky-600/20 text-sky-100 border-sky-500/25',
    },
    {
      href: `/zombie/${leagueId}/chat`,
      label: 'Open Chat + @Chimmy',
      tone: 'bg-amber-600/20 text-amber-100 border-amber-500/25',
    },
  ]

  return (
    <>
      <LeagueClipOverlayHost leagueId={leagueId} variant="zombie" enabled={Boolean(userId)} />
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <section className="overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(239,68,68,0.22),transparent_30%),radial-gradient(circle_at_top_right,rgba(250,204,21,0.08),transparent_32%),linear-gradient(180deg,rgba(14,15,20,0.98),rgba(10,11,15,0.98))] p-5 shadow-[0_18px_80px_rgba(0,0,0,0.35)] sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-rose-500/25 bg-rose-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-rose-100">
                Zombie Mode
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70">
                {leagueTier}
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70">
                Week {z.currentWeek}
              </span>
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl">{z.name ?? 'Zombie League'}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/72">
              Live outbreak control room for standings, danger, items, the Whisperer, and every major event this week.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {quickActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className={`inline-flex min-h-[44px] items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold transition hover:brightness-110 ${action.tone}`}
                >
                  {action.label}
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              ))}
            </div>
          </div>

          <div className="grid min-w-full grid-cols-2 gap-3 sm:min-w-[360px] sm:grid-cols-4 lg:max-w-[420px]">
            <StatCard
              label="Survivors"
              value={String(survivorCount)}
              tone="emerald"
              icon={<Shield className="h-4 w-4" />}
              hint="Still alive"
            />
            <StatCard
              label="Horde"
              value={String(hordeCount)}
              tone="rose"
              icon={<Biohazard className="h-4 w-4" />}
              hint="Infected teams"
            />
            <StatCard
              label="Whisperer"
              value={String(z.counts?.whisperer ?? 0)}
              tone="amber"
              icon={<Sparkles className="h-4 w-4" />}
              hint="Shadow role active"
            />
            <StatCard
              label={z.isPaid ? 'Weekly Pot' : 'In Play'}
              value={z.isPaid ? `$${(z.potTotal ?? 0).toFixed(0)}` : `${(z.potTotal ?? 0).toFixed(0)}`}
              tone="sky"
              icon={<Trophy className="h-4 w-4" />}
              hint={z.isPaid ? 'Cash on the line' : 'Points economy'}
            />
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_0.9fr]">
        <section className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <section className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(18,20,27,0.96),rgba(10,11,15,0.98))] p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">Your Status</p>
                  <h2 className="mt-2 text-2xl font-black text-white">{displayName}</h2>
                </div>
                {my ? <ZombieStatusBadge status={my.status} dangerLevel={myDanger} /> : null}
              </div>

              {my ? (
                <>
                  <p className="mt-4 text-sm text-white/70">
                    Record {my.wins}-{my.losses} with {my.pointsFor.toFixed(1)} season points.
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-white/45">Danger</p>
                      <p className={`mt-2 text-sm font-bold ${hasUrgentRisk ? 'text-rose-200' : 'text-emerald-200'}`}>
                        {myDanger === 'stable' ? 'Stable' : myDanger === 'exposed' ? 'Exposed' : myDanger === 'critical' ? 'Critical' : 'Doomed'}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-white/45">Serums</p>
                      <p className="mt-2 text-sm font-bold text-sky-100">{inventory.serums ?? 0}</p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-white/45">Weapons</p>
                      <p className="mt-2 text-sm font-bold text-amber-100">{inventory.weapons ?? 0}</p>
                    </div>
                  </div>
                  <div className={`mt-4 rounded-2xl border p-4 ${hasUrgentRisk ? 'border-rose-500/25 bg-rose-500/10' : 'border-emerald-500/20 bg-emerald-500/8'}`}>
                    <div className="flex items-start gap-3">
                      <AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${hasUrgentRisk ? 'text-rose-200' : 'text-emerald-200'}`} />
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {hasUrgentRisk ? 'You are at real infection risk this week.' : 'You are not in the hottest danger pocket right now.'}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-white/65">
                          {hasUrgentRisk
                            ? 'Open Matchups and Chat before lock. The UI is treating your status as urgent based on current team risk and outbreak pressure.'
                            : 'Keep watching the feed, inventory, and Whisperer activity. The danger board updates as events land.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <p className="mt-4 text-sm text-white/65">Join this league to unlock your personal survival card, danger tracking, and inventory actions.</p>
              )}
            </section>

            <div className="space-y-4">
              <ZombieWhispererCard
                revealed={whispererRevealed}
                displayName={z.whispererRecord?.displayName}
                ambushesRemaining={z.whispererRecord?.ambushesRemaining ?? 0}
                hordeSize={hordeCount}
              />
              <section className="rounded-3xl border border-white/10 bg-[var(--zombie-panel)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">Inventory Snapshot</p>
                  <FlaskConical className="h-4 w-4 text-sky-200" />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-white/45">Active</p>
                    <p className="mt-2 text-lg font-black text-white">{inventory.activeItems ?? data.myActiveItemCount ?? 0}</p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-white/45">Pending</p>
                    <p className="mt-2 text-lg font-black text-white">{inventory.pendingItems ?? data.myPendingItemCount ?? 0}</p>
                  </div>
                </div>
                <Link
                  href={`/zombie/${leagueId}/items`}
                  className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/85 transition hover:bg-white/[0.08]"
                >
                  Open inventory
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </section>
            </div>
          </div>

          <section className="rounded-3xl border border-white/10 bg-[var(--zombie-panel)] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">Horde Growth Tracker</p>
                <h2 className="mt-2 text-lg font-bold text-white">Outbreak pressure</h2>
              </div>
              <Skull className="h-5 w-5 text-rose-200" />
            </div>
            <div className="mt-4">
              <ZombieHordeBar hordeCount={hordeCount} survivorCount={survivorCount} />
            </div>
            <p className="mt-4 text-sm text-white/65">{summaryLine(z, data)}</p>
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-3xl border border-white/10 bg-[var(--zombie-panel)] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">Danger Zone</p>
                  <h2 className="mt-2 text-lg font-bold text-white">Managers under pressure</h2>
                </div>
                <Crosshair className="h-5 w-5 text-rose-200" />
              </div>
              <div className="mt-4 space-y-3">
                {(z.dangerZone?.length ? z.dangerZone : z.teams).slice(0, 4).map((team, index) => (
                  <div key={team.rosterId} className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">Hot Seat {index + 1}</p>
                      <p className="truncate text-sm font-semibold text-white">{teamName(team)}</p>
                    </div>
                    <ZombieStatusBadge status={team.status} dangerLevel={toDangerLevel(team.riskScore)} />
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-[var(--zombie-panel)] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">Weekly Update</p>
                  <h2 className="mt-2 text-lg font-bold text-white">Command summary</h2>
                </div>
                <Sparkles className="h-5 w-5 text-amber-200" />
              </div>
              {lastUpdate ? (
                <>
                  <p className="mt-4 text-sm font-semibold text-white">Week {lastUpdate.week ?? z.currentWeek}</p>
                  <p className="mt-2 line-clamp-6 whitespace-pre-wrap text-sm leading-6 text-white/70">{lastUpdate.content}</p>
                </>
              ) : (
                <p className="mt-4 text-sm text-white/60">No weekly recap has been posted yet. The home screen is still tracking live events below.</p>
              )}
              {z.latestResolution?.status ? (
                <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-xs text-white/60">
                  Latest resolution status: <span className="capitalize text-white/85">{z.latestResolution.status}</span>
                </div>
              ) : null}
            </section>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-3xl border border-white/10 bg-[var(--zombie-panel)] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">Recent Events Feed</p>
                <h2 className="mt-2 text-lg font-bold text-white">Outbreak timeline</h2>
              </div>
              <Swords className="h-5 w-5 text-rose-200" />
            </div>
            <div className="mt-4">
              <ZombieEventFeed
                animations={anims}
                announcements={z.announcements}
                maxItems={5}
                compact
                leagueId={leagueId}
                leagueName={z.name}
              />
            </div>
            <Link
              href={`/zombie/${leagueId}/history`}
              className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/85 transition hover:bg-white/[0.08]"
            >
              Open full history
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </section>

          <section className="rounded-3xl border border-white/10 bg-[var(--zombie-panel)] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">Top Performers</p>
                <h2 className="mt-2 text-lg font-bold text-white">Leaders this week</h2>
              </div>
              <Trophy className="h-5 w-5 text-amber-200" />
            </div>
            <div className="mt-4 space-y-3">
              {(topPerformers.length ? topPerformers : z.teams.slice(0, 3)).map((team, index) => (
                <div key={team.rosterId} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">Performer {index + 1}</p>
                      <p className="truncate text-sm font-semibold text-white">{teamName(team)}</p>
                    </div>
                    <ZombieStatusBadge status={team.status} />
                  </div>
                  <p className="mt-2 text-xs text-white/60">
                    Season points {team.pointsFor.toFixed(1)}
                    {typeof team.weeklyScore === 'number' ? ` | Week score ${team.weeklyScore.toFixed(1)}` : ''}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-[var(--zombie-panel)] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">Navigation</p>
                <h2 className="mt-2 text-lg font-bold text-white">Jump to live surfaces</h2>
              </div>
              <ArrowUpRight className="h-5 w-5 text-sky-200" />
            </div>
            <div className="mt-4 grid gap-2">
              <Link href={`/zombie/${leagueId}/standings`} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white/85 transition hover:bg-white/[0.08]">
                Standings and status map
              </Link>
              <Link href={`/zombie/${leagueId}/matchups`} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white/85 transition hover:bg-white/[0.08]">
                Matchups and infection risk
              </Link>
              <Link href={`/zombie/${leagueId}/chat`} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white/85 transition hover:bg-white/[0.08]">
                League chat and @Chimmy
              </Link>
              {z.universeId ? (
                <Link href={`/app/zombie-universe/${z.universeId}`} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white/85 transition hover:bg-white/[0.08]">
                  Universe war room
                </Link>
              ) : null}
            </div>
          </section>
        </aside>
      </div>
    </div>
    </>
  )
}
