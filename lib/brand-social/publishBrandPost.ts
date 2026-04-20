import 'server-only'
import { prisma } from '@/lib/prisma'
import type { BrandPlatform } from '@/lib/brand-social/types'
import { dispatchBrandPost } from '@/lib/brand-social/publishers/dispatch'
import type { BrandPublishResult } from '@/lib/brand-social/publishers/types'

/**
 * Attempts publish for a single BrandSocialPost row. Uses a lightweight state
 * machine (status='publishing' claim → dispatch → terminal status) so the cron
 * + manual publish can't double-send the same row.
 *
 * Returns the publish result so callers can surface it in the API response.
 */
export async function publishBrandPostById(postId: string): Promise<
  | { ok: true; result: BrandPublishResult }
  | { ok: false; error: string; code: 'not_found' | 'wrong_state' | 'account_missing' }
> {
  const post = await (prisma as any).brandSocialPost.findUnique({
    where: { id: postId },
    include: { account: true },
  })
  if (!post) return { ok: false, error: 'Post not found', code: 'not_found' }

  // Only drafts, scheduled, and failed rows can be (re)published. Sent / cancelled are terminal.
  if (post.status !== 'draft' && post.status !== 'scheduled' && post.status !== 'failed') {
    return { ok: false, error: `Cannot publish a post in status "${post.status}"`, code: 'wrong_state' }
  }

  if (!post.account) {
    return { ok: false, error: 'Account not found on this post', code: 'account_missing' }
  }

  // Atomic claim: flip to 'publishing' only if still in a publishable state.
  const claim = await (prisma as any).brandSocialPost.updateMany({
    where: { id: postId, status: { in: ['draft', 'scheduled', 'failed'] } },
    data: { status: 'publishing', failureMessage: null },
  })
  if (claim.count === 0) {
    // Another worker (cron or admin click) raced us and already claimed it.
    return { ok: false, error: 'Post already being published', code: 'wrong_state' }
  }

  const credentials =
    post.account.credentialsJson && typeof post.account.credentialsJson === 'object'
      ? (post.account.credentialsJson as Record<string, unknown>)
      : null

  const result = await dispatchBrandPost({
    platform: post.account.platform as BrandPlatform,
    body: post.body,
    mediaUrl: post.mediaUrl ?? null,
    accountId: post.account.id,
    accountHandle: post.account.handle,
    credentials,
  })

  if (result.ok) {
    await (prisma as any).brandSocialPost.update({
      where: { id: postId },
      data: {
        status: 'sent',
        publishedAt: new Date(),
        providerPostId: result.providerPostId,
        providerResponse: result.responseMetadata ?? null,
        failureMessage: null,
      },
    })
  } else {
    await (prisma as any).brandSocialPost.update({
      where: { id: postId },
      data: {
        status: 'failed',
        providerResponse: result.responseMetadata ?? null,
        failureMessage: `[${result.code}] ${result.message}`.slice(0, 500),
      },
    })
  }

  return { ok: true, result }
}
