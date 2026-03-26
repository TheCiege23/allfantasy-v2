import type {
  FantasyMediaPublishProvider,
  FantasyMediaPublishProviderRequest,
  FantasyMediaPublishProviderResponse,
} from "./types"
import type { FantasyMediaDestinationType } from "./destinations"

const GENERIC_SOCIAL_TOKEN_ENV = "SOCIAL_PUBLISH_TOKEN"
const DESTINATIONS = new Set<FantasyMediaDestinationType>([
  "facebook",
  "instagram",
  "tiktok",
  "discord",
])

/**
 * Generic social provider skeleton for remaining destinations.
 */
export class GenericSocialPublishProvider implements FantasyMediaPublishProvider {
  id = "generic-social-provider"

  supports(destinationType: FantasyMediaDestinationType): boolean {
    return DESTINATIONS.has(destinationType)
  }

  isConfigured(): boolean {
    const token = process.env[GENERIC_SOCIAL_TOKEN_ENV]
    return typeof token === "string" && token.trim().length > 0
  }

  async publish(
    input: FantasyMediaPublishProviderRequest
  ): Promise<FantasyMediaPublishProviderResponse> {
    return {
      status: "pending",
      message: "Social publish queued",
      responseMetadata: {
        provider: this.id,
        destinationType: input.destinationType,
        externalJobId: `social-${Date.now()}`,
      },
    }
  }
}
