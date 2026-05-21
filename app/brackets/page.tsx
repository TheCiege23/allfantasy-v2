import Link from "next/link"
import Image from "next/image"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { areBracketChallengesEnabled, getEnabledSports } from "@/lib/feature-toggle"
import {
  Trophy, Plus, Users, ChevronRight, Star, Shield, Zap, Crown,
  ExternalLink, Sparkles, AlertTriangle, Scale, Heart, Globe2,
} from "lucide-react"
import EngagementEventTracker from "@/components/engagement/EngagementEventTracker"
import QuickCreatePlayoffPoolButton from "@/components/bracket/QuickCreatePlayoffPoolButton"
import {
  buildLoginHrefWithIntent,
  buildSignupHrefWithIntent,
} from "@/lib/auth/PostAuthIntentRouter"
import { SUPPORTED_SPORTS } from "@/lib/sport-scope"
import { resolveBracketChallengeLabel, resolveBracketSportUI } from "@/lib/bracket-challenge"
import { resolveMyPoolCardHref, resolvePlayoffCardHref } from "@/lib/playoffs/playoffHomeRouting"
import { listUserWorldCupChallenges } from "@/lib/world-cup"
import { getPrimaryChimmyEntry } from "@/lib/ai-product-layer"

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
          <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>Bracket Challenges</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
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
          <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Sports</h2>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {sports.map((sport) => (
              <Link
                key={sport}
                href="/brackets"
                className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-center text-xs font-semibold"
                style={{ color: "var(--muted)" }}
              >
                {String(sport).toUpperCase()}
              </Link>
            ))}
          </div>
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
    console.warn("[brackets/page] safeGetSessionUser fallback", { error: sanitizeError(err) })
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
      console.warn("[brackets/page] safeGetLegacyBracketPools unexpected fallback", { error: sanitizeError(err) })
    }
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
          { entries: { some: { userId } } },
        ],
      },
      select: {
        id: true,
        name: true,
        sport: true,
        ownerUserId: true,
        entries: { select: { userId: true } },
        _count: { select: { entries: true } },
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
      if (typeof row?.ownerUserId === "string" && row.ownerUserId.trim()) participantIds.add(row.ownerUserId)
      for (const entry of Array.isArray(row?.entries) ? row.entries : []) {
        if (typeof entry?.userId === "string" && entry.userId.trim()) participantIds.add(entry.userId)
      }
      pools.push({ challengeId, sport: sport as "nba" | "nhl", name, members: participantIds.size, entries: Number(row?._count?.entries ?? 0) })
    }
    return pools
  } catch (err) {
    if (!isExpectedBracketLoadError(err)) {
      console.warn("[brackets/page] safeGetPlayoffPools unexpected fallback", { error: sanitizeError(err) })
    }
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
        return { challengeId, name, members: Number(row?.participantCount ?? 0), entries: 1 }
      })
      .filter(Boolean) as WorldCupHomePool[]
  } catch (err) {
    if (!isExpectedBracketLoadError(err)) {
      console.warn("[brackets/page] safeGetWorldCupPools unexpected fallback", { error: sanitizeError(err) })
    }
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
    console.warn("[brackets/page] safeGetEnabledBracketSports fallback", { error: sanitizeError(err) })
    return SUPPORTED_SPORTS
  }
}

