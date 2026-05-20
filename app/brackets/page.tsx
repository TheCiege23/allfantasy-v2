import Link from "next/link"
import Image from "next/image"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { areBracketChallengesEnabled, getEnabledSports } from "@/lib/feature-toggle"
import { Trophy, Plus, Users, ChevronRight, Star, Shield, Zap, Crown, ExternalLink, Sparkles, AlertTriangle, Scale, Heart, Globe2 } from "lucide-react"
import BracketShell from "@/components/bracket/BracketShell"
import EngagementEventTracker from "@/components/engagement/EngagementEventTracker"
import BracketHomeTabs from "@/components/bracket/BracketHomeTabs"
import MyPoolsTab from "@/components/bracket/MyPoolsTab"
import BracketAICoachTab from "@/components/bracket/BracketAICoachTab"
import CreatePoolTab from "@/components/bracket/CreatePoolTab"
import PlayoffChallengeTab from "@/components/bracket/PlayoffChallengeTab"
import QuickCreatePlayoffPoolButton from "@/components/bracket/QuickCreatePlayoffPoolButton"
import JoinPoolTab from "@/components/bracket/JoinPoolTab"
import StandingsTab from "@/components/bracket/StandingsTab"
import BracketHistoryTab from "@/components/bracket/BracketHistoryTab"
import {
  buildLoginHrefWithIntent,
  buildSignupHrefWithIntent,
} from "@/lib/auth/PostAuthIntentRouter"
import { SUPPORTED_SPORTS } from "@/lib/sport-scope"
import { resolveBracketChallengeLabel, resolveBracketSportUI } from "@/lib/bracket-challenge"
import { resolveMyPoolCardHref, resolvePlayoffCardHref, resolvePlayoffCardMode } from "@/lib/playoffs/playoffHomeRouting"
import { listUserWorldCupChallenges } from "@/lib/world-cup"

export const dynamic = "force-dynamic"

type SessionUser = { id?: string; email?: string | null; name?: string | null }
type PlayoffHomePool = {
  challengeId: string
  sport: "nba" | "nhl"
  name: string
  members: number
  entries: number
}

type WorldCupHomePool = {
  challengeId: string
  name: string
  members: number
  entries: number
}

type HomePoolCard = {
  id: string
  href: string
  name: string
  members: number
  entries: number
  sport: string | null
  challengeType: string | null
  bracketType: string | null
}

function isLegacyWorldCupPoolRow(member: any): boolean {
  const league = member?.league
  const sport = String(league?.tournament?.sport ?? "").toLowerCase()
  const tournamentName = String(league?.tournament?.name ?? "").toLowerCase()
  const leagueName = String(league?.name ?? "").toLowerCase()
  const challengeType = String(league?.scoringRules?.challengeType ?? "").toLowerCase()
  const bracketType = String(league?.scoringRules?.bracketType ?? "").toLowerCase()

  return (
    sport === "soccer" &&
    (
      tournamentName.includes("world cup") ||
      leagueName.includes("world cup") ||
      challengeType.includes("world_cup") ||
      challengeType.includes("world-cup") ||
      bracketType.includes("world_cup") ||
      bracketType.includes("world-cup")
    )
  )
}

function isLegacyPlayoffPoolRow(member: any): boolean {
  const league = member?.league
  const sport = String(league?.tournament?.sport ?? "").toUpperCase()

  return sport === "NBA" || sport === "NHL"
}

function isExpectedBracketLoadError(err: unknown): boolean {
  if (!err) return false
  const errObj = err as any
  const errStr = String(err)
  return (
    errObj?.code === "P2021" ||
    errObj?.code === "P2022" ||
    errObj?.code === "P2025" ||
    errObj?.name === "PrismaClientValidationError" ||
    errStr.includes("PrismaClientValidationError") ||
    errStr.includes("does not exist in the current database") ||
    errStr.includes("Unknown field") ||
    errStr.includes("is not a function") ||
    errStr.includes("is undefined") ||
    errStr.includes("Cannot read")
  )
}

function sanitizeError(err: unknown): string {
  const asString = String(err ?? "unknown")
  return asString.length > 220 ? `${asString.slice(0, 220)}...` : asString
}

