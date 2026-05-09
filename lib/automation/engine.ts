import { Prisma } from "@prisma/client"

import {
  writeAutomationAuditLog,
  writeAutomationRunCompleted,
  writeAutomationRunFailed,
  writeAutomationRunStarted,
} from "@/lib/automation/audit"
import {
  FatalAutomationError,
  isRetryableAutomationError,
  toErrorMessage,
  toErrorStack,
} from "@/lib/automation/errors"
import type { AutomationContext, AutomationResult, RetryPolicy } from "@/lib/automation/types"
import { prisma } from "@/lib/prisma"

export type AutomationHandler = (
  ctx: AutomationContext & { jobId: string }
) => Promise<AutomationResult>

export type RunAutomationJobOptions = {
  /** Override job row default (usually left unset). */
  maxAttempts?: number
  /** Inject prisma for tests. */
  prisma?: typeof prisma
  /** Optional retry policy metadata stored on the job in later phases (Inngest). */
  retryPolicy?: RetryPolicy
}

function mergeJobMetadata(
  existing: Prisma.JsonValue | null | undefined,
  patch: Record<string, unknown> | undefined
): Prisma.InputJsonValue | undefined {
  if (!patch || Object.keys(patch).length === 0) return undefined
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? (existing as Record<string, unknown>)
      : {}
  return { ...base, ...patch } as Prisma.InputJsonValue
}

