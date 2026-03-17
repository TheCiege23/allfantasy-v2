/**
 * Tracks publish status and lists logs for an asset (Prompt 116).
 */

import { prisma } from '@/lib/prisma';

export interface PublishLogEntry {
  id: string;
  platform: string;
  status: string;
  responseMetadata: Record<string, unknown> | null;
  createdAt: Date;
}

export async function getPublishLogsForAsset(
  assetId: string,
  userId: string
): Promise<PublishLogEntry[]> {
  const asset = await prisma.socialContentAsset.findFirst({
    where: { id: assetId, userId },
    include: { publishLogs: { orderBy: { createdAt: 'desc' }, take: 50 } },
  });
  if (!asset) return [];
  return asset.publishLogs.map((log) => ({
    id: log.id,
    platform: log.platform,
    status: log.status,
    responseMetadata: log.responseMetadata as Record<string, unknown> | null,
    createdAt: log.createdAt,
  }));
}

export async function getFailedLogsForRetry(assetId: string, userId: string): Promise<string[]> {
  const logs = await getPublishLogsForAsset(assetId, userId);
  return logs
    .filter((l) => l.status === 'failed' || l.status === 'provider_unavailable')
    .map((l) => l.id);
}