function resolvePoolCardAccent(sport: string | null, challengeType: string | null) {
  const s = String(sport ?? "").toUpperCase()
  const ct = String(challengeType ?? "").toLowerCase()
  if (s === "SOCCER" || ct.includes("world_cup"))
    return { bg: "rgba(22,163,74,0.12)", border: "rgba(74,222,128,0.25)", text: "#4ade80", glow: "rgba(74,222,128,0.18)" }
  if (s === "NBA")
    return { bg: "rgba(234,88,12,0.11)", border: "rgba(251,146,60,0.25)", text: "#fb923c", glow: "rgba(251,146,60,0.16)" }
  if (s === "NHL")
    return { bg: "rgba(59,130,246,0.11)", border: "rgba(96,165,250,0.25)", text: "#60a5fa", glow: "rgba(96,165,250,0.16)" }
  if (s === "NFL")
    return { bg: "rgba(220,38,38,0.10)", border: "rgba(248,113,113,0.22)", text: "#f87171", glow: "rgba(248,113,113,0.14)" }
  if (s === "MLB")
    return { bg: "rgba(220,38,38,0.09)", border: "rgba(248,113,113,0.20)", text: "#f87171", glow: "rgba(248,113,113,0.12)" }
  if (s === "NCAAB")
    return { bg: "rgba(59,130,246,0.10)", border: "rgba(96,165,250,0.22)", text: "#60a5fa", glow: "rgba(96,165,250,0.14)" }
  if (s === "NCAAF")
    return { bg: "rgba(217,119,6,0.10)", border: "rgba(251,191,36,0.22)", text: "#fbbf24", glow: "rgba(251,191,36,0.14)" }
  return { bg: "color-mix(in srgb, var(--accent-cyan) 10%, transparent)", border: "color-mix(in srgb, var(--accent-cyan) 22%, transparent)", text: "var(--accent-cyan-strong)", glow: "color-mix(in srgb, var(--accent-cyan) 14%, transparent)" }
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
            <Link href="/dashboard" className="text-sm font-medium" style={{ color: "var(--accent-cyan-strong)" }}>Back to dashboard</Link>
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
      if (!map.has(sport)) map.set(sport, challenge)
      return map
    }, new Map<string, PlayoffHomePool>())
    playoffSports = visibleSports.map((sport) => ({
      sport,
      ui: resolveBracketSportUI(sport),
    }))
  } catch (err) {
    console.warn("[brackets/page] emergency fallback", { error: sanitizeError(err) })
    return <BracketHomeFallback sports={visibleSports} />
  }

  const chimmyHref = getPrimaryChimmyEntry().href
  const bracketSignupHref = buildSignupHrefWithIntent("/brackets")
  const bracketLoginHref = buildLoginHrefWithIntent("/brackets")

  const safeMyLeagues = Array.isArray(myLeagues)
    ? myLeagues.filter((row: any) => Boolean(row?.league?.id) && !isLegacyWorldCupPoolRow(row) && !isLegacyPlayoffPoolRow(row))
    : []

  const safeResolvePlayoffHref = (sport: string) => {
    try {
      if (typeof resolvePlayoffCardHref === "function") return resolvePlayoffCardHref({ sport, playoffBySport })
    } catch (err) {
      console.warn("[brackets/page] safeResolvePlayoffHref fallback", { error: sanitizeError(err) })
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
      if (typeof resolveMyPoolCardHref === "function") return resolveMyPoolCardHref({ ...input, playoffBySport })
    } catch (err) {
      console.warn("[brackets/page] safeResolveMyPoolHref fallback", { error: sanitizeError(err) })
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
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <EngagementEventTracker
        eventType="bracket_view"
        enabled={Boolean(userId)}
        oncePerDayKey="brackets_home"
        meta={{ product: "bracket" }}
      />

      {/* ══════════════════════════════════════════════
          WORLD CUP HERO
      ══════════════════════════════════════════════ */}
      <section
        className="relative overflow-hidden"
        style={{
          minHeight: "clamp(580px, 78vh, 880px)",
          background:
            "linear-gradient(180deg, color-mix(in srgb, #060b17 88%, var(--panel2)) 0%, color-mix(in srgb, #080d1a 70%, var(--panel2)) 55%, var(--bg) 100%)",
        }}
      >
        {/* ── Atmospheric background layers ── */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          {/* Emerald field tint */}
          <div
            className="absolute inset-x-0 top-0 h-3/4"
            style={{
              background:
                "linear-gradient(180deg, color-mix(in srgb, #064e3b 22%, transparent) 0%, transparent 100%)",
            }}
          />
          {/* Cyan glow orb — top center */}
          <div
            className="absolute -top-40 left-1/2 h-[700px] w-[700px] -translate-x-1/2 rounded-full"
            style={{
              background:
                "radial-gradient(circle at 50% 30%, color-mix(in srgb, var(--accent-cyan) 32%, transparent) 0%, transparent 62%)",
            }}
          />
          {/* Purple glow orb — bottom left */}
          <div
            className="absolute -bottom-48 -left-28 h-[480px] w-[480px] rounded-full"
            style={{
              background:
                "radial-gradient(circle, color-mix(in srgb, var(--accent-purple) 38%, transparent) 0%, transparent 68%)",
            }}
          />
          {/* Amber glow orb — top right */}
          <div
            className="absolute -top-20 -right-20 h-80 w-80 rounded-full"
            style={{
              background:
                "radial-gradient(circle, color-mix(in srgb, var(--accent-amber) 22%, transparent) 0%, transparent 68%)",
            }}
          />
          {/* Subtle grid */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
              backgroundSize: "64px 64px",
            }}
          />
          {/* Diagonal depth */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(135deg, color-mix(in srgb, var(--accent-cyan) 4%, transparent) 0%, transparent 45%, color-mix(in srgb, var(--accent-purple) 4%, transparent) 100%)",
            }}
          />
          {/* Bottom vignette */}
          <div
            className="absolute inset-x-0 bottom-0 h-40"
            style={{
              background: "linear-gradient(to bottom, transparent, color-mix(in srgb, #060b17 60%, var(--bg)))",
            }}
          />
        </div>

        {/* ── Hero content ── */}
        <div className="relative mx-auto max-w-4xl px-4 pt-14 pb-28 text-center sm:px-6 sm:pt-20 sm:pb-32 lg:pt-24">

          {/* Registration open badge */}
          <div className="mb-7 flex justify-center">
            <span
              className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] sm:gap-2.5 sm:tracking-[0.22em]"
              style={{
                background: "color-mix(in srgb, #16a34a 14%, transparent)",
                borderColor: "color-mix(in srgb, #4ade80 28%, transparent)",
                color: "#4ade80",
              }}
            >
              <span
                className="h-2 w-2 shrink-0 animate-pulse rounded-full"
                style={{ background: "#4ade80" }}
                aria-hidden="true"
              />
              <span className="hidden sm:inline">2026 FIFA World Cup &middot; </span>Registration Open
            </span>
          </div>

          {/* Globe icon with glow ring */}
          <div className="relative mb-7 inline-flex justify-center">
            <div
              className="pointer-events-none absolute inset-0 rounded-full"
              aria-hidden="true"
              style={{
                background:
                  "radial-gradient(circle, color-mix(in srgb, var(--accent-cyan) 40%, transparent) 0%, transparent 65%)",
                filter: "blur(28px)",
                transform: "scale(2.2)",
              }}
            />
            <div
              className="relative flex h-20 w-20 items-center justify-center rounded-3xl border sm:h-24 sm:w-24"
              style={{
                background:
                  "linear-gradient(135deg, color-mix(in srgb, var(--accent-cyan) 22%, transparent), color-mix(in srgb, var(--accent-purple) 16%, transparent))",
                borderColor: "color-mix(in srgb, var(--accent-cyan) 38%, transparent)",
                boxShadow:
                  "0 0 48px -8px color-mix(in srgb, var(--accent-cyan) 55%, transparent), inset 0 1px 0 rgba(255,255,255,0.10)",
              }}
            >
              <Globe2 className="h-10 w-10 sm:h-12 sm:w-12" style={{ color: "var(--accent-cyan-strong)" }} />
            </div>
          </div>

          {/* Main headline */}
          <h1 className="text-[clamp(2.6rem,7vw,5.5rem)] font-black leading-[0.92] tracking-tight">
            <span className="block" style={{ color: "rgba(255,255,255,0.97)" }}>
              AF World Cup
            </span>
            <span
              className="block"
              style={{
                background: "linear-gradient(135deg, var(--accent-cyan) 0%, #818cf8 52%, var(--accent-purple) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Bracket Challenge
            </span>
          </h1>

          {/* Subheadline */}
          <p
            className="mx-auto mt-5 max-w-2xl text-base leading-relaxed sm:text-lg lg:text-xl"
            style={{ color: "rgba(255,255,255,0.68)" }}
          >
            32 nations. 48 matches. One champion.{" "}
            Pick every game before kickoff and compete in your own pool &mdash; with AI analysis on every matchup.
            Free forever.
          </p>

          {/* Stats strip */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {(["32 Teams", "48 Matches", "Group Stage + Knockouts", "100% Free"] as const).map((label) => (
              <div key={label} className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: "rgba(255,255,255,0.50)" }}>
                <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "var(--accent-cyan-strong)" }} aria-hidden="true" />
                {label}
              </div>
            ))}
          </div>

          {/* ── CTA buttons ── */}
          <div className="mt-9 sm:mt-10">
            {!userId ? (
              /* Guest */
              <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <Link
                  href={bracketSignupHref}
                  className="inline-flex min-h-[52px] w-full max-w-xs items-center justify-center gap-2 rounded-2xl px-7 py-3 text-sm font-bold transition-all hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] sm:w-auto sm:min-w-[200px]"
                  style={{
                    background: "linear-gradient(135deg, var(--accent-cyan), color-mix(in srgb, var(--accent-cyan-strong) 68%, #818cf8))",
                    color: "var(--on-accent-bg)",
                    boxShadow: "0 10px 36px -10px color-mix(in srgb, var(--accent-cyan) 72%, transparent), 0 0 0 1px color-mix(in srgb, var(--accent-cyan) 28%, transparent)",
                  }}
                >
                  <Sparkles className="h-4 w-4 shrink-0" />
                  Sign Up Free
                </Link>
                <Link
                  href={bracketLoginHref}
                  className="inline-flex min-h-[52px] w-full max-w-xs items-center justify-center gap-2 rounded-2xl border px-7 py-3 text-sm font-semibold transition-all hover:opacity-90 sm:w-auto sm:min-w-[160px]"
                  style={{
                    borderColor: "rgba(255,255,255,0.20)",
                    color: "rgba(255,255,255,0.88)",
                    background: "rgba(255,255,255,0.06)",
                    backdropFilter: "blur(12px)",
                  }}
                >
                  Sign In
                </Link>
              </div>
            ) : (
              /* Authenticated — 2×2 on mobile, 4-col on sm+ */
              <div className="mx-auto grid max-w-xl grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
                <Link
                  href="/brackets/world-cup"
                  className="group flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-2xl border px-2 py-3 text-center text-xs font-bold transition-all hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: "linear-gradient(135deg, color-mix(in srgb, var(--accent-cyan) 24%, transparent), color-mix(in srgb, var(--accent-purple) 14%, transparent))",
                    borderColor: "color-mix(in srgb, var(--accent-cyan) 38%, transparent)",
                    color: "rgba(255,255,255,0.95)",
                    boxShadow: "0 8px 28px -10px color-mix(in srgb, var(--accent-cyan) 52%, transparent)",
                  }}
                  data-testid="bracket-world-cup-button"
                >
                  <Globe2 className="h-5 w-5" style={{ color: "var(--accent-cyan-strong)" }} />
                  <span>Open World Cup Pools</span>
                </Link>
                <Link
                  href="/brackets/leagues/new"
                  className="group flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-2xl border px-2 py-3 text-center text-xs font-bold transition-all hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: "color-mix(in srgb, var(--accent-cyan) 18%, transparent)",
                    borderColor: "color-mix(in srgb, var(--accent-cyan) 34%, transparent)",
                    color: "rgba(255,255,255,0.95)",
                    boxShadow: "0 8px 28px -12px color-mix(in srgb, var(--accent-cyan) 44%, transparent)",
                  }}
                  data-testid="bracket-create-pool-button"
                >
                  <Plus className="h-5 w-5" style={{ color: "var(--accent-cyan-strong)" }} />
                  <span>Create a Pool</span>
                </Link>
                <Link
                  href="/brackets/join"
                  className="group flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-2xl border px-2 py-3 text-center text-xs font-bold transition-all hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    borderColor: "rgba(255,255,255,0.14)",
                    color: "rgba(255,255,255,0.85)",
                    backdropFilter: "blur(12px)",
                  }}
                  data-testid="bracket-join-pool-button"
                >
                  <Users className="h-5 w-5" style={{ color: "rgba(255,255,255,0.60)" }} />
                  <span>Join Pool</span>
                </Link>
                <Link
                  href="/brackets/discover"
                  className="group flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-2xl border px-2 py-3 text-center text-xs font-bold transition-all hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: "color-mix(in srgb, var(--accent-amber) 16%, transparent)",
                    borderColor: "color-mix(in srgb, var(--accent-amber) 34%, transparent)",
                    color: "rgba(255,255,255,0.92)",
                    boxShadow: "0 8px 28px -12px color-mix(in srgb, var(--accent-amber) 44%, transparent)",
                  }}
                  data-testid="bracket-discover-link"
                >
                  <Trophy className="h-5 w-5" style={{ color: "var(--accent-amber-strong)" }} />
                  <span>Discover Pools</span>
                </Link>
              </div>
            )}
          </div>

          {/* Social proof */}
          <div className="mt-8 flex justify-center">
            <div
              className="inline-flex items-center gap-3 rounded-full border px-4 py-2"
              style={{
                background: "rgba(255,255,255,0.04)",
                borderColor: "rgba(255,255,255,0.10)",
                backdropFilter: "blur(12px)",
              }}
            >
              <div className="flex -space-x-1.5" aria-hidden="true">
                {(["🇧🇷", "🇫🇷", "🇩🇪", "🇦🇷"] as const).map((flag, i) => (
                  <div
                    key={i}
                    className="flex h-6 w-6 items-center justify-center rounded-full border text-xs"
                    style={{ borderColor: "rgba(0,0,0,0.35)", background: "rgba(255,255,255,0.09)" }}
                  >
                    {flag}
                  </div>
                ))}
              </div>
              <span className="text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.55)" }}>
                Join thousands of fans competing worldwide
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          MAIN CONTENT
      ══════════════════════════════════════════════ */}
      <div className="mx-auto max-w-5xl px-4 pb-8 sm:px-6">

        {/* ── Guest auth gate ── */}
        {!userId && (
          <div
            className="mb-10 -mt-6 rounded-3xl border p-6 text-center sm:p-8"
            style={{
              background: "color-mix(in srgb, var(--panel) 92%, transparent)",
              borderColor: "color-mix(in srgb, var(--accent-cyan) 26%, var(--border))",
              boxShadow: "0 28px 64px -32px color-mix(in srgb, var(--accent-cyan) 32%, transparent)",
              backdropFilter: "blur(16px)",
            }}
          >
            <div
              className="mb-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em]"
              style={{
                background: "color-mix(in srgb, var(--accent-cyan) 12%, transparent)",
                borderColor: "color-mix(in srgb, var(--accent-cyan) 28%, transparent)",
                color: "var(--accent-cyan-strong)",
              }}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Get started free
            </div>
            <h2 className="mb-2 text-xl font-bold sm:text-2xl" style={{ color: "var(--text)" }}>
              Create a pool. Invite friends. Fill your bracket.
            </h2>
            <p className="mx-auto mb-6 max-w-md text-sm" style={{ color: "var(--muted)" }}>
              Launch your first bracket pool in minutes. AI analysis on every pick. No fees, no premium tiers. Free forever.
            </p>
            <div className="flex flex-col items-center gap-2.5 sm:flex-row sm:justify-center sm:gap-3">
              <Link
                href={bracketSignupHref}
                className="inline-flex w-full min-w-[10rem] items-center justify-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-bold transition hover:opacity-90 sm:w-auto"
                style={{
                  backgroundImage: "linear-gradient(90deg, var(--accent-cyan), color-mix(in srgb, var(--accent-cyan-strong) 72%, #3b82f6))",
                  color: "var(--on-accent-bg)",
                  boxShadow: "0 8px 24px -10px color-mix(in srgb, var(--accent-cyan) 60%, transparent)",
                }}
              >
                Sign Up Free
              </Link>
              <Link
                href={bracketLoginHref}
                className="inline-flex w-full min-w-[10rem] items-center justify-center gap-1.5 rounded-xl border px-5 py-2.5 text-sm font-semibold transition hover:opacity-90 sm:w-auto"
                style={{ borderColor: "var(--border)", color: "var(--text)", background: "color-mix(in srgb, var(--panel2) 50%, transparent)" }}
              >
                Sign In
              </Link>
            </div>
            {/* Feature highlights */}
            <div className="mt-6 grid grid-cols-1 gap-3 text-left sm:grid-cols-3">
              {(
                [
                  { icon: Globe2, label: "World Cup Bracket", desc: "Full FIFA 2026 bracket with group stage + knockout picks", accent: "var(--accent-cyan-strong)" },
                  { icon: Sparkles, label: "AI Coach", desc: "Win probabilities and upset analysis on every matchup", accent: "#c084fc" },
                  { icon: Users, label: "Private Pools", desc: "Invite friends with a code — your own live leaderboard", accent: "var(--accent-amber-strong)" },
                ] as const
              ).map(({ icon: Icon, label, desc, accent }) => (
                <div
                  key={label}
                  className="rounded-xl border p-4"
                  style={{
                    borderColor: "var(--border)",
                    background: "color-mix(in srgb, var(--panel2) 60%, transparent)",
                  }}
                >
                  <Icon className="mb-2 h-5 w-5" style={{ color: accent }} />
                  <div className="mb-1 text-sm font-semibold" style={{ color: "var(--text)" }}>{label}</div>
                  <div className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>{desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── My Active Pools (authenticated) ── */}
        {userId && combinedMyPools.length > 0 && (
          <section className="mb-8 -mt-6">
            <div className="mb-3 flex items-center justify-between px-0.5">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "var(--muted)" }}>
                My Pools
              </h2>
              <span
                className="rounded-full px-2.5 py-0.5 text-[10px] font-bold"
                style={{
                  background: "color-mix(in srgb, var(--accent-cyan) 14%, transparent)",
                  color: "var(--accent-cyan-strong)",
                }}
              >
                {combinedMyPools.length} active
              </span>
            </div>
            <div className="space-y-2.5">
              {combinedMyPools.map((pool) => {
                const sportUI = resolveBracketSportUI(pool.sport ?? null)
                const challengeLabel = resolveBracketChallengeLabel({
                  sport: pool.sport,
                  challengeType: pool.challengeType,
                  bracketType: pool.bracketType,
                })
                const accent = resolvePoolCardAccent(pool.sport, pool.challengeType)
                const isWorldCup = String(pool.challengeType ?? "").toLowerCase().includes("world_cup")
                return (
                  <Link
                    key={pool.id}
                    href={pool.href}
                    className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border p-4 transition-all hover:-translate-y-px hover:shadow-xl hover:opacity-95 sm:p-4.5"
                    style={{
                      borderColor: accent.border,
                      background: `linear-gradient(135deg, ${accent.bg} 0%, color-mix(in srgb, var(--panel) 92%, transparent) 55%)`,
                      boxShadow: `0 2px 16px -8px ${accent.glow}`,
                      backdropFilter: "blur(12px)",
                    }}
                  >
                    {/* Subtle right-edge glow */}
                    <div
                      className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-60"
                      aria-hidden="true"
                      style={{ background: `radial-gradient(circle, ${accent.glow} 0%, transparent 70%)` }}
                    />

                    {/* Sport badge */}
                    <div
                      className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border"
                      style={{ background: accent.bg, borderColor: accent.border }}
                    >
                      <span className="text-[11px] font-black leading-none" style={{ color: accent.text }}>
                        {sportUI.badge}
                      </span>
                    </div>

                    {/* Pool info */}
                    <div className="relative min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-bold" style={{ color: "var(--text)" }}>{pool.name}</span>
                        <span
                          className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                          style={{ background: accent.bg, color: accent.text, border: `1px solid ${accent.border}` }}
                        >
                          {isWorldCup ? "World Cup" : sportUI.shortLabel}
                        </span>
                      </div>
                      <div className="mt-0.5 truncate text-[11px]" style={{ color: "var(--muted)" }}>{challengeLabel}</div>
                      <div className="mt-1 flex items-center gap-3 text-[11px]" style={{ color: "var(--muted2)" }}>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {pool.members} member{pool.members !== 1 ? "s" : ""}
                        </span>
                        <span className="flex items-center gap-1">
                          <Trophy className="h-3 w-3" />
                          {pool.entries} bracket{pool.entries !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>

                    {/* View Pool label + chevron */}
                    <div className="relative flex shrink-0 items-center gap-1">
                      <span className="hidden text-[11px] font-semibold sm:block" style={{ color: accent.text }}>
                        View Pool
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" style={{ color: accent.text }} />
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Quick actions (authenticated) ── */}
        {userId && (
          <section className="mb-8">
            {combinedMyPools.length === 0 && (
              /* Empty pool state — pull up from hero */
              <div
                className="mb-5 -mt-6 rounded-2xl border border-dashed p-6 text-center"
                style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--panel2) 40%, transparent)" }}
              >
                <Globe2 className="mx-auto mb-2 h-8 w-8 opacity-30" style={{ color: "var(--muted)" }} />
                <p className="text-sm font-medium" style={{ color: "var(--text)" }}>No pools yet</p>
                <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
                  Create a World Cup bracket pool or join a friend&apos;s pool to get started.
                </p>
              </div>
            )}
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-3">
              <Link
                href="/brackets/leagues/new"
                className="inline-flex min-h-[52px] touch-manipulation items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition hover:opacity-90"
                style={{
                  backgroundImage: "linear-gradient(90deg, var(--accent-cyan), color-mix(in srgb, var(--accent-cyan-strong) 72%, #3b82f6))",
                  color: "var(--on-accent-bg)",
                  boxShadow: "0 8px 24px -10px color-mix(in srgb, var(--accent-cyan) 60%, transparent)",
                }}
                data-testid="bracket-create-pool-button"
              >
                <Plus className="h-4 w-4 shrink-0" />
                Create a Bracket
              </Link>
              <Link
                href="/brackets/discover"
                className="inline-flex min-h-[52px] touch-manipulation items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition hover:opacity-90"
                style={{ borderColor: "var(--border)", color: "var(--text)", background: "color-mix(in srgb, var(--panel2) 55%, transparent)" }}
                data-testid="bracket-discover-link"
              >
                <Users className="h-4 w-4 shrink-0" />
                Find a Pool
              </Link>
              <Link
                href="/brackets/join"
                className="inline-flex min-h-[52px] touch-manipulation items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition hover:opacity-90"
                style={{ borderColor: "var(--border)", color: "var(--text)", background: "color-mix(in srgb, var(--panel2) 55%, transparent)" }}
                data-testid="bracket-join-pool-button"
              >
                Join with Code
              </Link>
            </div>
          </section>
        )}

        {/* ── Featured: World Cup Challenge ── */}
        <section className="mb-8">
          <Link
            href="/brackets/world-cup"
            className="group relative block overflow-hidden rounded-3xl border p-5 transition hover:opacity-95 sm:p-6"
            style={{
              borderColor: "color-mix(in srgb, var(--accent-cyan) 34%, transparent)",
              background:
                "linear-gradient(135deg, color-mix(in srgb, var(--accent-cyan) 14%, transparent) 0%, color-mix(in srgb, var(--accent-purple) 10%, transparent) 100%)",
              boxShadow: "0 20px 56px -30px color-mix(in srgb, var(--accent-cyan) 64%, transparent)",
            }}
            data-testid="world-cup-bracket-card"
          >
            <div
              className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full"
              aria-hidden="true"
              style={{
                background: "radial-gradient(circle, color-mix(in srgb, var(--accent-cyan) 26%, transparent) 0%, transparent 70%)",
              }}
            />
            <div className="relative flex items-start gap-4">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border"
                style={{
                  background: "color-mix(in srgb, var(--accent-cyan) 18%, transparent)",
                  borderColor: "color-mix(in srgb, var(--accent-cyan) 34%, transparent)",
                }}
              >
                <Globe2 className="h-7 w-7" style={{ color: "var(--accent-cyan-strong)" }} />
              </div>
              <div className="min-w-0 flex-1">
                <div
                  className="mb-1.5 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                  style={{
                    background: "color-mix(in srgb, var(--accent-amber) 16%, transparent)",
                    color: "var(--accent-amber-strong)",
                  }}
                >
                  <Trophy className="h-3 w-3" />
                  Featured &middot; June&nbsp;12&nbsp;&ndash;&nbsp;July&nbsp;19,&nbsp;2026
                </div>
                <h3 className="mb-1 text-lg font-bold leading-tight sm:text-xl" style={{ color: "var(--text)" }}>
                  FIFA World Cup 2026 Bracket Challenge
                </h3>
                <p className="text-xs leading-relaxed sm:text-sm" style={{ color: "var(--muted)" }}>
                  Pre-tournament &mdash; rank your groups, pick the knockout path, and lock your champion before kickoff.
                  Invite-link pools, live leaderboards, AI matchup notes included.
                </p>
                <div
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold"
                  style={{ color: "var(--accent-cyan-strong)" }}
                >
                  Open World Cup Challenge
                  <ChevronRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                </div>
              </div>
            </div>
          </Link>
        </section>

        {/* ── Playoff Challenge by Sport ── */}
        <section className="mb-8">
          <div
            className="rounded-2xl border p-4 sm:p-5"
            style={{
              borderColor: "var(--border)",
              background: "color-mix(in srgb, var(--panel2) 60%, transparent)",
            }}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "var(--muted)" }}>
                Playoff Challenge by Sport
              </h2>
              <span className="text-[10px] font-semibold" style={{ color: "var(--muted2)" }}>
                {playoffSports.length} sport{playoffSports.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
              {playoffSports.map(({ sport, ui }) => {
                const hasQuick = sport === "NBA" || sport === "NHL"
                return (
                  <div
                    key={sport}
                    className="rounded-xl border p-3 transition"
                    style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--panel) 80%, transparent)" }}
                  >
                    <Link
                      href={safeResolvePlayoffHref(sport)}
                      className="flex items-center gap-2 text-sm font-semibold transition hover:opacity-90"
                      data-testid={`bracket-playoff-sport-${sport}`}
                      style={{ color: "var(--text)" }}
                    >
                      <span
                        className="inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-lg px-1.5 text-[10px] font-bold"
                        style={{
                          background: "color-mix(in srgb, var(--accent-cyan) 18%, transparent)",
                          color: "var(--accent-cyan-strong)",
                        }}
                      >
                        {ui.badge}
                      </span>
                      <span className="truncate">{ui.shortLabel}</span>
                      <ChevronRight className="ml-auto h-3.5 w-3.5 shrink-0" style={{ color: "var(--muted2)" }} />
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
        </section>

        {/* ── AI Coach promo ── */}
        <section className="mb-8">
          <Link
            href={chimmyHref}
            className="group relative block overflow-hidden rounded-3xl border p-5 transition hover:opacity-95 sm:p-6"
            style={{
              borderColor: "color-mix(in srgb, var(--accent-purple) 32%, transparent)",
              background:
                "linear-gradient(135deg, color-mix(in srgb, var(--accent-purple) 13%, transparent) 0%, color-mix(in srgb, var(--accent-cyan) 8%, transparent) 100%)",
              boxShadow: "0 16px 44px -24px color-mix(in srgb, var(--accent-purple) 52%, transparent)",
            }}
          >
            <div
              className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full"
              aria-hidden="true"
              style={{
                background: "radial-gradient(circle, color-mix(in srgb, var(--accent-purple) 22%, transparent) 0%, transparent 70%)",
              }}
            />
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border"
                style={{
                  background: "color-mix(in srgb, var(--accent-purple) 18%, transparent)",
                  borderColor: "color-mix(in srgb, var(--accent-purple) 34%, transparent)",
                }}
              >
                <Sparkles className="h-7 w-7" style={{ color: "#c084fc" }} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: "#c084fc" }}>
                  AI-Powered
                </div>
                <h3 className="text-base font-bold sm:text-lg" style={{ color: "var(--text)" }}>
                  Your AI Coach is Ready
                </h3>
                <p className="mt-1 text-xs leading-relaxed sm:text-sm" style={{ color: "var(--muted)" }}>
                  Matchup probabilities, upset leverage scores, and uniqueness guidance from Chimmy &mdash; your AI sports analyst.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(["Win Probabilities", "Upset Watch", "Group Analysis", "Pick Uniqueness"] as const).map((f) => (
                    <span
                      key={f}
                      className="rounded-full border px-2.5 py-0.5 text-[11px] font-semibold"
                      style={{
                        borderColor: "color-mix(in srgb, #c084fc 24%, transparent)",
                        background: "color-mix(in srgb, #c084fc 10%, transparent)",
                        color: "#c084fc",
                      }}
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>
              <ChevronRight
                className="hidden h-5 w-5 shrink-0 transition group-hover:translate-x-1 sm:block"
                style={{ color: "#c084fc" }}
              />
            </div>
          </Link>
        </section>

        {/* ── Secondary links (authenticated) ── */}
        {userId && (
          <div
            className="mb-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs"
            style={{ color: "var(--muted2)" }}
          >
            <Link href="/brackets/discover" className="transition hover:opacity-80" style={{ color: "var(--muted)" }}>
              Discover public pools
            </Link>
            <span aria-hidden="true" style={{ color: "var(--muted2)" }}>&middot;</span>
            <Link href="/creators" className="transition hover:opacity-80" style={{ color: "var(--muted)" }}>
              Creator leagues
            </Link>
            <span aria-hidden="true" style={{ color: "var(--muted2)" }}>&middot;</span>
            <span>Signed in as {user?.name || user?.email || "User"}</span>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════
          BELOW-FOLD: HOW IT WORKS + SCORING + LEGAL
      ══════════════════════════════════════════════ */}
      <div className="mx-auto max-w-2xl space-y-6 px-4 pb-12 sm:px-6">

        {/* How It Works */}
        <div
          className="overflow-hidden rounded-2xl border"
          style={{ background: "color-mix(in srgb, var(--panel) 70%, transparent)", borderColor: "var(--border)" }}
        >
          <div className="border-b px-5 pt-5 pb-3" style={{ borderColor: "var(--border)" }}>
            <div className="mb-1 flex items-center gap-2">
              <Trophy className="h-4 w-4" style={{ color: "#fb923c" }} />
              <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: "#fb923c" }}>
                How It Works
              </h3>
            </div>
          </div>
          <div className="space-y-3 px-5 pb-5 pt-4">
            {(
              [
                { step: "1", title: "Create or Join a Pool", desc: "Start your own bracket pool or join a friend's with an invite code. Unlimited members, always free." },
                { step: "2", title: "Fill Out Your Bracket", desc: "Tap any matchup to open the pick wizard. Choose winners round by round. AI analysis helps you make smarter picks." },
                { step: "3", title: "Compete & Climb", desc: "Track your score on the live leaderboard. Earn upset bonuses, leverage multipliers, and bragging rights." },
                { step: "4", title: "Win Your Pool", desc: "The player with the most points at the end of the tournament wins. Global leaderboard rankings included." },
              ] as const
            ).map((item) => (
              <div key={item.step} className="flex items-start gap-3">
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-black"
                  style={{ background: "rgba(251,146,60,0.12)", color: "#fb923c" }}
                >
                  {item.step}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>{item.title}</div>
                  <div className="mt-0.5 text-xs leading-relaxed" style={{ color: "var(--muted)" }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scoring System */}
        <div
          className="overflow-hidden rounded-2xl border"
          style={{ background: "color-mix(in srgb, var(--panel) 70%, transparent)", borderColor: "var(--border)" }}
        >
          <div className="border-b px-5 pt-5 pb-3" style={{ borderColor: "var(--border)" }}>
            <div className="mb-1 flex items-center gap-2">
              <Star className="h-4 w-4" style={{ color: "#3b82f6" }} />
              <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: "#3b82f6" }}>
                AF March Madness Scoring
              </h3>
            </div>
            <p className="text-xs" style={{ color: "var(--muted2)" }}>
              Rewards bold picks and smart strategy.
            </p>
          </div>
          <div className="px-5 pb-5 pt-4">
            <div className="mb-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
              {(
                [
                  { round: "R64", pts: "1" },
                  { round: "R32", pts: "2" },
                  { round: "S16", pts: "5" },
                  { round: "E8", pts: "10" },
                  { round: "F4", pts: "18" },
                  { round: "CH", pts: "30" },
                ] as const
              ).map((r) => (
                <div
                  key={r.round}
                  className="rounded-xl p-2.5 text-center"
                  style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.1)" }}
                >
                  <div className="text-[10px] font-bold uppercase" style={{ color: "var(--muted2)" }}>{r.round}</div>
                  <div className="text-lg font-black" style={{ color: "#3b82f6" }}>{r.pts}</div>
                  <div className="text-[9px]" style={{ color: "var(--muted2)" }}>pts</div>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <div className="flex items-start gap-2.5 rounded-lg p-2.5" style={{ background: "rgba(192,132,252,0.04)" }}>
                <Zap className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: "#c084fc" }} />
                <div>
                  <span className="text-xs font-bold" style={{ color: "#c084fc" }}>Upset Delta Bonus</span>
                  <span className="ml-1 text-xs" style={{ color: "var(--muted)" }}>
                    &mdash; Earn bonus points for correctly picking upsets. The bigger the seed difference, the bigger the bonus.
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-2.5 rounded-lg p-2.5" style={{ background: "rgba(251,146,60,0.04)" }}>
                <Crown className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: "#fb923c" }} />
                <div>
                  <span className="text-xs font-bold" style={{ color: "#fb923c" }}>Leverage Bonus</span>
                  <span className="ml-1 text-xs" style={{ color: "var(--muted)" }}>
                    &mdash; Going against the consensus with a correct pick earns you a leverage multiplier.
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-2.5 rounded-lg p-2.5" style={{ background: "rgba(34,197,94,0.04)" }}>
                <Shield className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: "#22c55e" }} />
                <div>
                  <span className="text-xs font-bold" style={{ color: "#22c55e" }}>Insurance Token</span>
                  <span className="ml-1 text-xs" style={{ color: "var(--muted)" }}>
                    &mdash; Protect one pick per round. If your insured pick loses, you keep partial points.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FanCred */}
        <div
          className="overflow-hidden rounded-2xl border"
          style={{
            background: "linear-gradient(135deg, rgba(59,130,246,0.06) 0%, rgba(192,132,252,0.04) 100%)",
            borderColor: "rgba(59,130,246,0.12)",
          }}
        >
          <div className="px-5 py-5">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl" style={{ background: "rgba(59,130,246,0.12)" }}>
                <ExternalLink className="h-5 w-5" style={{ color: "#3b82f6" }} />
              </div>
              <div className="flex-1">
                <h3 className="mb-1 text-sm font-bold" style={{ color: "var(--text)" }}>League Dues &amp; Payouts</h3>
                <p className="mb-3 text-xs" style={{ color: "var(--muted)" }}>
                  Want to play for real money? Use FanCred to collect league dues and manage payouts. AllFantasy brackets are always free &mdash; FanCred handles the money side separately.
                </p>
                <a
                  href="https://fancred.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all"
                  style={{ background: "rgba(59,130,246,0.15)", color: "#3b82f6", border: "1px solid rgba(59,130,246,0.2)" }}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Set Up on FanCred
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Support */}
        <div
          className="overflow-hidden rounded-2xl border"
          style={{
            background: "linear-gradient(135deg, rgba(239,68,68,0.06) 0%, rgba(251,146,60,0.04) 100%)",
            borderColor: "rgba(239,68,68,0.12)",
          }}
        >
          <div className="px-5 py-5">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl" style={{ background: "rgba(239,68,68,0.12)" }}>
                <Heart className="h-5 w-5" style={{ color: "#ef4444" }} />
              </div>
              <div className="flex-1">
                <h3 className="mb-1 text-sm font-bold" style={{ color: "var(--text)" }}>Support AllFantasy</h3>
                <p className="mb-3 text-xs" style={{ color: "var(--muted)" }}>
                  AllFantasy is 100% free. If you enjoy the platform, consider a small donation to help cover server costs, data feeds, and development.
                </p>
                <Link
                  href="/donate"
                  className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all"
                  style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}
                >
                  <Heart className="h-3.5 w-3.5" />
                  Support Us
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Rules */}
        <div
          className="overflow-hidden rounded-2xl border"
          style={{ background: "color-mix(in srgb, var(--panel) 60%, transparent)", borderColor: "var(--border)" }}
        >
          <div className="border-b px-5 pt-5 pb-3" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4" style={{ color: "var(--muted2)" }} />
              <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: "var(--muted)" }}>Rules &amp; Fair Play</h3>
            </div>
          </div>
          <div className="space-y-2 px-5 pb-5 pt-4">
            {(
              [
                "All brackets are 100% free. No hosting fees, no premium tiers.",
                "Each pool member gets one bracket entry per tournament.",
                "All picks must be submitted before the tournament tips off.",
                "Picks lock per game at scheduled tip-off time. No changes after lock.",
                "AF March Madness scoring is used for all pools: R64=1, R32=2, S16=5, E8=10, F4=18, CH=30.",
                "Upset Delta Bonus: Correctly picking a lower seed earns bonus points equal to the seed difference.",
                "Leverage Bonus: Going against consensus (>60% ownership) with a correct pick earns a 1.5x multiplier.",
                "Tie-breaker: Championship game total score prediction. Closest without going over wins.",
                "No collusion, bracket sharing before lock, or multi-accounting. Violations = removal from pool.",
              ] as const
            ).map((rule, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div
                  className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-[9px] font-bold"
                  style={{ background: "color-mix(in srgb, var(--panel2) 80%, transparent)", color: "var(--muted2)", marginTop: "2px" }}
                >
                  {i + 1}
                </div>
                <span className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>{rule}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Legal */}
        <div
          className="overflow-hidden rounded-2xl border"
          style={{ background: "color-mix(in srgb, var(--panel) 50%, transparent)", borderColor: "var(--border)" }}
        >
          <div className="border-b px-5 pt-5 pb-3" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4" style={{ color: "var(--muted2)" }} />
              <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: "var(--muted2)" }}>Legal Disclaimer</h3>
            </div>
          </div>
          <div className="space-y-3 px-5 pb-5 pt-4">
            {(
              [
                {
                  accent: "#ef4444",
                  title: "Not Gambling — No Prizes, No Wagering",
                  body: "AllFantasy does not promote, facilitate, or constitute gambling in any form. AllFantasy does not offer, award, distribute, or guarantee any prizes, monetary or otherwise. No real money, cryptocurrency, or item of monetary value is at stake. Participation is entirely free and for entertainment purposes only.",
                },
                {
                  accent: "#3b82f6",
                  title: "AI Features — Experimental, Not an Advantage",
                  body: "AI features including matchup analysis, win probabilities, and pick assistance are experimental and provided for entertainment only. AllFantasy makes no warranties regarding accuracy or reliability of AI-generated content. All bracket selections are made solely at the user's own discretion.",
                },
                {
                  accent: "#22c55e",
                  title: "Donations — Voluntary & Non-Refundable",
                  body: "Any financial transactions are strictly voluntary donations. Donations do not grant additional features or preferential treatment, and are non-refundable. AllFantasy is not a payment processor for league dues or prize pools.",
                },
                {
                  accent: "#fb923c",
                  title: "Third-Party Services",
                  body: "AllFantasy may link to third-party services (e.g. FanCred) for league dues and payouts. AllFantasy is not affiliated with or responsible for any third-party service. Any third-party transactions are governed by those platforms' terms.",
                },
              ] as const
            ).map(({ accent, title, body }) => (
              <div
                key={title}
                className="rounded-xl p-3.5"
                style={{ background: `${accent}08`, border: `1px solid ${accent}14` }}
              >
                <div className="mb-1 text-xs font-bold" style={{ color: accent }}>{title}</div>
                <p className="text-[11px] leading-relaxed" style={{ color: "var(--muted)" }}>{body}</p>
              </div>
            ))}
            <p className="pt-1 text-center text-[10px]" style={{ color: "var(--muted2)" }}>
              Last updated: February 2026. AllFantasy reserves the right to modify this disclaimer at any time.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="pb-6 text-center">
          <div className="mb-2 flex items-center justify-center gap-2">
            <Image src="/af-crest.png" alt="AF" width={20} height={20} className="rounded opacity-40" />
            <span className="text-xs font-semibold" style={{ color: "var(--muted2)" }}>AllFantasy</span>
          </div>
          <p className="text-[10px]" style={{ color: "var(--muted2)" }}>
            Free forever. Built for fans, by fans.
          </p>
        </div>
      </div>
    </div>
  )
}
