import type { SocialPlatform } from "../types"
import type { ResolvedTarget } from "../ConnectedSocialAccountResolver"

export type SocialPublishStatus = "pending" | "success" | "failed" | "provider_unavailable"

export interface SocialPublishProviderRequest {
  assetId: string
  userId: string
  platform: SocialPlatform
  mode: "manual" | "auto"
  publishText: string
  assetTitle: string
  assetMetadata: Record<string, unknown>
  target: ResolvedTarget
}

export interface SocialPublishProviderResponse {
  status: SocialPublishStatus
  message: string
  responseMetadata?: Record<string, unknown>
}

export interface SocialPublishProvider {
  id: string
  supports(platform: SocialPlatform): boolean
  isConfigured(platform: SocialPlatform): boolean
  publish(input: SocialPublishProviderRequest): Promise<SocialPublishProviderResponse>
}
