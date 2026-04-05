import { prisma } from '@/lib/prisma'

export async function requireDispersalDraftForLeague(draftId: string, leagueId: string) {
  const draft = await prisma.dispersalDraft.findFirst({
    where: { id: draftId, leagueId },
    select: { id: true },
  })
  if (!draft) {
    const err = new Error('Draft not found') as Error & { status?: number }
    err.status = 404
    throw err
  }
  return draft
}
