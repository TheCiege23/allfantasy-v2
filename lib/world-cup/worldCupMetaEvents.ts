import { buildMetaEventPayload, type MetaEventPayload } from "@/lib/meta-events"

export function buildWorldCupPoolLeadMetaEvent(input: {
  challengeId: string
  poolName: string
  seasonYear?: number | null
  visibility?: string | null
}): MetaEventPayload {
  return buildMetaEventPayload(
    "Lead",
    {
      content_name: input.poolName,
      content_category: "World Cup Pool",
      content_ids: [input.challengeId],
      value: 0,
      currency: "USD",
      world_cup_challenge_id: input.challengeId,
      season_year: input.seasonYear ?? 2026,
      visibility: input.visibility ?? null,
    },
    {
      sourceId: `world_cup_pool:${input.challengeId}`,
      deterministic: true,
      contentName: input.poolName,
      contentCategory: "World Cup Pool",
    }
  )
}

export function buildWorldCupBracketLeadMetaEvent(input: {
  challengeId: string
  entryId: string
  entryName: string
  poolName?: string | null
}): MetaEventPayload {
  return buildMetaEventPayload(
    "Lead",
    {
      content_name: input.entryName,
      content_category: "World Cup Bracket",
      content_ids: [input.entryId],
      value: 0,
      currency: "USD",
      world_cup_challenge_id: input.challengeId,
      world_cup_entry_id: input.entryId,
      pool_name: input.poolName ?? null,
    },
    {
      sourceId: `world_cup_bracket:${input.entryId}`,
      deterministic: true,
      contentName: input.entryName,
      contentCategory: "World Cup Bracket",
    }
  )
}

export function buildWorldCupPoolViewContentMetaEvent(input: {
  challengeId: string
  poolName: string
}): MetaEventPayload {
  return buildMetaEventPayload(
    "ViewContent",
    {
      content_name: input.poolName,
      content_category: "World Cup Pool",
      content_ids: [input.challengeId],
      value: 0,
      currency: "USD",
      world_cup_challenge_id: input.challengeId,
    },
    {
      sourceId: `world_cup_pool_view:${input.challengeId}`,
      contentName: input.poolName,
      contentCategory: "World Cup Pool",
    }
  )
}

export function buildWorldCupBracketViewContentMetaEvent(input: {
  challengeId: string
  entryId: string
  entryName: string
  poolName?: string | null
}): MetaEventPayload {
  return buildMetaEventPayload(
    "ViewContent",
    {
      content_name: input.entryName,
      content_category: "World Cup Bracket",
      content_ids: [input.entryId],
      value: 0,
      currency: "USD",
      world_cup_challenge_id: input.challengeId,
      world_cup_entry_id: input.entryId,
      pool_name: input.poolName ?? null,
    },
    {
      sourceId: `world_cup_bracket_view:${input.entryId}`,
      contentName: input.entryName,
      contentCategory: "World Cup Bracket",
    }
  )
}
