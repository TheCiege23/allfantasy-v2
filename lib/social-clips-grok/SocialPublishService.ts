/**
 * Publishes social content to platforms (Prompt 116).
 * Stub implementation: logs attempt; real posting requires provider credentials.
 * Graceful provider-not-configured and failed-post handling.
 */

import { prisma } from '@/lib/prisma';
import { getConnectedTargets } from './ConnectedSocialAccountResolver';
import type { SocialPlatform } from './types';
import { SUPPORTED_PLATFORMS } from './types';

const PROVIDER_CONFIGURED = false; // Set when X/IG/TikTok/FB APIs are wired with secrets

export type PublishStatus = 'pending' | 'success' | 'failed' | 'provider_unavailable';

export interface PublishResult {
  platform: string;
  status: PublishStatus;
  logId: string;
  message?: string;
}

export async function publishAssetToPlatform(
  assetId: string,
  platform: string,
  userId: string
): Promise<PublishResult> {
  const normalizedPlatform = platform.toLowerCase();
  if (!SUPPORTED_PLATFORMS.includes(normalizedPlatform as SocialPlatform)) {
    const log = await prisma.socialPublishLog.create({
      data: {
        assetId,
        platform: normalizedPlatform,
        status: 'failed',
        responseMetadata: { reason: 'unsupported_platform' },
      },
    });
    return { platform: normalizedPlatform, status: 'failed', logId: log.id, message: 'Unsupported platform' };
  }

  const asset = await prisma.socialContentAsset.findFirst({
    where: { id: assetId, userId },
  });
  if (!asset) {
    return { platform: normalizedPlatform, status: 'failed', logId: '', message: 'Asset not found' };
  }

  const targets = await getConnectedTargets(userId);
  const target = targets.find((t) => t.platform === normalizedPlatform);
  if (!target?.connected) {
    const log = await prisma.socialPublishLog.create({
      data: {
        assetId,
        platform: normalizedPlatform,
        status: 'failed',
        responseMetadata: { reason: 'account_not_connected' },
      },
    });
    return {
      platform: normalizedPlatform,
      status: 'failed',
      logId: log.id,
      message: 'Connect your account first',
    };
  }

  if (!PROVIDER_CONFIGURED) {
    const log = await prisma.socialPublishLog.create({
      data: {
        assetId,
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

  // Placeholder for real API call (X, IG, TikTok, FB) with stored credentials
  const log = await prisma.socialPublishLog.create({
    data: {
      assetId,
      platform: normalizedPlatform,
      status: 'pending',
      responseMetadata: { note: 'stub' },
    },
  });

  return {
    platform: normalizedPlatform,
    status: 'pending',
    logId: log.id,
    message: 'Publish requested; check status shortly',
  };
}

export async function retryPublish(logId: string, userId: string): Promise<PublishResult | null> {
  const log = await prisma.socialPublishLog.findFirst({
    where: { id: logId },
    include: { asset: true },
  });
  if (!log || log.asset.userId !== userId) return null;
  return publishAssetToPlatform(log.assetId, log.platform, userId);
}
