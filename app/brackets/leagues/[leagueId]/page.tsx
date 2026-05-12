import Link from "next/link"
import { redirect } from "next/navigation"
import type { Metadata } from "next"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getPlayoffBracketView } from "@/lib/playoffs/playoffService"
import PlayoffBracketShell from "@/components/brackets/playoffs/PlayoffBracketShell"

export const dynamic = "force-dynamic"

type SessionUser = { id?: string | null; email?: string | null; name?: string | null }

export async function generateMetadata({ params }: { params: { leagueId: string } }): Promise<Metadata> {
  const session = (await getServerSession(authOptions as any)) as { user?: SessionUser } | null
  const playoffView = await getPlayoffBracketView({
    challengeId: params.leagueId,
    user: session?.user ?? null,
  })

  if (playoffView) {
    return { title: playoffView.challenge.name }
  }

  return { title: "Bracket Pool" }
}

export default async function BracketLeagueDetailPage({
  params,
  searchParams,
}: {
  params: { leagueId: string }
  searchParams?: { entryId?: string }
}) {
  const session = (await getServerSession(authOptions as any)) as { user?: SessionUser } | null

  const playoffView = await getPlayoffBracketView({
    challengeId: params.leagueId,
    user: session?.user ?? null,
    requestedEntryId: searchParams?.entryId ?? null,
  })

  if (playoffView) {
    if (process.env.NODE_ENV !== "production") {
      console.info("[brackets] loaded dashboard id", {
        route: "/brackets/leagues/[leagueId]",
        leagueId: params.leagueId,
        challengeId: playoffView.challenge.id,
      })
    }
    return <PlayoffBracketShell initialView={playoffView} />
  }

  const existingLeague = await (prisma as any).bracketLeague.findUnique({
    where: { id: params.leagueId },
    select: { id: true },
  })

  if (existingLeague?.id) {
    if (process.env.NODE_ENV !== "production") {
      console.info("[brackets] loaded dashboard id", {
        route: "/brackets/leagues/[leagueId]",
        leagueId: params.leagueId,
        fallback: "/league/[leagueId]",
      })
    }
    redirect(`/league/${params.leagueId}`)
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="rounded-xl border border-slate-300 bg-white p-6 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Pool not found</h1>
        <p className="mt-2 text-sm text-slate-600">
          We could not find a pool with that id. It may have been removed or the link is invalid.
        </p>
        <div className="mt-4 flex items-center justify-center gap-3">
          <Link href="/brackets" className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700">
            Back to Brackets
          </Link>
          <Link href="/brackets/leagues/new" className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white">
            Create Pool
          </Link>
        </div>
      </div>
    </main>
  )
}
