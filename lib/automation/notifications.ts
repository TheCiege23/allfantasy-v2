import type { Prisma } from "@prisma/client"

import type { NotificationChannel } from "@/lib/automation/types"
import { prisma } from "@/lib/prisma"

export type EnqueueNotificationInput = {
  leagueId?: string | null
  userId?: string | null
  channel: NotificationChannel | string
  eventType: string
  title: string
  body: string
  sendAfter?: Date | null
  metadata?: Prisma.InputJsonValue
}

/**
 * Phase 1 — persist-only outbox. Twilio / Resend dispatch reads from this table in a later worker.
 * Future waiver FAAB alerts, draft “on the clock”, scoring corrections, and trade outcomes enqueue here.
 */
export async function enqueueNotification(input: EnqueueNotificationInput): Promise<{ id: string }> {
  const row = await prisma.notificationOutbox.create({
    data: {
      leagueId: input.leagueId ?? null,
      userId: input.userId ?? null,
      channel: input.channel,
      eventType: input.eventType,
      title: input.title,
      body: input.body,
      status: "pending",
      sendAfter: input.sendAfter ?? null,
      metadata: input.metadata ?? undefined,
    },
  })
  return { id: row.id }
}

export async function enqueueLeagueChatNotification(input: {
  leagueId: string
  eventType: string
  title: string
  body: string
  metadata?: Prisma.InputJsonValue
}): Promise<{ id: string }> {
  return enqueueNotification({
    leagueId: input.leagueId,
    channel: "league_chat",
    eventType: input.eventType,
    title: input.title,
    body: input.body,
    metadata: input.metadata,
  })
}

export async function enqueueUserNotification(input: {
  userId: string
  channel: NotificationChannel | string
  eventType: string
  title: string
  body: string
  sendAfter?: Date | null
  metadata?: Prisma.InputJsonValue
}): Promise<{ id: string }> {
  return enqueueNotification({
    userId: input.userId,
    channel: input.channel,
    eventType: input.eventType,
    title: input.title,
    body: input.body,
    sendAfter: input.sendAfter ?? null,
    metadata: input.metadata,
  })
}