async function loadOrCreateJob(
  db: typeof prisma,
  context: AutomationContext,
  maxAttempts: number
) {
  const found = await db.automationJob.findUnique({
    where: { idempotencyKey: context.idempotencyKey },
  })
  if (found) return found
  try {
    return await db.automationJob.create({
      data: {
        leagueId: context.leagueId ?? null,
        userId: context.userId ?? null,
        jobType: context.jobType,
        status: "pending",
        idempotencyKey: context.idempotencyKey,
        metadata: (context.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        maxAttempts,
      },
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return db.automationJob.findUniqueOrThrow({
        where: { idempotencyKey: context.idempotencyKey },
      })
    }
    throw e
  }
}

/**
 * Core orchestration entry — safe on Vercel serverless (single invocation; no long-lived workers).
 *
 * Future:
 * - `waivers.processLeague`: handler wraps league waiver batch + FAAB settlement.
 * - `draft.tick` / `draft.autoPick`: advance draft clock / autopick queue.
 * - `scoring.sync`: pull stats + recompute weekly scores.
 * - `trades.process`: finalize trades after review window.
 * - `leagueConcept.*`: guillotine cuts, survivor phases, Big Brother automation.
 */
export async function runAutomationJob(
  context: AutomationContext,
  handler: AutomationHandler,
  options?: RunAutomationJobOptions
): Promise<AutomationResult & { jobId: string; runId: string }> {
  const db = options?.prisma ?? prisma

  const job = await loadOrCreateJob(db, context, options?.maxAttempts ?? 3)
  const maxAttempts = options?.maxAttempts ?? job.maxAttempts

  if (job.status === "failed" && job.attemptCount >= maxAttempts) {
    await writeAutomationAuditLog({
      leagueId: context.leagueId,
      userId: context.userId,
      jobId: job.id,
      action: "automation.job.blocked",
      message: "Not re-run — max attempts already exhausted for this idempotency key",
      metadata: { attemptCount: job.attemptCount, maxAttempts },
    })
    return {
      status: "failed",
      message: "Max attempts exceeded",
      jobId: job.id,
      runId: "no-run",
    }
  }

  if (job.status === "completed") {
    await writeAutomationAuditLog({
      leagueId: context.leagueId,
      userId: context.userId,
      jobId: job.id,
      action: "automation.job.skip",
      message: "Skipped — idempotency key already completed",
      metadata: { idempotencyKey: context.idempotencyKey, jobType: context.jobType },
    })
    const { runId } = await writeAutomationRunStarted({
      jobId: job.id,
      leagueId: context.leagueId,
      jobType: context.jobType,
      metadata: { skipped: true, reason: "already_completed" },
    })
    await writeAutomationRunFailed({
      runId,
      durationMs: 0,
      status: "skipped",
      errorMessage: "already_completed",
      metadata: { reason: "idempotency_completed" },
    })
    return {
      status: "skipped",
      message: "Already completed for idempotency key",
      jobId: job.id,
      runId,
    }
  }

  const { runId } = await writeAutomationRunStarted({
    jobId: job.id,
    leagueId: context.leagueId,
    jobType: context.jobType,
    metadata: context.metadata as Prisma.InputJsonValue | undefined,
  })

  const runStartedAt = Date.now()

  await db.automationJob.update({
    where: { id: job.id },
    data: {
      status: "running",
      startedAt: job.startedAt ?? new Date(),
      attemptCount: { increment: 1 },
      maxAttempts,
    },
  })

  const updated = await db.automationJob.findUniqueOrThrow({ where: { id: job.id } })

  try {
    const result = await handler({ ...context, jobId: job.id })
    const durationMs = Date.now() - runStartedAt

    const metaPatch = mergeJobMetadata(job.metadata as Prisma.JsonValue | null, result.metadata)

    if (result.status === "skipped") {
      await writeAutomationRunFailed({
        runId,
        durationMs,
        status: "skipped",
        errorMessage: result.message ?? "skipped",
        metadata: result.metadata as Prisma.InputJsonValue | undefined,
      })
      await db.automationJob.update({
        where: { id: job.id },
        data: {
          status: "skipped",
          finishedAt: new Date(),
          lastError: null,
          ...(metaPatch ? { metadata: metaPatch } : {}),
        },
      })
      await writeAutomationAuditLog({
        leagueId: context.leagueId,
        userId: context.userId,
        jobId: job.id,
        action: "automation.job.skipped",
        message: result.message ?? "skipped",
        metadata: result.metadata as Prisma.InputJsonValue | undefined,
      })
      return { ...result, jobId: job.id, runId }
    }

    if (result.status === "failed") {
      await writeAutomationRunFailed({
        runId,
        durationMs,
        errorMessage: result.message ?? "failed",
        metadata: result.metadata as Prisma.InputJsonValue | undefined,
      })
      await db.automationJob.update({
        where: { id: job.id },
        data: {
          status: "failed",
          finishedAt: new Date(),
          lastError: result.message ?? "failed",
          ...(metaPatch ? { metadata: metaPatch } : {}),
        },
      })
      await writeAutomationAuditLog({
        leagueId: context.leagueId,
        userId: context.userId,
        jobId: job.id,
        action: "automation.job.failed",
        message: result.message ?? "failed",
        metadata: result.metadata as Prisma.InputJsonValue | undefined,
      })
      return { ...result, jobId: job.id, runId }
    }

    const terminalStatus =
      result.status === "cancelled" || result.status === "completed"
        ? result.status
        : "completed"

    await writeAutomationRunCompleted({
      runId,
      durationMs,
      metadata: result.metadata as Prisma.InputJsonValue | undefined,
    })
    await db.automationJob.update({
      where: { id: job.id },
      data: {
        status: terminalStatus,
        finishedAt: new Date(),
        lastError: null,
        ...(metaPatch ? { metadata: metaPatch } : {}),
      },
    })
    await writeAutomationAuditLog({
      leagueId: context.leagueId,
      userId: context.userId,
      jobId: job.id,
      action: "automation.job.completed",
      message: result.message ?? terminalStatus,
      metadata: result.metadata as Prisma.InputJsonValue | undefined,
    })
    return { ...result, status: terminalStatus, jobId: job.id, runId }
  } catch (error) {
    const durationMs = Date.now() - runStartedAt
    const msg = toErrorMessage(error)
    const stack = toErrorStack(error)

    const retryable = isRetryableAutomationError(error)
    const fatal = error instanceof FatalAutomationError
    const attempts = updated.attemptCount

    await writeAutomationRunFailed({
      runId,
      durationMs,
      errorMessage: msg,
      errorStack: stack,
    })

    if (retryable && attempts < maxAttempts) {
      await db.automationJob.update({
        where: { id: job.id },
        data: {
          status: "pending",
          lastError: msg,
          finishedAt: null,
        },
      })
      await writeAutomationAuditLog({
        leagueId: context.leagueId,
        userId: context.userId,
        jobId: job.id,
        action: "automation.job.retry_scheduled",
        message: msg,
        metadata: { attempt: attempts, maxAttempts, retryable: true },
      })
    } else {
      await db.automationJob.update({
        where: { id: job.id },
        data: {
          status: "failed",
          lastError: msg,
          finishedAt: new Date(),
        },
      })
      await writeAutomationAuditLog({
        leagueId: context.leagueId,
        userId: context.userId,
        jobId: job.id,
        action: "automation.job.failed",
        message: msg,
        metadata: {
          retryable,
          fatal,
          attempts,
          maxAttempts,
        },
      })
    }

    if (retryable && attempts < maxAttempts) {
      return {
        status: "pending",
        message: msg,
        jobId: job.id,
        runId,
      }
    }

    return {
      status: "failed",
      message: msg,
      jobId: job.id,
      runId,
    }
  }
}
