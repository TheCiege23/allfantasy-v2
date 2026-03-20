"use client"

import Link from "next/link"
import { useMemo } from "react"
import { ArrowRight, Crown } from "lucide-react"

interface DashboardProps {
  onboardingComplete?: boolean
  checklistState?: unknown
  retentionNudges?: unknown[]
  user: {
    id: string
    username: string | null
    displayName: string | null
    email: string
    emailVerified: boolean
    avatarUrl: string | null
  }
  profile: {
    sleeperUsername: string | null
    isVerified: boolean
    isAgeConfirmed: boolean
    profileComplete: boolean
  }
  leagues: {
    id: string
    name: string
    tournamentId: string
    memberCount: number
    leagueTier: number
    inTierRange: boolean
  }[]
  userCareerTier?: number
  entries: {
    id: string
    name: string
    tournamentId: string
    score: number
  }[]
  isAdmin?: boolean
}

export default function DashboardContent({ user, profile, leagues, entries, userCareerTier }: DashboardProps) {
  const displayName = user.displayName || user.username || user.email.split("@")[0] || "Manager"
  const visibleLeagues = useMemo(() => leagues.filter((league) => league.inTierRange !== false), [leagues])
  const selectedLeague = visibleLeagues[0] || null

  const careerTier = Number.isFinite(Number(userCareerTier)) ? Math.max(1, Math.floor(Number(userCareerTier))) : 1
  const entriesCount = entries.length
  const heroLabel = profile.sleeperUsername
    ? `Sleeper linked @${profile.sleeperUsername}`
    : "Sleeper not linked"

  return (
    <main className="min-h-screen bg-[#0a0820] text-slate-100">
      <div className="mx-auto w-full max-w-[1220px] px-4 py-8 md:px-6 md:py-10">
        <div className="grid min-h-[74vh] gap-8 lg:grid-cols-[1.06fr_0.94fr] lg:gap-10">
          <section className="flex flex-col justify-end rounded-3xl border border-cyan-500/20 bg-[radial-gradient(85%_80%_at_25%_22%,rgba(34,211,238,0.2),transparent_70%),radial-gradient(70%_70%_at_70%_70%,rgba(139,92,246,0.24),transparent_75%),#110f2f] p-7 md:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200/80">{heroLabel}</p>
            <h1 className="mt-5 max-w-xl text-4xl font-black leading-[1.04] md:text-6xl">{displayName}</h1>
            <p className="mt-5 max-w-lg text-sm text-slate-300 md:text-base">
              Tier {careerTier} account with {visibleLeagues.length} visible leagues and {entriesCount} tracked entries.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-2 text-xs text-slate-300">
              <span className="rounded-full border border-slate-600/80 bg-slate-900/40 px-3 py-1">Tier {careerTier}</span>
              <span className="rounded-full border border-slate-600/80 bg-slate-900/40 px-3 py-1">{visibleLeagues.length} visible leagues</span>
              <span className="rounded-full border border-slate-600/80 bg-slate-900/40 px-3 py-1">{entriesCount} entries tracked</span>
            </div>

            <div className="mt-6">
              <Link
                href="/af-legacy"
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-300"
              >
                Open Legacy <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </section>

          <section className="rounded-3xl border border-cyan-500/25 bg-[linear-gradient(160deg,rgba(67,32,125,0.88),rgba(28,25,60,0.95))] p-6 md:p-8">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100">
              <Crown className="h-3.5 w-3.5" /> Legacy
            </div>

            <h2 className="text-3xl font-extrabold">Build Your Legacy Profile</h2>
            <p className="mt-2 text-sm text-slate-300">Current account connection and profile status.</p>

            <div className="mt-5 space-y-2 text-sm">
              <div className="rounded-xl border border-slate-600/80 bg-slate-900/35 px-4 py-3 text-slate-200">
                Linked Sleeper: {profile.sleeperUsername ? `@${profile.sleeperUsername}` : "Not linked"}
              </div>
              <div className="rounded-xl border border-slate-600/80 bg-slate-900/35 px-4 py-3 text-slate-300">
                Primary league: {selectedLeague?.name || "No leagues available yet"}
              </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <Link
                href="/af-legacy?tab=transfer"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 px-4 py-3 text-sm font-bold text-white hover:opacity-95"
              >
                Build My Legacy Profile
              </Link>
              <Link
                href="/af-legacy"
                className="inline-flex items-center justify-center rounded-xl border border-slate-500/70 bg-slate-900/45 px-4 py-3 text-sm font-semibold hover:border-cyan-300/60"
              >
                Legacy Home
              </Link>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-slate-300">
              <span className="rounded-full border border-slate-600/80 bg-slate-900/35 px-2.5 py-1">
                Verified: {profile.isVerified ? "Yes" : "No"}
              </span>
              <span className="rounded-full border border-slate-600/80 bg-slate-900/35 px-2.5 py-1">
                Age confirmed: {profile.isAgeConfirmed ? "Yes" : "No"}
              </span>
              <span className="rounded-full border border-slate-600/80 bg-slate-900/35 px-2.5 py-1">
                Profile complete: {profile.profileComplete ? "Yes" : "No"}
              </span>
            </div>
          </section>
        </div>
      </div>

    </main>
  )
}
