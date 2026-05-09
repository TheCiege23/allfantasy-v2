import type { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"

export type WriteAutomationAuditLogInput = {
  leagueId?: string | null
  userId?: string | null
  jobId?: string | null
  action: string
  entityType?: string | null
  entityId?: string | null
  message: string
  metadata?: Prisma.InputJsonValue
}

/** Cross-cutting automation audit (waivers, draft, scoring hooks should log meaningful `action` values). */
export async function writeAutomationAuditLog(input: WriteAutomationAuditLogInput): Promise<void> {
  await prisma.automationAuditLog.create({
    data: {
      leagueId: input.leagueId ?? null,
      userId: input.userId ?? null,
      jobId: input.jobId ?? null,
      action: input.action,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      message: input.message,
      metadata: input.metadata ?? undefined,
    },
  })
}

export type WriteAutomationRunStartedInput = {
  jobId?: string | null
  leagueId?: string | null
  jobType: string
  metadata?: Prisma.InputJsonValue
}

export async function writeAutomationRunStarted(
  input: WriteAutomationRunStartedInput
): Promise<{ runId: string }> {
  const run = await prisma.automationRun.create({
    data: {
      jobId: input.jobId ?? null,
      leagueId: input.leagueId ?? null,
      jobType: input.jobType,
      status: "running",
      metadata: input.metadata ?? undefined,
    },
  })
  return { runId: run.id }
}

export async function writeAutomationRunCompleted(input: {
  runId: string
  durationMs: number
  metadata?: Prisma.InputJsonValue
}): Promise<void> {
  await prisma.automationRun.update({
    where: { id: input.runId },
    data: {
      status: "completed",
      finishedAt: new Date(),
      durationMs: input.durationMs,
      metadata: input.metadata ?? undefined,
    },
  })
}

export async function writeAutomationRunFailed(input: {
  runId: string
  durationMs: number
  status?: "failed" | "skipped"
  errorMessage: string
  errorStack?: string | null
  metadata?: Prisma.InputJsonValue
}): Promise<void> {
  await prisma.automationRun.update({
    where: { id: input.runId },
    data: {
      status: input.status ?? "failed",
      finishedAt: new Date(),
      durationMs: input.durationMs,
      errorMessage: input.errorMessage,
      errorStack: input.errorStack ?? null,
      metadata: input.metadata ?? undefined,
    },
  })
}
