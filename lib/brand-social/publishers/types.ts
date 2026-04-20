import type { BrandPlatform } from '@/lib/brand-social/types'

export type BrandPublishInput = {
  platform: BrandPlatform
  body: string
  mediaUrl: string | null
  accountId: string
  accountHandle: string
  /** Credentials snapshot from BrandSocialAccount.credentialsJson — shape varies per platform. */
  credentials: Record<string, unknown> | null
}

export type BrandPublishResult =
  | {
      ok: true
      providerPostId: string
      responseMetadata?: Record<string, unknown>
    }
  | {
      ok: false
      /** Machine-readable category so the UI can distinguish retriable vs fatal. */
      code: 'no_publisher' | 'missing_credentials' | 'provider_error' | 'invalid_post'
      message: string
      responseMetadata?: Record<string, unknown>
    }

export interface BrandPublisher {
  readonly platform: BrandPlatform
  /** True when env + per-account credentials are present. */
  isConfigured(input: BrandPublishInput): boolean
  publish(input: BrandPublishInput): Promise<BrandPublishResult>
}
