import Link from "next/link"
import { getServerSession } from "next-auth"
import { Globe2, Plus, Trophy, Users } from "lucide-react"
import { authOptions } from "@/lib/auth"
import { listUserWorldCupChallenges } from "@/lib/world-cup"

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

export default async function WorldCupBracketsPage() {
  const session = (await getServerSession(authOptions as any)) as { user?: SessionUser } | null
  const userId = session?.user?.id ?? null
  const challenges: WorldCupChallengeSummary[] = userId
    ? await listUserWorldCupChallenges(userId)
    : []

  return (
    <main className="min-h-screen bg-[#05070b] text-white">
      <section className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/brackets"
            className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-white/60 hover:text-white"
          >
            Back to Brackets
          </Link>
          <Link
            href="/brackets/world-cup/create"
            className="inline-flex items-center gap-2 rounded-lg bg-cyan-300 px-4 py-2 text-sm font-black text-black"
          >
            <Plus className="h-4 w-4" />
            Create Challenge
          </Link>
        </div>

        <header className="rounded-lg border border-white/10 bg-white/[0.04] p-5 sm:p-7">
          <div className="mb-4 inline-flex rounded-lg bg-cyan-300 p-3 text-black">
            <Globe2 className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
            FIFA World Cup Bracket Challenge
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/55">
            Create an AllFantasy World Cup pool with Round of 32 placeholders, matchup-by-matchup
            picks, invite links, live score sync, automatic advancement, and a ranked leaderboard.
          </p>
        </header>

        <section className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
            <Trophy className="mb-3 h-5 w-5 text-cyan-200" />
            <div className="text-sm font-black">Sleeper-Style Picks</div>
            <div className="mt-1 text-xs text-white/45">Pick winners through the champion.</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
            <Globe2 className="mb-3 h-5 w-5 text-cyan-200" />
            <div className="text-sm font-black">Qualifier Placeholders</div>
            <div className="mt-1 text-xs text-white/45">Slots resolve as teams qualify.</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
            <Users className="mb-3 h-5 w-5 text-cyan-200" />
            <div className="text-sm font-black">Invite Leaderboard</div>
            <div className="mt-1 text-xs text-white/45">Share a link and compete live.</div>
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-[0.16em] text-white/45">
              Your World Cup Challenges
            </h2>
            <span className="text-xs text-white/35">{challenges.length} joined</span>
          </div>
          {userId ? (
            challenges.length > 0 ? (
              <div className="grid gap-3">
                {challenges.map((challenge) => (
                  <Link
                    key={challenge.id}
                    href={`/brackets/world-cup/${challenge.id}`}
                    className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.04] p-4 hover:bg-white/[0.07]"
                  >
                    <div>
                      <div className="font-black text-white">{challenge.name}</div>
                      <div className="mt-1 text-xs text-white/45">
                        {challenge.seasonYear} - {challenge.participantCount} participants - {challenge.status}
                      </div>
                    </div>
                    <div className="text-right text-xs text-white/45">
                      <div className="font-black text-cyan-200">{challenge.totalScore} pts</div>
                      <div>{challenge.rank ? `Rank ${challenge.rank}` : "Unranked"}</div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-white/15 bg-white/[0.03] p-6 text-sm text-white/55">
                You have not joined a World Cup bracket challenge yet.
              </div>
            )
          ) : (
            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
              <p className="text-sm text-white/60">Sign in to create or join a World Cup bracket challenge.</p>
              <Link
                href="/login?next=/brackets/world-cup"
                className="mt-4 inline-flex rounded-lg bg-cyan-300 px-4 py-2 text-sm font-black text-black"
              >
                Sign In
              </Link>
            </div>
          )}
        </section>
      </section>
    </main>
  )
}
