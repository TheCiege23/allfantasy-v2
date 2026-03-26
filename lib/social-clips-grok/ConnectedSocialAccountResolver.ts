/**
 * Resolves connected social publish targets for a user (Prompt 116).
 * No provider secrets exposed to frontend.
 */

import { prisma } from '@/lib/prisma';
import type { SocialPlatform } from './types';
import { SUPPORTED_PLATFORMS } from './types';
import { getSocialProviderForPlatform } from './publish-providers/registry';

export interface ResolvedTarget {
  platform: string;
  accountIdentifier: string | null;
  autoPostingEnabled: boolean;
  connected: boolean;
  providerConfigured: boolean;
}

export async function getConnectedTargets(userId: string): Promise<ResolvedTarget[]> {
  const targets = await prisma.socialPublishTarget.findMany({
    where: { userId },
  });

  const byPlatform = new Map<string, ResolvedTarget>();
  for (const p of SUPPORTED_PLATFORMS) {
    const provider = getSocialProviderForPlatform(p);
    byPlatform.set(p, {
      platform: p,
      accountIdentifier: null,
      autoPostingEnabled: false,
      connected: false,
      providerConfigured: provider ? provider.isConfigured(p) : false,
    });
  }

  for (const t of targets) {
    const platform = t.platform as SocialPlatform;
    const provider = getSocialProviderForPlatform(platform);
    byPlatform.set(t.platform, {
      platform: t.platform,
      accountIdentifier: t.accountIdentifier ?? null,
      autoPostingEnabled: t.autoPostingEnabled,
      connected: true,
      providerConfigured: provider ? provider.isConfigured(platform) : false,
    });
  }

  return Array.from(byPlatform.values());
}

export async function setAutoPosting(
  userId: string,
  platform: string,
  enabled: boolean
): Promise<void> {
  await prisma.socialPublishTarget.upsert({
    where: {
      userId_platform: { userId, platform: platform.toLowerCase() },
    },
    create: {
      userId,
      platform: platform.toLowerCase(),
      autoPostingEnabled: enabled,
    },
    update: { autoPostingEnabled: enabled },
  });
}

export async function linkAccount(
  userId: string,
  platform: string,
  accountIdentifier: string
): Promise<void> {
  await prisma.socialPublishTarget.upsert({
    where: {
      userId_platform: { userId, platform: platform.toLowerCase() },
    },
    create: {
      userId,
      platform: platform.toLowerCase(),
      accountIdentifier,
      autoPostingEnabled: false,
    },
    update: { accountIdentifier },
  });
}

export async function unlinkAccount(userId: string, platform: string): Promise<void> {
  await prisma.socialPublishTarget.deleteMany({
    where: {
      userId,
      platform: platform.toLowerCase(),
    },
  });
}
