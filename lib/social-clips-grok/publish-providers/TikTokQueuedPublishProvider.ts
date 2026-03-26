import type { SocialPlatform } from "../types"
import type {
  SocialPublishProvider,
  SocialPublishProviderRequest,
  SocialPublishProviderResponse,
} from "./types"

function hasTikTokCredential(): boolean {
  return !!process.env.TIKTOK_PUBLISH_ACCESS_TOKEN?.trim() || !!process.env.SOCIAL_PUBLISH_TOKEN?.trim()
}

export class TikTokQueuedPublishProvider implements SocialPublishProvider {
  id = "social-tiktok-queued-provider"

  supports(platform: SocialPlatform): boolean {
    return platform === "tiktok"
  }

  isConfigured(platform: SocialPlatform): boolean {
    return this.supports(platform) && hasTikTokCredential()
  }

  async publish(_input: SocialPublishProviderRequest): Promise<SocialPublishProviderResponse> {
    return {
      status: "pending",
      message: "TikTok publish queued",
      responseMetadata: {
        note: "queued_for_tiktok_adapter",
      },
    }
  }
}
