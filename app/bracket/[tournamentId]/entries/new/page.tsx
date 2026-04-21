import { permanentRedirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function LegacyBracketEntriesNewRedirect({
  params,
}: {
  params: { tournamentId: string }
}) {
  permanentRedirect(`/tournament/bracket/${encodeURIComponent(params.tournamentId)}/entries/new`)
}
