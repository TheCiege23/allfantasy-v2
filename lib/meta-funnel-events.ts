import { buildMetaEventPayload, type MetaEventPayload } from "@/lib/meta-events"

export function buildFantasyLeagueLeadMetaEvent(input: {
  leagueId: string
  leagueName: string
  sport?: string | null
  leagueType?: string | null
  draftType?: string | null
}): MetaEventPayload {
  return buildMetaEventPayload(
    "Lead",
    {
      content_name: input.leagueName,
      content_category: "Fantasy League",
      content_ids: [input.leagueId],
      value: 0,
      currency: "USD",
      league_id: input.leagueId,
      sport: input.sport ?? null,
      league_type: input.leagueType ?? null,
      draft_type: input.draftType ?? null,
    },
    {
      sourceId: `fantasy_league:${input.leagueId}`,
      deterministic: true,
      contentName: input.leagueName,
      contentCategory: "Fantasy League",
    }
  )
}
