import Link from "next/link"
import Image from "next/image"
import { getServerSession } from "next-auth"
import { Bot, ChevronRight, Globe2, Lock, Plus, Sparkles, Trophy, Users, Radio } from "lucide-react"
import { authOptions } from "@/lib/auth"
import { listUserWorldCupChallenges } from "@/lib/world-cup"

const WC_LOGO_SRC = "/images/brackets/world-cup/af-world-cup-logo.png"

export const dynamic = "force-dynamic"

type SessionUser = { id?: string | null; email?: string | null; name?: string | null }
type WorldCupChallengeSummary = {
  id: string
  name: string
  seasonYear: number
  status: string
  participantCount: number
  totalScore: number
  rank: number | null
}

function PoolStatusBadge({ status }: { status: string }) {
  if (status === "locked" || status === "final") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white/40">
        <Lock className="h-2.5 w-2.5" />
        {status === "final" ? "Final" : "Locked"}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-300">
      <Radio className="h-2.5 w-2.5" />
      Open
    </span>
  )
}

const FEATURE_BULLETS = [
  { icon: Users, text: "Private or public pools — up to 100 participants." },
  { icon: Trophy, text: "Up to 5 brackets per user, compete with multiple strategies." },
  { icon: Trophy, text: "NCAA-style scoring — more points for later rounds." },
  { icon: Sparkles, text: "Guided pick builder with AI matchup previews." },
  { icon: Globe2, text: "Live score and match-minute tracking." },
  { icon: Bot, text: "AI bracket builder fills unpicked matches automatically." },
  { icon: Trophy, text: "Per-bracket leaderboard — every entry ranked individually." },
  { icon: Lock, text: "Brackets lock when the first World Cup match begins." },
]

