/**
 * Approval flow: mark asset approved then allow publish (Prompt 116).
 */

import { prisma } from '@/lib/prisma';

export async function approveForPublish(assetId: string, userId: string): Promise<boolean> {
  const asset = await prisma.socialContentAsset.findFirst({
    where: { id: assetId, userId },
  });
  if (!asset) return false;
  await prisma.socialContentAsset.update({
    where: { id: assetId },
    data: { approvedForPublish: true },
  });
  return true;
}

export async function revokeApproval(assetId: string, userId: string): Promise<boolean> {
  const asset = await prisma.socialContentAsset.findFirst({
    where: { id: assetId, userId },
  });
  if (!asset) return false;
  await prisma.socialContentAsset.update({
    where: { id: assetId },
    data: { approvedForPublish: false },
  });
  return true;
}

export async function canPublish(assetId: string, userId: string): Promise<boolean> {
  const asset = await prisma.socialContentAsset.findFirst({
    where: { id: assetId, userId },
  });
  return !!asset?.approvedForPublish;
}
