/**
 * Tracks HeyGen video jobs and updates FantasyMediaEpisode (Prompt 115).
 * Polls until completed/failed and persists playbackUrl or failure.
 */

import { prisma } from '@/lib/prisma';
import { pollHeyGenUntilComplete } from './HeyGenVideoService';

export async function trackVideoJob(episodeId: string): Promise<{ playbackUrl: string | null; status: string }> {
  const episode = await prisma.fantasyMediaEpisode.findUnique({ where: { id: episodeId } });
  if (!episode?.providerJobId || episode.provider !== 'heygen') {
    return { playbackUrl: null, status: episode?.status ?? 'failed' };
  }

  const result = await pollHeyGenUntilComplete(episode.providerJobId, (status) => {
    if (status.status === 'processing' || status.status === 'pending') {
      void prisma.fantasyMediaEpisode
        .update({
          where: { id: episodeId },
          data: { status: 'generating', updatedAt: new Date() },
        })
        .catch(() => {});
    }
  });

  const updateStatus = result.status === 'completed' ? 'completed' : 'failed';
  const playbackUrl = result.status === 'completed' ? result.videoUrl : null;

  await prisma.fantasyMediaEpisode.update({
    where: { id: episodeId },
    data: {
      status: updateStatus,
      playbackUrl,
      meta: result.error
        ? { lastError: result.error.message ?? result.error.detail }
        : result.duration != null
          ? { duration: result.duration }
          : undefined,
      updatedAt: new Date(),
    },
  });

  return { playbackUrl, status: updateStatus };
}