export default async function WorldCupBracketsPage() {
  const session = (await getServerSession(authOptions as any)) as { user?: SessionUser } | null
  const userId = session?.user?.id ?? null
  const challenges: WorldCupChallengeSummary[] = userId
    ? await listUserWorldCupChallenges(userId)
    : []

  return (
    <main className="min-h-screen bg-[#05070b] text-white">
      <section className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6">
        {/* Nav row */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/brackets"
            className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-white/60 hover:text-white"
          >
            ← Back to Brackets
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/brackets/world-cup/discover"
              className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/25 bg-cyan-400/10 px-4 py-2 text-sm font-bold text-cyan-100 hover:bg-cyan-400/15"
            >
              Discover public pools
            </Link>
            {userId && (
              <Link
                href="/brackets/world-cup/join"
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-white/70 hover:bg-white/[0.08]"
              >
                Join with Invite Code
              </Link>
            )}
            <Link
              href="/brackets/world-cup/create"
              className="inline-flex items-center gap-2 rounded-lg bg-cyan-300 px-4 py-2 text-sm font-black text-black"
            >
              <Plus className="h-4 w-4" />
              Create Pool
            </Link>
          </div>
        </div>

        {/* Hero */}
        <header className="relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
            <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/35 bg-cyan-300/10 p-2 sm:h-24 sm:w-24">
              <Image
                src={WC_LOGO_SRC}
                alt="AllFantasy World Cup"
                width={96}
                height={96}
                className="h-full w-full object-contain"
                priority
              />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                World Cup Bracket Challenge
              </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-white/60">
            Create an NCAA-style bracket pool for the FIFA World Cup. Invite friends, make picks,
            track live scores, and climb the leaderboard.
          </p>

          {/* Feature bullets */}
          <ul className="mt-5 grid gap-2 sm:grid-cols-2">
            {FEATURE_BULLETS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-2 text-sm text-white/55">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300/70" />
                {text}
              </li>
            ))}
          </ul>

          {/* CTA strip */}
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/brackets/world-cup/create"
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-5 py-2.5 text-sm font-black text-black"
            >
              <Plus className="h-4 w-4" />
              Create World Cup Pool
            </Link>
            <Link
              href="/brackets/world-cup/discover"
              className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-5 py-2.5 text-sm font-bold text-cyan-100 hover:bg-cyan-400/15"
            >
              Discover public pools
            </Link>
            {userId && (
              <Link
                href="/brackets/world-cup/join"
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.05] px-5 py-2.5 text-sm font-bold text-white/75 hover:bg-white/[0.09]"
              >
                Join with Invite Code
              </Link>
            )}
          </div>
            </div>
          </div>
        </header>

        {/* Your challenges */}
        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-black uppercase tracking-[0.16em] text-white/45">
              Your World Cup Pools
            </h2>
            {userId && challenges.length > 0 && (
              <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-0.5 text-xs font-bold text-white/35">
                {challenges.length} pool{challenges.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {userId ? (
            challenges.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {challenges.map((challenge) => (
                  <Link
                    key={challenge.id}
                    href={`/brackets/world-cup/${challenge.id}`}
                    className="group flex flex-col rounded-xl border border-white/10 bg-white/[0.04] p-4 transition-colors hover:border-white/20 hover:bg-white/[0.07]"
                  >
                    {/* Pool name + status */}
                    <div className="flex min-w-0 items-start justify-between gap-2">
                      <span className="min-w-0 truncate font-black text-white group-hover:text-cyan-100">
                        {challenge.name}
                      </span>
                      <PoolStatusBadge status={challenge.status} />
                    </div>

                    {/* Meta row */}
                    <div className="mt-1.5 flex items-center gap-2 text-xs text-white/40">
                      <span>{challenge.seasonYear}</span>
                      <span className="text-white/20">·</span>
                      <Users className="h-3 w-3" />
                      <span>{challenge.participantCount} participant{challenge.participantCount !== 1 ? "s" : ""}</span>
                    </div>

                    {/* Score row */}
                    <div className="mt-3 flex items-end justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="text-[9px] font-bold uppercase tracking-widest text-white/30">Score</div>
                          <div className="text-base font-black tabular-nums text-cyan-200">
                            {challenge.totalScore} pts
                          </div>
                        </div>
                        {challenge.rank != null && (
                          <div>
                            <div className="text-[9px] font-bold uppercase tracking-widest text-white/30">Rank</div>
                            <div className="text-base font-black tabular-nums text-white">
                              #{challenge.rank}
                            </div>
                          </div>
                        )}
                        {challenge.rank == null && (
                          <div>
                            <div className="text-[9px] font-bold uppercase tracking-widest text-white/30">Rank</div>
                            <div className="text-sm font-black text-white/35">—</div>
                          </div>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-white/25 transition-transform group-hover:translate-x-0.5 group-hover:text-cyan-300/60" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-white/15 bg-white/[0.03] px-6 py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-300/10">
                  <Globe2 className="h-6 w-6 text-cyan-200" />
                </div>
                <div>
                  <p className="font-black text-white">No World Cup pools yet</p>
                  <p className="mt-1 text-sm text-white/45">
                    You haven't created or joined a World Cup bracket pool.
                  </p>
                  <p className="mt-1 text-xs text-white/30">
                    Create one and invite friends, or ask someone for an invite code.
                  </p>
                </div>
                <Link
                  href="/brackets/world-cup/create"
                  className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-5 py-2.5 text-sm font-black text-black"
                >
                  <Plus className="h-4 w-4" />
                  Create World Cup Pool
                </Link>
              </div>
            )
          ) : (
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-6 text-center sm:p-8">
              <div className="flex h-12 w-12 mx-auto mb-4 items-center justify-center rounded-xl bg-cyan-300/10">
                <Trophy className="h-6 w-6 text-cyan-200" />
              </div>
              <p className="font-black text-white">Sign in to get started</p>
              <p className="mt-1 text-sm text-white/55">
                Create or join a World Cup bracket pool and compete with friends.
              </p>
              <Link
                href="/login?next=/brackets/world-cup"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-5 py-2.5 text-sm font-black text-black"
              >
                Sign In to Get Started
              </Link>
            </div>
          )}
        </section>
      </section>
    </main>
  )
}
