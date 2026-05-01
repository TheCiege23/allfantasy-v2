import { notFound } from "next/navigation"
import { getWorldCupChallengeByInvite } from "@/lib/world-cup"
import WorldCupJoinInvite from "@/components/brackets/world-cup/WorldCupJoinInvite"

export const dynamic = "force-dynamic"

export default async function JoinWorldCupBracketPage({
  params,
}: {
  params: { inviteCode: string }
}) {
  const invite = await getWorldCupChallengeByInvite(params.inviteCode)
  if (!invite) notFound()

  return <WorldCupJoinInvite invite={invite} />
}
