/**
 * Publish shareable moment to platforms; logs to SharePublishLog (Prompt 121).
 * Stub: logs attempt; real posting requires provider credentials (reuse social-clips-grok pattern).
 */

import { prisma } from '@/lib/prisma';

const PROVIDER_CONFIGURED = false;

export type SharePublishStatus = 'pending' | 'success' | 'failed' | 'provider_unavailable';

export interface SharePublishResult {
  platform: string;
  status: SharePublishStatus;
  logId: string;
  message?: string;
}

export async function publishShareToPlatform(
  shareId: string,
  platform: string,
  userId: string
): Promise<SharePublishResult> {
  const normalizedPlatform = platform.toLowerCase();

  const share = await prisma.shareableMoment.findFirst({
    where: { id: shareId, userId },
  });
  if (!share) {
    return { platform: normalizedPlatform, status: 'failed', logId: '', message: 'Share not found' };
  }

  if (!PROVIDER_CONFIGURED) {
    const log = await prisma.sharePublishLog.create({
      data: {
        shareId,
        platform: normalizedPlatform,
        status: 'provider_unavailable',
        responseMetadata: { reason: 'provider_not_configured' },
      },
    });
    return {
      platform: normalizedPlatform,
      status: 'provider_unavailable',
      logId: log.id,
      message: 'Posting not configured for this platform yet',
    };
  }

  const log = await prisma.sharePublishLog.create({
    data: {
      shareId,
      platform: normalizedPlatform,
      status: 'pending',
      responseMetadata: { note: 'stub' },
    },
  });
  return {
    platform: normalizedPlatform,
    status: 'pending',
    logId: log.id,
    message: 'Publish requested',
  };
}

export async function getSharePublishLogs(shareId: string, userId: string) {
  const share = await prisma.shareableMoment.findFirst({
    where: { id: shareId, userId },
    include: { publishLogs: { orderBy: { createdAt: 'desc' }, take: 20 } },
  });
  return share?.publishLogs ?? [];
}
