import { prisma } from '@/lib/prisma'

export async function listImportReviewTasksForLeague(leagueId: string, userId: string) {
  return prisma.importReviewTask.findMany({
    where: { leagueId, userId },
    orderBy: { id: 'desc' },
    take: 50,
  })
}

export async function listImportWarningsForLeague(leagueId: string, take = 80) {
  return prisma.importWarning.findMany({
    where: { leagueId },
    orderBy: { id: 'desc' },
    take,
    include: { run: { select: { id: true, provider: true, sourceLeagueId: true, status: true, startedAt: true } } },
  })
}

export async function resolveImportReviewTask(input: {
  taskId: string
  userId: string
  leagueId: string
  note?: string | null
}) {
  const task = await prisma.importReviewTask.findFirst({
    where: {
      id: input.taskId,
      leagueId: input.leagueId,
      userId: input.userId,
      status: 'open',
    },
  })
  if (!task) return { ok: false as const, error: 'Task not found' }

  const existingPayload = (task.payload && typeof task.payload === 'object' ? task.payload : {}) as Record<string, unknown>
  await prisma.importReviewTask.update({
    where: { id: task.id },
    data: {
      status: 'resolved',
      resolvedAt: new Date(),
      payload: {
        ...existingPayload,
        ...(input.note?.trim() ? { resolutionNote: input.note.trim() } : {}),
      } as object,
    },
  })
  return { ok: true as const }
}
