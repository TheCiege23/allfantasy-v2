import type { SocialPlatform } from "../types"
import type {
  SocialPublishProvider,
  SocialPublishProviderRequest,
  SocialPublishProviderResponse,
} from "./types"

const REQUEST_TIMEOUT_MS = 10_000
const X_API_BASE = (process.env.X_PUBLISH_API_BASE ?? "https://api.twitter.com").replace(/\/+$/, "")

function getXAccessToken(): string | null {
  const token = process.env.X_PUBLISH_ACCESS_TOKEN ?? process.env.X_PUBLISH_API_KEY
  if (typeof token !== "string") return null
  const trimmed = token.trim()
  return trimmed.length > 0 ? trimmed : null
}

export class XSocialPublishProvider implements SocialPublishProvider {
  id = "social-x-provider"

  supports(platform: SocialPlatform): boolean {
    return platform === "x"
  }

  isConfigured(platform: SocialPlatform): boolean {
    return this.supports(platform) && !!getXAccessToken()
  }

  async publish(input: SocialPublishProviderRequest): Promise<SocialPublishProviderResponse> {
    const accessToken = getXAccessToken()
    if (!accessToken) {
      return {
        status: "provider_unavailable",
        message: "X provider credentials are not configured",
        responseMetadata: {
          reason: "missing_access_token",
        },
      }
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    try {
      const response = await fetch(`${X_API_BASE}/2/tweets`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: input.publishText.slice(0, 280) }),
        signal: controller.signal,
      })
      const body = (await response.json().catch(() => null)) as Record<string, unknown> | null
      if (!response.ok) {
        return {
          status: "failed",
          message: `X publish failed (${response.status})`,
          responseMetadata: {
            status: response.status,
            body: body ?? {},
          },
        }
      }
      const data = body?.data
      const tweetId =
        data && typeof data === "object" && !Array.isArray(data) && typeof data.id === "string"
          ? data.id
          : null
      return {
        status: "success",
        message: "Published to X",
        responseMetadata: {
          tweetId,
          tweetUrl: tweetId ? `https://x.com/i/web/status/${tweetId}` : null,
        },
      }
    } catch (error) {
      return {
        status: "failed",
        message: "X publish request failed",
        responseMetadata: {
          error: error instanceof Error ? error.message : "request_failed",
        },
      }
    } finally {
      clearTimeout(timeout)
    }
  }
}
