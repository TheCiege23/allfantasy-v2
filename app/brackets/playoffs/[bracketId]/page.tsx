import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getPlayoffBracketView } from "@/lib/playoffs/playoffService"
import PlayoffBracketShell from "@/components/brackets/playoffs/PlayoffBracketShell"

export const dynamic = "force-dynamic"

type SessionUser = { id?: string | null; email?: string | null; name?: string | null }

export async function generateMetadata({ params }: { params: { bracketId: string } }): Promise<Metadata> {
  const session = (await getServerSession(authOptions as any)) as { user?: SessionUser } | null
  const view = await getPlayoffBracketView({
    challengeId: params.bracketId,
    user: session?.user ?? null,
  })

  if (!view) {
    return { title: "Playoff Bracket" }
  }

  const title = view.challenge.sport === "nba" ? "NBA Playoff Bracket" : "NHL Playoff Bracket"
  return { title }
}

export default async function PlayoffBracketPage({
  params,
  searchParams,
}: {
  params: { bracketId: string }
  searchParams?: { entryId?: string }
}) {
  const session = (await getServerSession(authOptions as any)) as { user?: SessionUser } | null

  const view = await getPlayoffBracketView({
    challengeId: params.bracketId,
    user: session?.user ?? null,
    requestedEntryId: searchParams?.entryId ?? null,
  })

  if (!view) {
    notFound()
  }

  if (process.env.NODE_ENV !== "production") {
    console.info("[brackets] loaded dashboard id", {
      route: "/brackets/playoffs/[bracketId]",
      challengeId: view.challenge.id,
    })
  }

  return <PlayoffBracketShell initialView={view} />
}
