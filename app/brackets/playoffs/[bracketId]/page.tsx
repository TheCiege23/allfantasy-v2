import { notFound } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getPlayoffBracketView } from "@/lib/playoffs/playoffService"
import PlayoffBracketShell from "@/components/brackets/playoffs/PlayoffBracketShell"

export const dynamic = "force-dynamic"

type SessionUser = { id?: string | null; email?: string | null; name?: string | null }

export default async function PlayoffBracketPage({ params }: { params: { bracketId: string } }) {
  const session = (await getServerSession(authOptions as any)) as { user?: SessionUser } | null

  const view = await getPlayoffBracketView({
    challengeId: params.bracketId,
    user: session?.user ?? null,
  })

  if (!view) {
    notFound()
  }

  return <PlayoffBracketShell initialView={view} />
}
