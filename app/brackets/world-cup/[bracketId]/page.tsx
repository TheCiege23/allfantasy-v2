import { notFound } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getWorldCupChallengeView } from "@/lib/world-cup"
import { hasWorldCupAdminPageSession } from "@/lib/world-cup/adminPage"
import WorldCupBracketShell from "@/components/brackets/world-cup/WorldCupBracketShell"

export const dynamic = "force-dynamic"

type SessionUser = { id?: string | null; email?: string | null; name?: string | null }

export default async function WorldCupBracketChallengePage({
  params,
  searchParams,
}: {
  params: { bracketId: string }
  searchParams?: { tab?: string; guided?: string; entry?: string }
}) {
  const session = (await getServerSession(authOptions as any)) as { user?: SessionUser } | null
  const isAdmin = hasWorldCupAdminPageSession()
  const view = await getWorldCupChallengeView({
    challengeId: params.bracketId,
    user: session?.user ?? null,
    isAdmin,
  })

  if (!view) notFound()

  const tab = searchParams?.tab
  const defaultTab =
    tab === "leaderboard" ||
    tab === "rules" ||
    tab === "invite" ||
    tab === "picks" ||
    tab === "settings" ||
    tab === "commissioner"
      ? tab
      : "picks"

  const initialGuidedOpen = searchParams?.guided === "1"
  const initialEntryId = searchParams?.entry?.trim() || null

  return (
    <WorldCupBracketShell
      initialView={view}
      defaultTab={defaultTab}
      initialGuidedOpen={initialGuidedOpen}
      initialEntryId={initialEntryId}
    />
  )
}
