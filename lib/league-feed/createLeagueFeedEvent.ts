import "server-only"

import { prisma } from "@/lib/prisma"
import { leagueRealtimeStore } from "@/lib/league-events/realtime-store"
import { getLeagueFeedSettings } from "./leagueFeedSettings"
import type { CreateLeagueFeedEventInput } from "./leagueFeedTypes"
import type { LeagueFeedPayload } from "./leagueFeedTypes"

/**
 * Persist a league feed row (`LeagueEvent`) and nudge realtime subscribers.
 * No-op if league feed is disabled (unless forceSystem).
 */
export async function createLeagueFeedEvent(
  input: CreateLeagueFeedEventInput,
  opts?: { forceSystem?: boolean }
): Promise<{ id: string } | null> {
  const league = await prisma.league.findUnique({
    where: { id: input.leagueId },
    select: { id: true, settings: true },
  })
  if (!league) return null

  const feed = getLeagueFeedSettings(league.settings)
  if (!feed.enabled && !opts?.forceSystem && input.actorType !== "system") return null

  let flavor = input.flavorLine ?? null
  if (input.actorType === "ai") {
    if (!feed.aiFlavorEnabled) {
      flavor = null
    } else {
      const cat = input.category ?? "other"
      if (cat === "draft" && feed.reactions?.draft === false) flavor = null
      if (cat === "waivers" && feed.reactions?.waiver === false) flavor = null
      if (cat === "trades" && feed.reactions?.trade === false) flavor = null
      if (cat === "matchups" && feed.reactions?.matchup === false) flavor = null
    }
  }

  const payload: LeagueFeedPayload = {
    actorType: input.actorType,
    actorId: input.actorId ?? null,
    actorName: input.actorName ?? null,
    actorAvatar: input.actorAvatar ?? null,
    teamId: input.teamId ?? null,
    teamName: input.teamName ?? null,
    flavorLine: flavor,
    category: input.category ?? "other",
    importance: input.importance ?? "normal",
    botArchetypeId: input.botArchetypeId ?? null,
    botArchetypeLabel: input.botArchetypeLabel ?? null,
    details: input.details ?? {},
  }

  const title = input.message.slice(0, 256)
  const description = flavor ? `${input.message}\n\n${flavor}`.slice(0, 4000) : input.message.slice(0, 4000)

  const vis = input.visibility === "commissioners_only" ? "commissioners_only" : "league"

  const row = await prisma.leagueEvent.create({
    data: {
      leagueId: input.leagueId,
      eventType: input.eventType.slice(0, 64),
      title,
      description,
      payload: payload as import("@prisma/client").Prisma.InputJsonValue,
      visibility: vis,
    },
  })

  leagueRealtimeStore.publish(input.leagueId, {
    eventType: input.eventType,
    message: title,
    meta: { leagueFeed: true, ...payload },
  })

  return { id: row.id }
}
