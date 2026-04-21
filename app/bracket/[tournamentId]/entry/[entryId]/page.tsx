import { permanentRedirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function LegacyBracketEntryRedirect({
  params,
}: {
  params: { tournamentId: string; entryId: string }
}) {
  permanentRedirect(
    `/tournament/bracket/${encodeURIComponent(params.tournamentId)}/entry/${encodeURIComponent(params.entryId)}`,
  )
}
