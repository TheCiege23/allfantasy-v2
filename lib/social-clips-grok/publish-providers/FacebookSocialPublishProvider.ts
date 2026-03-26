import type { SocialPlatform } from "../types"
import type {
  SocialPublishProvider,
  SocialPublishProviderRequest,
  SocialPublishProviderResponse,
} from "./types"

const GRAPH_BASE = (process.env.SOCIAL_GRAPH_API_BASE ?? "https://graph.facebook.com/v20.0").replace(/\/+$/, "")
const REQUEST_TIMEOUT_MS = 10_000

function getFacebookToken(): string | null {
  const token = process.env.FACEBOOK_PUBLISH_ACCESS_TOKEN ?? process.env.SOCIAL_PUBLISH_TOKEN
  if (typeof token !== "string") return null
  const trimmed = token.trim()
  return trimmed.length > 0 ? trimmed : null
}

function resolveFacebookPageId(input: SocialPublishProviderRequest): string | null {
  const fromTarget =
    typeof input.target.accountIdentifier === "string" ? input.target.accountIdentifier.trim() : ""
  if (fromTarget.length > 0) return fromTarget
  const fromEnv = process.env.FACEBOOK_PAGE_ID
  if (typeof fromEnv !== "string") return null
  const trimmed = fromEnv.trim()
  return trimmed.length > 0 ? trimmed : null
}

export class FacebookSocialPublishProvider implements SocialPublishProvider {
  id = "social-facebook-provider"

  supports(platform: SocialPlatform): boolean {
    return platform === "facebook"
  }

  isConfigured(platform: SocialPlatform): boolean {
    return this.supports(platform) && !!getFacebookToken()
  }

  async publish(input: SocialPublishProviderRequest): Promise<SocialPublishProviderResponse> {
    const accessToken = getFacebookToken()
    if (!accessToken) {
      return {
        status: "provider_unavailable",
        message: "Facebook provider credentials are not configured",
        responseMetadata: { reason: "missing_access_token" },
      }
    }
    const pageId = resolveFacebookPageId(input)
    if (!pageId) {
      return {
        status: "failed",
        message: "Facebook page/account id not configured",
        responseMetadata: { reason: "missing_page_id" },
      }
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    try {
      const body = new URLSearchParams({
        access_token: accessToken,
        message: input.publishText,
      }).toString()
      const response = await fetch(`${GRAPH_BASE}/${encodeURIComponent(pageId)}/feed`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
        signal: controller.signal,
      })
      const parsed = (await response.json().catch(() => null)) as Record<string, unknown> | null
      if (!response.ok) {
        return {
          status: "failed",
          message: `Facebook publish failed (${response.status})`,
          responseMetadata: {
            status: response.status,
            body: parsed ?? {},
          },
        }
      }
      const postId = parsed && typeof parsed.id === "string" ? parsed.id : null
      return {
        status: "success",
        message: "Published to Facebook",
        responseMetadata: {
          postId,
        },
      }
    } catch (error) {
      return {
        status: "failed",
        message: "Facebook publish request failed",
        responseMetadata: {
          error: error instanceof Error ? error.message : "request_failed",
        },
      }
    } finally {
      clearTimeout(timeout)
    }
  }
}
