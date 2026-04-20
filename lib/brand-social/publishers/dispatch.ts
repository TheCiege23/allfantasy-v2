import 'server-only'
import { BRAND_PLATFORMS, PLATFORM_CHAR_LIMITS, type BrandPlatform } from '@/lib/brand-social/types'
import type { BrandPublishInput, BrandPublishResult, BrandPublisher } from './types'
import { XPublisher } from './x'

/**
 * Placeholder publisher for platforms where a real adapter hasn't shipped yet.
 * Returns a structured `no_publisher` failure — keeps the rest of the pipeline
 * honest (no silent success).
 */
class NoopPublisher implements BrandPublisher {
  constructor(public readonly platform: BrandPlatform) {}
  isConfigured(): boolean {
    return false
  }
  async publish(input: BrandPublishInput): Promise<BrandPublishResult> {
    return {
      ok: false,
      code: 'no_publisher',
      message: `${this.platform} publisher is not wired yet — IG / TikTok / YouTube / LinkedIn adapters ship in a follow-up.`,
      responseMetadata: { accountId: input.accountId, handle: input.accountHandle },
    }
  }
}

/** Registry keyed by platform slug. X is real; others are Noop until implemented. */
const PUBLISHERS: Record<BrandPlatform, BrandPublisher> = Object.fromEntries(
  BRAND_PLATFORMS.map((p) => [p, p === 'x' ? new XPublisher() : new NoopPublisher(p)]),
) as Record<BrandPlatform, BrandPublisher>

function resolvePublisher(platform: BrandPlatform): BrandPublisher {
  return PUBLISHERS[platform] ?? new NoopPublisher(platform)
}

/**
 * Validate → route → publish. Returns a `BrandPublishResult` the caller persists
 * into `BrandSocialPost.status + providerPostId + failureMessage`. Never throws on
 * business-logic errors (invalid body, missing creds) — those come back as `ok: false`
 * with a machine-readable code.
 */
export async function dispatchBrandPost(input: BrandPublishInput): Promise<BrandPublishResult> {
  if (!input.body?.trim()) {
    return { ok: false, code: 'invalid_post', message: 'Post body is empty.' }
  }
  const charLimit = PLATFORM_CHAR_LIMITS[input.platform]
  if (charLimit && input.body.length > charLimit) {
    return {
      ok: false,
      code: 'invalid_post',
      message: `Body exceeds ${input.platform} character limit (${input.body.length}/${charLimit}).`,
    }
  }
  const publisher = resolvePublisher(input.platform)
  try {
    return await publisher.publish(input)
  } catch (err) {
    return {
      ok: false,
      code: 'provider_error',
      message: err instanceof Error ? err.message : String(err),
    }
  }
}

export function isBrandPlatformConfigured(platform: BrandPlatform, input?: Partial<BrandPublishInput>): boolean {
  const publisher = resolvePublisher(platform)
  return publisher.isConfigured({
    platform,
    body: '',
    mediaUrl: null,
    accountId: '',
    accountHandle: '',
    credentials: null,
    ...input,
  })
}
