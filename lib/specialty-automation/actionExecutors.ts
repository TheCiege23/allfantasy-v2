import { prisma } from '@/lib/prisma'
import type { PlannedAction, PlannedEvent } from '@/lib/specialty-automation/types'

export async function persistLeagueEvents(
  leagueId: string,
  events: PlannedEvent[],
  runId?: string,
): Promise<string[]> {
  const ids: string[] = []
  for (const e of events) {
    const row = await prisma.leagueEvent.create({
      data: {
        leagueId,
        eventType: e.eventType,
        title: e.title.slice(0, 256),
        description: e.description,
        payload: {
          ...(e.payload ?? {}),
          ...(runId ? { specialtyAutomationRunId: runId } : {}),
        } as object,
        visibility: e.visibility ?? 'league',
      },
    })
    ids.push(row.id)
  }
  return ids
}

export async function persistAutomationActions(
  runId: string,
  leagueId: string,
  actions: PlannedAction[],
): Promise<void> {
  if (actions.length === 0) return
  await prisma.specialtyAutomationAction.createMany({
    data: actions.map((a) => ({
      runId,
      leagueId,
      actionType: a.actionType,
      targetType: a.targetType ?? null,
      targetId: a.targetId ?? null,
      status: 'completed',
      executedAt: new Date(),
      metadata: (a.metadata ?? {}) as object,
    })),
  })
}

export async function upsertPhaseState(
  leagueId: string,
  input: {
    currentPhase?: string | null
    currentStage?: string | null
    currentWeekContext?: number | null
    pendingActionCount?: number
    metadata?: Record<string, unknown>
  },
): Promise<void> {
  await prisma.specialtyPhaseState.upsert({
    where: { leagueId },
    create: {
      leagueId,
      currentPhase: input.currentPhase ?? null,
      currentStage: input.currentStage ?? null,
      currentWeekContext: input.currentWeekContext ?? null,
      pendingActionCount: input.pendingActionCount ?? 0,
      metadata: (input.metadata ?? {}) as object,
    },
    update: {
      currentPhase: input.currentPhase ?? undefined,
      currentStage: input.currentStage ?? undefined,
      currentWeekContext: input.currentWeekContext ?? undefined,
      pendingActionCount: input.pendingActionCount ?? undefined,
      metadata: input.metadata !== undefined ? (input.metadata as object) : undefined,
    },
  })
}