function BracketHomeFallback({ sports }: { sports: string[] }) {
  return (
    <div className="min-h-screen mode-surface mode-readable">
      <div className="mx-auto max-w-5xl space-y-4 p-4 sm:p-6">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h1 className="text-xl font-bold text-white">Bracket Challenges</h1>
          <p className="mt-2 text-sm text-white/70">
            Pools could not be loaded. You can still create or join a pool.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/brackets/leagues/new" className="rounded-lg bg-sky-500 px-3 py-2 text-sm font-semibold text-white">
              Create Pool
            </Link>
            <Link href="/brackets/join" className="rounded-lg border border-white/20 px-3 py-2 text-sm font-semibold text-white/85">
              Join Pool
            </Link>
          </div>
        </div>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <h2 className="text-sm font-semibold text-white">Sports</h2>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {sports.map((sport) => (
              <Link
                key={sport}
                href="/brackets"
                className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-center text-xs font-semibold text-white/80"
              >
                {String(sport).toUpperCase()}
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <h2 className="text-sm font-semibold text-white">My Pools</h2>
          <p className="mt-2 text-sm text-white/65">No pools yet. Create or join a pool to get started.</p>
        </section>
      </div>
    </div>
  )
}

async function safeGetSessionUser() {
  try {
    const session = (await getServerSession(authOptions as any)) as { user?: SessionUser } | null
    return session?.user as SessionUser | undefined
  } catch (err) {
    console.warn("[brackets/page] safeGetSessionUser fallback", {
      route: "/brackets",
      functionName: "safeGetSessionUser",
      error: sanitizeError(err),
    })
    return undefined
  }
}

async function safeGetLegacyBracketPools(userId: string | undefined) {
  if (!userId) return []
  try {
    return await (prisma as any).bracketLeagueMember.findMany({
      where: { userId },
      include: {
        league: {
          select: {
            id: true,
            name: true,
            joinCode: true,
            scoringRules: true,
            tournament: { select: { name: true, season: true, sport: true } },
            _count: { select: { members: true, entries: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    })
  } catch (err) {
    if (!isExpectedBracketLoadError(err)) {
      console.warn("[brackets/page] safeGetLegacyBracketPools unexpected fallback", {
        route: "/brackets",
        functionName: "safeGetLegacyBracketPools",
        error: sanitizeError(err),
      })
      return []
    }
    console.warn("[brackets/page] safeGetLegacyBracketPools expected fallback", {
      route: "/brackets",
      functionName: "safeGetLegacyBracketPools",
      error: sanitizeError(err),
    })
    return []
  }
}

async function safeGetPlayoffPools(userId: string | undefined): Promise<PlayoffHomePool[]> {
  if (!userId) return []
  try {
    const rows = await (prisma as any).playoffBracketChallenge.findMany({
      where: {
        OR: [
          { ownerUserId: userId },
          {
            entries: {
              some: { userId },
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        sport: true,
        ownerUserId: true,
        entries: {
          select: {
            userId: true,
          },
        },
        _count: {
          select: {
            entries: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })
    const pools: PlayoffHomePool[] = []
    for (const row of rows ?? []) {
      const challengeId = typeof row?.id === "string" ? row.id.trim() : ""
      const sport = String(row?.sport ?? "").toLowerCase()
      const name = typeof row?.name === "string" ? row.name.trim() : ""
      if (!challengeId || !name) continue
      if (sport !== "nba" && sport !== "nhl") continue
      const participantIds = new Set<string>()
      if (typeof row?.ownerUserId === "string" && row.ownerUserId.trim()) {
        participantIds.add(row.ownerUserId)
      }
      for (const entry of Array.isArray(row?.entries) ? row.entries : []) {
        if (typeof entry?.userId === "string" && entry.userId.trim()) {
          participantIds.add(entry.userId)
        }
      }
      pools.push({
        challengeId,
        sport,
        name,
        members: participantIds.size,
        entries: Number(row?._count?.entries ?? 0),
      })
    }
    return pools
  } catch (err) {
    if (!isExpectedBracketLoadError(err)) {
      console.warn("[brackets/page] safeGetPlayoffPools unexpected fallback", {
        route: "/brackets",
        functionName: "safeGetPlayoffPools",
        error: sanitizeError(err),
      })
      return []
    }
    console.warn("[brackets/page] safeGetPlayoffPools expected fallback", {
      route: "/brackets",
      functionName: "safeGetPlayoffPools",
      error: sanitizeError(err),
    })
    return []
  }
}

async function safeGetWorldCupPools(userId: string | undefined): Promise<WorldCupHomePool[]> {
  if (!userId) return []
  try {
    const rows = await listUserWorldCupChallenges(userId)
    return (rows ?? [])
      .map((row: any) => {
        const challengeId = typeof row?.id === "string" ? row.id.trim() : ""
        const name = typeof row?.name === "string" ? row.name.trim() : ""
        if (!challengeId || !name) return null
        return {
          challengeId,
          name,
          members: Number(row?.participantCount ?? 0),
          entries: 1,
        }
      })
      .filter(Boolean) as WorldCupHomePool[]
  } catch (err) {
    if (!isExpectedBracketLoadError(err)) {
      console.warn("[brackets/page] safeGetWorldCupPools unexpected fallback", {
        route: "/brackets",
        functionName: "safeGetWorldCupPools",
        error: sanitizeError(err),
      })
      return []
    }
    console.warn("[brackets/page] safeGetWorldCupPools expected fallback", {
      route: "/brackets",
      functionName: "safeGetWorldCupPools",
      error: sanitizeError(err),
    })
    return []
  }
}

function dedupeHomePools(pools: HomePoolCard[]): HomePoolCard[] {
  const byPoolId = new Map<string, HomePoolCard>()
  for (const pool of pools) {
    const id = String(pool?.id ?? "").trim()
    const name = String(pool?.name ?? "").trim()
    if (!id || !name) continue
    const current: HomePoolCard = {
      id,
      href: typeof pool?.href === "string" && pool.href.trim() ? pool.href : `/brackets/leagues/${id}`,
      name,
      members: Number.isFinite(pool?.members) ? Number(pool.members) : 0,
      entries: Number.isFinite(pool?.entries) ? Number(pool.entries) : 0,
      sport: typeof pool?.sport === "string" && pool.sport.trim() ? pool.sport : null,
      challengeType: pool?.challengeType ?? null,
      bracketType: pool?.bracketType ?? null,
    }
    const existing = byPoolId.get(id)
    if (!existing) {
      byPoolId.set(id, current)
      continue
    }
    byPoolId.set(id, {
      ...existing,
      href: existing.href || current.href,
      name: existing.name || current.name,
      members: Math.max(existing.members, current.members),
      entries: Math.max(existing.entries, current.entries),
      sport: existing.sport || current.sport,
      challengeType: existing.challengeType || current.challengeType,
      bracketType: existing.bracketType || current.bracketType,
    })
  }
  return Array.from(byPoolId.values())
}

async function safeGetEnabledBracketSports() {
  try {
    const enabledSports = await getEnabledSports()
    return enabledSports.length > 0 ? enabledSports : SUPPORTED_SPORTS
  } catch (err) {
    console.warn("[brackets/page] safeGetEnabledBracketSports fallback", {
      route: "/brackets",
      functionName: "safeGetEnabledBracketSports",
      error: sanitizeError(err),
    })
    return SUPPORTED_SPORTS
  }
}

export default async function BracketsHomePage() {
  let user: SessionUser | undefined
  let userId: string | undefined
  let myLeagues: any[] = []
  let myPlayoffChallenges: PlayoffHomePool[] = []
  let myWorldCupChallenges: WorldCupHomePool[] = []
  let visibleSports: string[] = SUPPORTED_SPORTS
  let playoffBySport = new Map<string, PlayoffHomePool>()
  let playoffSports: Array<{ sport: string; ui: ReturnType<typeof resolveBracketSportUI> }> = []

  try {
    const bracketsEnabled = await areBracketChallengesEnabled().catch(() => true)
    if (!bracketsEnabled) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="rounded-xl border p-6 max-w-md text-center" style={{ borderColor: "var(--border)" }}>
            <AlertTriangle className="h-10 w-10 mx-auto mb-3" style={{ color: "var(--muted)" }} />
            <h1 className="text-lg font-semibold mb-2" style={{ color: "var(--text)" }}>Bracket challenges are temporarily disabled</h1>
            <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>This feature has been turned off by the platform. Check back later.</p>
            <Link href="/dashboard" className="text-sm font-medium" style={{ color: "var(--accent)" }}>Back to dashboard</Link>
          </div>
        </div>
      )
    }

    user = await safeGetSessionUser()
    userId = user?.id
    myLeagues = await safeGetLegacyBracketPools(userId)
    myPlayoffChallenges = await safeGetPlayoffPools(userId)
    myWorldCupChallenges = await safeGetWorldCupPools(userId)
    visibleSports = await safeGetEnabledBracketSports()
    playoffBySport = myPlayoffChallenges.reduce((map, challenge) => {
      const sport = challenge.sport.toLowerCase()
      if (!map.has(sport)) {
        map.set(sport, challenge)
      }
      return map
    }, new Map<string, PlayoffHomePool>())
    playoffSports = visibleSports.map((sport) => ({
      sport,
      ui: resolveBracketSportUI(sport),
    }))
  } catch (err) {
    console.warn("[brackets/page] emergency fallback", {
      route: "/brackets",
      functionName: "BracketsHomePage",
      error: sanitizeError(err),
    })
    return <BracketHomeFallback sports={visibleSports} />
  }

  const bracketSignupHref = buildSignupHrefWithIntent("/brackets")
  const bracketLoginHref = buildLoginHrefWithIntent("/brackets")
  const safeMyLeagues = Array.isArray(myLeagues)
    ? myLeagues.filter((row: any) => Boolean(row?.league?.id) && !isLegacyWorldCupPoolRow(row) && !isLegacyPlayoffPoolRow(row))
    : []
  const safeResolvePlayoffHref = (sport: string) => {
    try {
      if (typeof resolvePlayoffCardHref === "function") {
        return resolvePlayoffCardHref({ sport, playoffBySport })
      }
    } catch (err) {
      console.warn("[brackets/page] safeResolvePlayoffHref fallback", {
        route: "/brackets",
        functionName: "safeResolvePlayoffHref",
        error: sanitizeError(err),
      })
    }
    return "/brackets"
  }
  const safeResolveMyPoolHref = (input: {
    poolId: string
    sport: string | null | undefined
    challengeType?: string | null
    bracketType?: string | null
  }) => {
    try {
      if (typeof resolveMyPoolCardHref === "function") {
        return resolveMyPoolCardHref({ ...input, playoffBySport })
      }
    } catch (err) {
      console.warn("[brackets/page] safeResolveMyPoolHref fallback", {
        route: "/brackets",
        functionName: "safeResolveMyPoolHref",
        error: sanitizeError(err),
      })
    }
    return input.poolId ? `/brackets/leagues/${input.poolId}` : "/brackets"
  }
  const combinedMyPools = dedupeHomePools([
    ...safeMyLeagues.map((member: any) => ({
      id: String(member.league.id),
      href: safeResolveMyPoolHref({
        poolId: member.league.id,
        sport: member.league.tournament?.sport,
        challengeType: member.league.scoringRules?.challengeType ?? null,
        bracketType: member.league.scoringRules?.bracketType ?? null,
      }),
      name: member.league.name,
      members: Number(member.league._count?.members ?? 0),
      entries: Number(member.league._count?.entries ?? 0),
      sport: member.league.tournament?.sport ?? null,
      challengeType: member.league.scoringRules?.challengeType ?? null,
      bracketType: member.league.scoringRules?.bracketType ?? null,
    })),
    ...myPlayoffChallenges.map((challenge) => ({
      id: challenge.challengeId,
      href: `/brackets/leagues/${challenge.challengeId}`,
      name: challenge.name,
      members: challenge.members,
      entries: challenge.entries,
      sport: challenge.sport,
      challengeType: "playoff_challenge",
      bracketType: null,
    })),
    ...myWorldCupChallenges.map((challenge) => ({
      id: challenge.challengeId,
      href: `/brackets/world-cup/${challenge.challengeId}`,
      name: challenge.name,
      members: challenge.members,
      entries: challenge.entries,
      sport: "SOCCER",
      challengeType: "world_cup",
      bracketType: "world_cup",
    })),
  ])

  return (
    <div className="min-h-screen mode-surface mode-readable">
      <EngagementEventTracker
        eventType="bracket_view"
        enabled={Boolean(userId)}
        oncePerDayKey="brackets_home"
        meta={{ product: "bracket" }}
      />
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(180deg, color-mix(in srgb, var(--panel2) 92%, transparent) 0%, var(--bg) 100%)' }}>
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div
            className="absolute -top-32 left-1/2 h-[460px] w-[460px] -translate-x-1/2 rounded-full"
            style={{ background: 'radial-gradient(circle at 50% 40%, color-mix(in srgb, var(--accent-cyan) 22%, transparent) 0%, transparent 65%)' }}
          />
          <div
            className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full"
            style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--accent-purple) 14%, transparent) 0%, transparent 70%)' }}
          />
          <div
            className="absolute -bottom-16 -right-24 h-72 w-72 rounded-full"
            style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--accent-amber) 10%, transparent) 0%, transparent 70%)' }}
          />
        </div>

        <div className="relative mx-auto w-full max-w-3xl px-4 pt-6 pb-10 sm:px-6 sm:pt-8">
          <div className="mb-6 flex items-center justify-between gap-3 sm:mb-8">
            <Link href="/dashboard" className="inline-flex items-center transition hover:opacity-80" aria-label="AllFantasy home">
              <Image
                src="/brand/allfantasy-wordmark-transparent.png"
                alt="AllFantasy"
                width={1198}
                height={306}
                priority
                className="nav-logo-img h-7 w-auto object-contain sm:h-8"
              />
            </Link>
            <span
              className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] sm:text-[11px]"
              style={{
                background: 'color-mix(in srgb, var(--accent-amber) 12%, transparent)',
                borderColor: 'color-mix(in srgb, var(--accent-amber) 30%, transparent)',
                color: 'var(--accent-amber-strong)',
              }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--accent-amber-strong)' }} aria-hidden />
              Fantasy sports · no gambling
            </span>
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="relative mb-5 sm:mb-6">
              <div
                className="pointer-events-none absolute left-1/2 top-1/2 h-[180px] w-[180px] -translate-x-1/2 -translate-y-1/2 rounded-full sm:h-[240px] sm:w-[240px]"
                aria-hidden="true"
                style={{
                  background:
                    'radial-gradient(circle at 50% 40%, color-mix(in srgb, var(--accent-cyan) 26%, transparent) 0%, transparent 62%), radial-gradient(circle at 50% 70%, color-mix(in srgb, var(--accent-purple) 14%, transparent) 0%, transparent 74%)',
                }}
              />
              <Image
                src="/brand/af-shield-transparent.png"
                alt="AllFantasy AF shield logo"
                className="hero-shield relative h-[96px] w-auto object-contain sm:h-[120px]"
                priority
                width={584}
                height={625}
              />
            </div>
            <p
              className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] sm:text-[11px]"
              style={{ color: 'var(--accent-cyan-strong)' }}
            >
              Bracket Challenges
            </p>
            <h1 className="mb-3 text-3xl font-black leading-tight tracking-tight sm:text-4xl" style={{ color: 'var(--text)' }}>
              Run Every Bracket. Own Every Pool.
            </h1>
            <p className="mx-auto max-w-xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--muted)' }}>
              Free multi-sport bracket pools &mdash; FIFA World Cup, NBA &amp; NHL playoffs, March Madness, and more. AI analysis, live leaderboards, invite codes. No entry fees, no gambling, ever.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold" style={{ background: 'color-mix(in srgb, var(--accent-cyan) 10%, transparent)', borderColor: 'color-mix(in srgb, var(--accent-cyan) 24%, transparent)', color: 'var(--accent-cyan-strong)' }}>
              <Sparkles className="h-3.5 w-3.5" />
              100% free &mdash; no hosting fees, no paid tiers
            </div>
          </div>

          <div className="mt-8 mode-readable">
          {!userId ? (
            <div
              className="mode-panel rounded-2xl p-6 text-center sm:p-8"
              style={{ boxShadow: '0 24px 60px -30px color-mix(in srgb, var(--accent-cyan) 30%, transparent)' }}
            >
              <div className="mb-4 inline-flex items-center justify-center gap-2 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ background: 'color-mix(in srgb, var(--accent-cyan) 12%, transparent)', borderColor: 'color-mix(in srgb, var(--accent-cyan) 28%, transparent)', color: 'var(--accent-cyan-strong)' }}>
                <Sparkles className="h-3.5 w-3.5" />
                Get started
              </div>
              <h2 className="mb-2 text-xl font-bold sm:text-2xl" style={{ color: 'var(--text)' }}>
                Create a pool, invite friends, fill your bracket.
              </h2>
              <p className="mx-auto mb-5 max-w-md text-sm" style={{ color: 'var(--muted)' }}>
                Sign up free to launch your first bracket pool in minutes. AI analysis included on every pick.
              </p>
              <div className="flex flex-col items-center justify-center gap-2.5 sm:flex-row sm:gap-3">
                <Link
                  href={bracketSignupHref}
                  className="inline-flex w-full min-w-[10rem] items-center justify-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-bold transition hover:opacity-90 sm:w-auto"
                  style={{
                    backgroundImage: 'linear-gradient(90deg, var(--accent-cyan), color-mix(in srgb, var(--accent-cyan-strong) 72%, #3b82f6))',
                    color: 'var(--on-accent-bg)',
                    boxShadow: '0 8px 24px -10px color-mix(in srgb, var(--accent-cyan) 60%, transparent)',
                  }}
                >
                  Sign Up Free
                </Link>
                <Link
                  href={bracketLoginHref}
                  className="inline-flex w-full min-w-[10rem] items-center justify-center gap-1.5 rounded-xl border px-5 py-2.5 text-sm font-semibold transition hover:opacity-90 sm:w-auto"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)', background: 'color-mix(in srgb, var(--panel2) 50%, transparent)' }}
                >
                  Sign In
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Primary CTA row — 3 buttons, stack on mobile */}
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-3">
                <Link
                  href="/brackets/leagues/new"
                  className="inline-flex min-h-[52px] touch-manipulation items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition hover:opacity-90"
                  style={{
                    backgroundImage: 'linear-gradient(90deg, var(--accent-cyan), color-mix(in srgb, var(--accent-cyan-strong) 72%, #3b82f6))',
                    color: 'var(--on-accent-bg)',
                    boxShadow: '0 8px 24px -10px color-mix(in srgb, var(--accent-cyan) 60%, transparent)',
                  }}
                  data-testid="bracket-create-pool-button"
                >
                  <Plus className="h-4 w-4 shrink-0" />
                  <span>Create a Bracket</span>
                </Link>
                <Link
                  href="/brackets/discover"
                  className="inline-flex min-h-[52px] touch-manipulation items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition hover:opacity-90"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)', background: 'color-mix(in srgb, var(--panel2) 55%, transparent)' }}
                  data-testid="bracket-discover-link"
                >
                  <Users className="h-4 w-4 shrink-0" />
                  <span>Find a Pool</span>
                </Link>
                <Link
                  href="/brackets/join"
                  className="inline-flex min-h-[52px] touch-manipulation items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition hover:opacity-90"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)', background: 'color-mix(in srgb, var(--panel2) 55%, transparent)' }}
                  data-testid="bracket-join-pool-button"
                >
                  <span>Join with Code</span>
                </Link>
              </div>

              {/* Premium World Cup feature card */}
              <Link
                href="/brackets/world-cup"
                className="group relative block overflow-hidden rounded-2xl border p-5 transition hover:opacity-95 sm:p-6"
                style={{
                  borderColor: 'color-mix(in srgb, var(--accent-cyan) 32%, transparent)',
                  background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent-cyan) 14%, transparent) 0%, color-mix(in srgb, var(--accent-purple) 10%, transparent) 100%)',
                  boxShadow: '0 20px 50px -30px color-mix(in srgb, var(--accent-cyan) 60%, transparent)',
                }}
                data-testid="world-cup-bracket-card"
              >
                <div
                  className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full"
                  aria-hidden="true"
                  style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--accent-cyan) 24%, transparent) 0%, transparent 70%)' }}
                />
                <div className="relative flex items-start gap-4">
                  <div
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border"
                    style={{
                      background: 'color-mix(in srgb, var(--accent-cyan) 18%, transparent)',
                      borderColor: 'color-mix(in srgb, var(--accent-cyan) 32%, transparent)',
                    }}
                  >
                    <Globe2 className="h-7 w-7" style={{ color: 'var(--accent-cyan-strong)' }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ background: 'color-mix(in srgb, var(--accent-amber) 16%, transparent)', color: 'var(--accent-amber-strong)' }}>
                      <Trophy className="h-3 w-3" />
                      Featured
                    </div>
                    <h3 className="mb-1 text-lg font-bold leading-tight sm:text-xl" style={{ color: 'var(--text)' }}>
                      FIFA World Cup 2026 Bracket Challenge
                    </h3>
                    <p className="text-xs leading-relaxed sm:text-sm" style={{ color: 'var(--muted)' }}>
                      Pre-tournament &mdash; rank your groups, pick the knockout path, and lock your champion before kickoff. Invite-link pools, live leaderboards, AI matchup notes.
                    </p>
                    <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold" style={{ color: 'var(--accent-cyan-strong)' }}>
                      View World Cup Challenge
                      <ChevronRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                    </div>
                  </div>
                </div>
              </Link>

              {/* Playoff Challenge by Sport */}
              <div className="mode-panel-soft rounded-2xl p-4 sm:p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--muted)' }}>
                    Playoff Challenge by Sport
                  </h2>
                  <span className="text-[10px] font-semibold" style={{ color: 'var(--muted2)' }}>
                    {playoffSports.length} sport{playoffSports.length === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
                  {playoffSports.map(({ sport, ui }) => {
                    const hasQuick = sport === "NBA" || sport === "NHL"
                    return (
                      <div
                        key={sport}
                        className="rounded-xl border p-3 transition"
                        style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--panel) 80%, transparent)' }}
                      >
                        <Link
                          href={safeResolvePlayoffHref(sport)}
                          className="flex items-center gap-2 text-sm font-semibold transition hover:opacity-90"
                          data-testid={`bracket-playoff-sport-${sport}`}
                          style={{ color: 'var(--text)' }}
                        >
                          <span
                            className="inline-flex h-7 min-w-7 items-center justify-center rounded-lg px-1.5 text-[10px] font-bold"
                            style={{ background: 'color-mix(in srgb, var(--accent-cyan) 18%, transparent)', color: 'var(--accent-cyan-strong)' }}
                          >
                            {ui.badge}
                          </span>
                          <span className="truncate">{ui.shortLabel}</span>
                          <ChevronRight className="ml-auto h-3.5 w-3.5 shrink-0" style={{ color: 'var(--muted2)' }} />
                        </Link>
                        {hasQuick ? (
                          <div className="mt-2.5">
                            <QuickCreatePlayoffPoolButton
                              sport={sport.toLowerCase() as "nba" | "nhl"}
                              label={`Quick Create ${ui.shortLabel} Pool`}
                            />
                          </div>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* My Pools list */}
              {combinedMyPools.length > 0 ? (
                <div className="space-y-2">
                  <h2 className="px-1 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--muted)' }}>My Pools</h2>
                  <div className="space-y-2">
                  {combinedMyPools.map((pool) => {
                    const sportUI = resolveBracketSportUI(pool.sport ?? null)
                    const challengeLabel = resolveBracketChallengeLabel({
                      sport: pool.sport,
                      challengeType: pool.challengeType,
                      bracketType: pool.bracketType,
                    })
                    if (process.env.NODE_ENV !== "production") {
                      console.info("[brackets] pool card href", {
                        poolId: pool.id,
                        sport: String(pool.sport ?? ""),
                        href: pool.href,
                      })
                    }
                    return (
                      <Link
                        key={pool.id}
                        href={pool.href}
                        className="mode-panel group flex items-center gap-3 rounded-xl p-3.5 transition hover:opacity-95"
                      >
                        <div
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border"
                          style={{
                            background: 'color-mix(in srgb, var(--accent-cyan) 14%, transparent)',
                            borderColor: 'color-mix(in srgb, var(--accent-cyan) 24%, transparent)',
                          }}
                        >
                          <span className="text-[10px] font-bold" style={{ color: 'var(--accent-cyan-strong)' }}>{sportUI.badge}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold" style={{ color: 'var(--text)' }}>{pool.name}</div>
                          <div className="mt-0.5 truncate text-[11px]" style={{ color: 'var(--muted)' }}>
                            {challengeLabel}
                          </div>
                          <div className="mt-0.5 text-xs" style={{ color: 'var(--muted2)' }}>
                            {pool.members} member{pool.members !== 1 ? 's' : ''} &bull; {pool.entries} bracket{pool.entries !== 1 ? 's' : ''}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 transition group-hover:translate-x-0.5" style={{ color: 'var(--muted2)' }} />
                      </Link>
                    )
                  })}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed p-6 text-center" style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--panel2) 40%, transparent)' }}>
                  <p className="text-sm" style={{ color: 'var(--muted)' }}>
                    No pools yet. Create one or join a friend&apos;s pool to get started.
                  </p>
                </div>
              )}

              {/* Secondary links */}
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs" style={{ color: 'var(--muted2)' }}>
                <Link href="/brackets/discover" className="transition hover:opacity-80" style={{ color: 'var(--muted)' }}>
                  Discover public leagues
                </Link>
                <span aria-hidden style={{ color: 'var(--muted2)' }}>&middot;</span>
                <Link href="/creators" className="transition hover:opacity-80" style={{ color: 'var(--muted)' }}>
                  Creator leagues
                </Link>
                <span aria-hidden style={{ color: 'var(--muted2)' }}>&middot;</span>
                <span>Signed in as {user?.name || user?.email || 'User'}</span>
              </div>
            </div>
          )}
          </div>
        </div>
      </div>
      <BracketShell>
        <div className="space-y-4">
          <BracketHomeTabs
            poolCount={combinedMyPools.length}
          />
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <MyPoolsTab
              pools={combinedMyPools}
            />
            <BracketAICoachTab />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <CreatePoolTab />
            <PlayoffChallengeTab />
            <JoinPoolTab />
            <StandingsTab />
            <BracketHistoryTab
              pools={combinedMyPools.map((pool) => ({
                id: pool.id,
                name: pool.name,
                entries: pool.entries,
                sport: pool.sport ?? "NFL",
                challengeType: pool.challengeType,
                bracketType: pool.bracketType,
              }))}
            />
          </div>
        </div>
      </BracketShell>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pb-12 space-y-8">

        <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="px-5 pt-5 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Star className="w-4 h-4" style={{ color: '#3b82f6' }} />
              <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: '#3b82f6' }}>AF March Madness Scoring</h3>
            </div>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Our headline scoring system rewards bold picks and smart strategy.
            </p>
          </div>
          <div className="px-5 pb-5">
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
              {[
                { round: "R64", pts: "1" },
                { round: "R32", pts: "2" },
                { round: "S16", pts: "5" },
                { round: "E8", pts: "10" },
                { round: "F4", pts: "18" },
                { round: "CH", pts: "30" },
              ].map((r) => (
                <div key={r.round} className="rounded-xl p-2.5 text-center" style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.1)' }}>
                  <div className="text-[10px] font-bold uppercase" style={{ color: 'rgba(255,255,255,0.3)' }}>{r.round}</div>
                  <div className="text-lg font-black" style={{ color: '#3b82f6' }}>{r.pts}</div>
                  <div className="text-[9px]" style={{ color: 'rgba(255,255,255,0.2)' }}>pts</div>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <div className="flex items-start gap-2.5 rounded-lg p-2.5" style={{ background: 'rgba(192,132,252,0.04)' }}>
                <Zap className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: '#c084fc' }} />
                <div>
                  <span className="text-xs font-bold" style={{ color: '#c084fc' }}>Upset Delta Bonus</span>
                  <span className="text-xs ml-1" style={{ color: 'rgba(255,255,255,0.4)' }}>&mdash; Earn bonus points for correctly picking upsets. The bigger the seed difference, the bigger the bonus.</span>
                </div>
              </div>
              <div className="flex items-start gap-2.5 rounded-lg p-2.5" style={{ background: 'rgba(251,146,60,0.04)' }}>
                <Crown className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: '#fb923c' }} />
                <div>
                  <span className="text-xs font-bold" style={{ color: '#fb923c' }}>Leverage Bonus</span>
                  <span className="text-xs ml-1" style={{ color: 'rgba(255,255,255,0.4)' }}>&mdash; Going against the consensus with a correct pick earns you a leverage multiplier.</span>
                </div>
              </div>
              <div className="flex items-start gap-2.5 rounded-lg p-2.5" style={{ background: 'rgba(34,197,94,0.04)' }}>
                <Shield className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: '#22c55e' }} />
                <div>
                  <span className="text-xs font-bold" style={{ color: '#22c55e' }}>Insurance Token</span>
                  <span className="text-xs ml-1" style={{ color: 'rgba(255,255,255,0.4)' }}>&mdash; Protect one pick per round. If your insured pick loses, you keep partial points.</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="px-5 pt-5 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="w-4 h-4" style={{ color: '#fb923c' }} />
              <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: '#fb923c' }}>How It Works</h3>
            </div>
          </div>
          <div className="px-5 pb-5 space-y-3">
            {[
              { step: "1", title: "Create or Join a Pool", desc: "Start your own bracket pool or join a friend's with an invite code. Unlimited members, always free." },
              { step: "2", title: "Fill Out Your Bracket", desc: "Tap any matchup to open the pick wizard. Choose winners round by round. AI analysis helps you make smarter picks." },
              { step: "3", title: "Compete & Climb", desc: "Track your AF March Madness score on the live leaderboard. Earn upset bonuses, leverage multipliers, and bragging rights." },
              { step: "4", title: "Win Your Pool", desc: "The player with the most points at the end of the tournament wins. Global leaderboard rankings included." },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-black" style={{ background: 'rgba(251,146,60,0.12)', color: '#fb923c' }}>
                  {item.step}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold">{item.title}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="px-5 pt-5 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4" style={{ color: '#22d3ee' }} />
              <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: '#22d3ee' }}>Bracket Preview</h3>
            </div>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Full 64-team bracket with 4 regions and AI-powered pick wizard.
            </p>
          </div>
          <div className="px-5 pb-5">
            <div className="rounded-xl p-4 sm:p-6" style={{ background: '#0f1a2e', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="rounded-xl p-3 mb-5 flex items-center gap-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <span className="text-lg">&#9201;</span>
                <div>
                  <div className="text-sm font-bold text-white">Brackets open on March 17th</div>
                  <div className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>Waiting for Selection Sunday</div>
                </div>
              </div>

              <div className="grid grid-cols-[1fr_auto_1fr] gap-x-2 sm:gap-x-4 gap-y-3 items-center">
                <div className="space-y-1.5">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={`w-${i}`} className="flex gap-0.5">
                      <div className="h-3 rounded-sm flex-1" style={{ background: 'rgba(255,255,255,0.08)' }} />
                      <div className="h-3 rounded-sm flex-1" style={{ background: 'rgba(255,255,255,0.08)' }} />
                    </div>
                  ))}
                  <div className="flex justify-center gap-0.5 pt-1">
                    <div className="h-3 w-8 rounded-sm" style={{ background: 'rgba(255,255,255,0.08)' }} />
                    <div className="h-3 w-8 rounded-sm" style={{ background: 'rgba(255,255,255,0.08)' }} />
                  </div>
                  <div className="flex justify-center gap-0.5">
                    <div className="h-3 w-10 rounded-sm" style={{ background: 'rgba(255,255,255,0.1)' }} />
                    <div className="h-3 w-10 rounded-sm" style={{ background: 'rgba(255,255,255,0.1)' }} />
                  </div>
                  <div className="text-center">
                    <span className="text-[10px] font-bold tracking-wider" style={{ color: 'rgba(255,255,255,0.25)' }}>W</span>
                  </div>

                  <div className="mt-3" />
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={`e-${i}`} className="flex gap-0.5">
                      <div className="h-3 rounded-sm flex-1" style={{ background: 'rgba(255,255,255,0.08)' }} />
                      <div className="h-3 rounded-sm flex-1" style={{ background: 'rgba(255,255,255,0.08)' }} />
                    </div>
                  ))}
                  <div className="flex justify-center gap-0.5 pt-1">
                    <div className="h-3 w-8 rounded-sm" style={{ background: 'rgba(255,255,255,0.08)' }} />
                    <div className="h-3 w-8 rounded-sm" style={{ background: 'rgba(255,255,255,0.08)' }} />
                  </div>
                  <div className="flex justify-center gap-0.5">
                    <div className="h-3 w-10 rounded-sm" style={{ background: 'rgba(255,255,255,0.1)' }} />
                    <div className="h-3 w-10 rounded-sm" style={{ background: 'rgba(255,255,255,0.1)' }} />
                  </div>
                  <div className="text-center">
                    <span className="text-[10px] font-bold tracking-wider" style={{ color: 'rgba(255,255,255,0.25)' }}>E</span>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center gap-1 self-center">
                  <div className="h-4 w-10 rounded-sm" style={{ background: 'rgba(255,255,255,0.06)' }} />
                  <div className="h-4 w-10 rounded-sm" style={{ background: 'rgba(255,255,255,0.06)' }} />
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center my-1" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <Trophy className="w-5 h-5" style={{ color: 'rgba(255,255,255,0.3)' }} />
                  </div>
                  <div className="h-4 w-10 rounded-sm" style={{ background: 'rgba(255,255,255,0.06)' }} />
                  <div className="h-4 w-10 rounded-sm" style={{ background: 'rgba(255,255,255,0.06)' }} />
                </div>

                <div className="space-y-1.5">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={`s-${i}`} className="flex gap-0.5">
                      <div className="h-3 rounded-sm flex-1" style={{ background: 'rgba(255,255,255,0.08)' }} />
                      <div className="h-3 rounded-sm flex-1" style={{ background: 'rgba(255,255,255,0.08)' }} />
                    </div>
                  ))}
                  <div className="flex justify-center gap-0.5 pt-1">
                    <div className="h-3 w-8 rounded-sm" style={{ background: 'rgba(255,255,255,0.08)' }} />
                    <div className="h-3 w-8 rounded-sm" style={{ background: 'rgba(255,255,255,0.08)' }} />
                  </div>
                  <div className="flex justify-center gap-0.5">
                    <div className="h-3 w-10 rounded-sm" style={{ background: 'rgba(255,255,255,0.1)' }} />
                    <div className="h-3 w-10 rounded-sm" style={{ background: 'rgba(255,255,255,0.1)' }} />
                  </div>
                  <div className="text-center">
                    <span className="text-[10px] font-bold tracking-wider" style={{ color: 'rgba(255,255,255,0.25)' }}>S</span>
                  </div>

                  <div className="mt-3" />
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={`mw-${i}`} className="flex gap-0.5">
                      <div className="h-3 rounded-sm flex-1" style={{ background: 'rgba(255,255,255,0.08)' }} />
                      <div className="h-3 rounded-sm flex-1" style={{ background: 'rgba(255,255,255,0.08)' }} />
                    </div>
                  ))}
                  <div className="flex justify-center gap-0.5 pt-1">
                    <div className="h-3 w-8 rounded-sm" style={{ background: 'rgba(255,255,255,0.08)' }} />
                    <div className="h-3 w-8 rounded-sm" style={{ background: 'rgba(255,255,255,0.08)' }} />
                  </div>
                  <div className="flex justify-center gap-0.5">
                    <div className="h-3 w-10 rounded-sm" style={{ background: 'rgba(255,255,255,0.1)' }} />
                    <div className="h-3 w-10 rounded-sm" style={{ background: 'rgba(255,255,255,0.1)' }} />
                  </div>
                  <div className="text-center">
                    <span className="text-[10px] font-bold tracking-wider" style={{ color: 'rgba(255,255,255,0.25)' }}>MW</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.1)' }}>
                <div className="text-sm font-bold" style={{ color: '#3b82f6' }}>Tap to Pick</div>
                <div className="text-[10px] mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Select any matchup to open the pick wizard.</div>
              </div>
              <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(34,211,238,0.06)', border: '1px solid rgba(34,211,238,0.1)' }}>
                <div className="text-sm font-bold" style={{ color: '#22d3ee' }}>AI Analysis</div>
                <div className="text-[10px] mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Win probabilities and matchup breakdowns.</div>
              </div>
              <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(192,132,252,0.06)', border: '1px solid rgba(192,132,252,0.1)' }}>
                <div className="text-sm font-bold" style={{ color: '#c084fc' }}>Auto-Advance</div>
                <div className="text-[10px] mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Picks auto-cycle to the next matchup.</div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.06) 0%, rgba(192,132,252,0.04) 100%)', border: '1px solid rgba(59,130,246,0.12)' }}>
          <div className="px-5 py-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(59,130,246,0.12)' }}>
                <ExternalLink className="w-5 h-5" style={{ color: '#3b82f6' }} />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold mb-1">League Dues & Payouts</h3>
                <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Want to play for real money? Use FanCred to collect league dues and manage payouts. AllFantasy brackets are always free &mdash; FanCred handles the money side separately.
                </p>
                <a
                  href="https://fancred.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
                  style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)' }}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Set Up on FanCred
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="px-5 pt-5 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.4)' }} />
              <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.5)' }}>Rules & Fair Play</h3>
            </div>
          </div>
          <div className="px-5 pb-5 space-y-2.5">
            {[
              "All brackets are 100% free. No hosting fees, no premium tiers.",
              "Each pool member gets one bracket entry per tournament.",
              "All picks must be submitted before the tournament tips off (First Four excluded).",
              "Picks lock per game at scheduled tip-off time. No changes after lock.",
              "AF March Madness scoring is used for all pools: R64=1, R32=2, S16=5, E8=10, F4=18, CH=30.",
              "Upset Delta Bonus: Correctly picking a lower seed earns bonus points equal to the seed difference.",
              "Leverage Bonus: Going against consensus (>60% ownership) with a correct pick earns a 1.5x multiplier.",
              "Insurance Tokens (if enabled): Protect one pick per round for partial credit if it loses.",
              "Tie-breaker: Championship game total score prediction. Closest without going over wins.",
              "Pool creators can toggle pick visibility (hidden until lock) and bracket copying.",
              "No collusion, bracket sharing before lock, or multi-accounting. Violations = removal from pool.",
            ].map((rule, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="w-4 h-4 rounded flex items-center justify-center shrink-0 mt-0.5 text-[9px] font-bold" style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.25)' }}>
                  {i + 1}
                </div>
                <span className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>{rule}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.06) 0%, rgba(251,146,60,0.04) 100%)', border: '1px solid rgba(239,68,68,0.12)' }}>
          <div className="px-5 py-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(239,68,68,0.12)' }}>
                <Heart className="w-5 h-5" style={{ color: '#ef4444' }} />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold mb-1">Support AllFantasy</h3>
                <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  AllFantasy is 100% free. If you enjoy the platform, consider a small donation to help cover server costs, data feeds, and development. Every bit helps keep the lights on.
                </p>
                <Link
                  href="/donate"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
                  style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
                >
                  <Heart className="w-3.5 h-3.5" />
                  Support Us
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="px-5 pt-5 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Scale className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.35)' }} />
              <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>Legal Disclaimer</h3>
            </div>
          </div>
          <div className="px-5 pb-5 space-y-4">
            <div className="rounded-xl p-4" style={{ background: 'rgba(239,68,68,0.03)', border: '1px solid rgba(239,68,68,0.08)' }}>
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#ef4444' }} />
                <div>
                  <div className="text-xs font-bold mb-1" style={{ color: '#ef4444' }}>Not Gambling &mdash; No Prizes, No Wagering</div>
                  <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    AllFantasy does not promote, facilitate, or constitute gambling in any form. AllFantasy does not offer, award, distribute, or guarantee any prizes, monetary or otherwise. AllFantasy does not hold, manage, escrow, or custody any user funds, entry fees, or wagers at any time. No real money, cryptocurrency, or item of monetary value is at stake when participating in any bracket pool or challenge on this platform. Participation is entirely free and for entertainment purposes only.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl p-4" style={{ background: 'rgba(59,130,246,0.03)', border: '1px solid rgba(59,130,246,0.08)' }}>
              <div className="flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#3b82f6' }} />
                <div>
                  <div className="text-xs font-bold mb-1" style={{ color: '#3b82f6' }}>AI Features &mdash; Experimental, Not an Advantage</div>
                  <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    The artificial intelligence features provided within AllFantasy, including but not limited to matchup analysis, win probabilities, AI recommendations, and pick assistance, are experimental in nature and are provided solely for the purpose of exploring and testing the concept of AI-assisted sports analysis. These AI features do not provide any competitive advantage, guaranteed accuracy, or predictive reliability. AI-generated insights are for informational and entertainment purposes only and should not be relied upon for any decision-making, financial or otherwise. AllFantasy makes no representations or warranties regarding the accuracy, completeness, or reliability of any AI-generated content. Users acknowledge that AI outputs may be incorrect, incomplete, or misleading, and that all bracket selections are made solely at the user&apos;s own discretion.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl p-4" style={{ background: 'rgba(34,197,94,0.03)', border: '1px solid rgba(34,197,94,0.08)' }}>
              <div className="flex items-start gap-2.5">
                <Shield className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#22c55e' }} />
                <div>
                  <div className="text-xs font-bold mb-1" style={{ color: '#22c55e' }}>Donations &mdash; Voluntary & Non-Refundable</div>
                  <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    AllFantasy operates as a free platform. Any financial transactions processed through AllFantasy are strictly voluntary donations made by users to support the continued development and operation of the platform. Donations do not grant any additional features, advantages, access, or preferential treatment. Donations are non-refundable and are not tied to any product, service, or outcome. AllFantasy is not a payment processor for league dues or prize pools. Any league dues, side bets, or payout arrangements between users are handled entirely through third-party services (such as FanCred) and are solely the responsibility of the users involved. AllFantasy bears no liability for any third-party transactions.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl p-4" style={{ background: 'rgba(251,146,60,0.03)', border: '1px solid rgba(251,146,60,0.08)' }}>
              <div className="flex items-start gap-2.5">
                <ExternalLink className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#fb923c' }} />
                <div>
                  <div className="text-xs font-bold mb-1" style={{ color: '#fb923c' }}>Third-Party Services</div>
                  <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    AllFantasy may provide links to third-party services, including but not limited to FanCred (fancred.app), for the purpose of facilitating league dues and payouts between users. AllFantasy is not affiliated with, endorsed by, or responsible for any third-party service. Any transactions conducted through third-party platforms are governed by those platforms&apos; respective terms of service, privacy policies, and applicable laws. AllFantasy disclaims all liability for any losses, disputes, or damages arising from the use of third-party services.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="flex items-start gap-2.5">
                <Trophy className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }} />
                <div>
                  <div className="text-xs font-bold mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>Limitation of Liability</div>
                  <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    AllFantasy is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranties of any kind, express or implied. To the fullest extent permitted by applicable law, AllFantasy, its operators, affiliates, and contributors shall not be liable for any direct, indirect, incidental, consequential, or punitive damages arising from the use of or inability to use this platform, including but not limited to reliance on AI-generated content, loss of data, or any financial losses incurred through third-party services. By using AllFantasy, you acknowledge that you have read, understood, and agree to be bound by this disclaimer.
                  </p>
                </div>
              </div>
            </div>

            <p className="text-[10px] text-center pt-1" style={{ color: 'rgba(255,255,255,0.2)' }}>
              Last updated: February 2026. AllFantasy reserves the right to modify this disclaimer at any time.
            </p>
          </div>
        </div>

        <div className="text-center pb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Image src="/af-crest.png" alt="AF" width={20} height={20} className="rounded opacity-40" />
            <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.2)' }}>AllFantasy</span>
          </div>
          <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.15)' }}>
            Free forever. Built for fans, by fans.
          </p>
        </div>
      </div>
    </div>
  )
}










