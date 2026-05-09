import type { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"

export type PublishRealtimeEventInput = {
  leagueId?: string | null
  userId?: string | null
  eventType: string
  payload: Prisma.InputJsonValue
}

/**
 * Persist fan-out cursor — actual delivery via WebSockets / Supabase Realtime is Phase 2+.
 * Draft board updates, waiver results, and scoreboard refreshes will reuse this channel.
 */
export async function publishRealtimeEvent(
  input: PublishRealtimeEventInput
): Promise<{ id: string }> {
  const row = await prisma.realtimeEvent.create({
    data: {
      leagueId: input.leagueId ?? null,
      userId: input.userId ?? null,
      eventType: input.eventType,
      payload: input.payload,
    },
  })
  return { id: row.id }
}
