import { prisma } from '@/lib/prisma'

export async function queueAnimation(
  leagueId: string,
  week: number,
  animationType: string,
  primaryUserId: string,
  metadata: object,
  displayLocation?: string,
  secondaryUserId?: string | null,
  durationMs?: number,
  reducedMotion?: boolean,
) {
  return prisma.zombieEventAnimation.create({
    data: {
      leagueId,
      week,
      animationType,
      primaryUserId,
      secondaryUserId: secondaryUserId ?? null,
      displayLocation: displayLocation ?? 'league_chat_and_home',
      durationMs: durationMs ?? 3000,
      metadata: metadata as object,
      reducedMotion: reducedMotion ?? false,
    },
  })
}
