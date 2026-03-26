import type {
  FantasyMediaPublishProvider,
  FantasyMediaPublishProviderRequest,
  FantasyMediaPublishProviderResponse,
} from "./types"
import type { FantasyMediaDestinationType } from "./destinations"

const X_ACCESS_TOKEN_ENV = "X_PUBLISH_ACCESS_TOKEN"
const X_LEGACY_TOKEN_ENV = "X_PUBLISH_API_KEY"
const X_API_BASE_ENV = "X_PUBLISH_API_BASE"
const X_DEFAULT_API_BASE = "https://api.twitter.com"
const X_TWEET_MAX_LENGTH = 280
const REQUEST_TIMEOUT_MS = 12_000

/**
 * X publish provider (real adapter).
 * Publishes a post that includes episode title + playback URL.
 */
export class XPublishProvider implements FantasyMediaPublishProvider {
  id = "x-provider"

  supports(destinationType: FantasyMediaDestinationType): boolean {
    return destinationType === "x"
  }

  isConfigured(): boolean {
    return !!getAccessToken()
  }

  async publish(
    input: FantasyMediaPublishProviderRequest
  ): Promise<FantasyMediaPublishProviderResponse> {
    const accessToken = getAccessToken()
    if (!accessToken) {
      return {
        status: "failed",
        message: "X publish token is not configured",
        responseMetadata: {
          provider: this.id,
          reason: "missing_access_token",
        },
      }
    }

    const baseUrl = (process.env[X_API_BASE_ENV] ?? X_DEFAULT_API_BASE).replace(/\/+$/, "")
    const tweetText = buildTweetText(input.title, input.playbackUrl)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
      const response = await fetch(`${baseUrl}/2/tweets`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: tweetText }),
        signal: controller.signal,
      })

      const body = await safeParseJson(response)
      if (!response.ok) {
        return {
          status: "failed",
          message: `X publish failed with status ${response.status}`,
          responseMetadata: {
            provider: this.id,
            status: response.status,
            body: body ?? {},
          },
        }
      }

      const tweetId = getTweetId(body)
      return {
        status: tweetId ? "success" : "pending",
        message: tweetId ? "Published to X" : "X publish accepted",
        responseMetadata: {
          provider: this.id,
          destinationType: input.destinationType,
          tweetId: tweetId ?? null,
          tweetUrl: tweetId ? `https://x.com/i/web/status/${tweetId}` : null,
        },
      }
    } catch (error) {
      const detail =
        error instanceof Error && error.name === "AbortError"
          ? "request_timeout"
          : error instanceof Error
            ? error.message
            : "unknown_error"
      return {
        status: "failed",
        message: "X publish request failed",
        responseMetadata: {
          provider: this.id,
          reason: detail,
        },
      }
    } finally {
      clearTimeout(timeoutId)
    }
  }
}

function getAccessToken(): string | null {
  const token = process.env[X_ACCESS_TOKEN_ENV] ?? process.env[X_LEGACY_TOKEN_ENV]
  if (typeof token !== "string") return null
  const trimmed = token.trim()
  return trimmed.length > 0 ? trimmed : null
}

function buildTweetText(title: string, playbackUrl: string): string {
  const safeTitle = (title || "New fantasy media episode").replace(/\s+/g, " ").trim()
  const safeUrl = playbackUrl.trim()
  const suffix = safeUrl ? ` ${safeUrl}` : ""
  const maxTitleLength = Math.max(0, X_TWEET_MAX_LENGTH - suffix.length)
  const clippedTitle =
    safeTitle.length <= maxTitleLength
      ? safeTitle
      : `${safeTitle.slice(0, Math.max(0, maxTitleLength - 1)).trimEnd()}…`
  return `${clippedTitle}${suffix}`.trim()
}

async function safeParseJson(response: Response): Promise<Record<string, unknown> | null> {
  try {
    const parsed = await response.json()
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
    return null
  } catch {
    return null
  }
}

function getTweetId(body: Record<string, unknown> | null): string | null {
  if (!body) return null
  const data = body.data
  if (!data || typeof data !== "object" || Array.isArray(data)) return null
  const id = (data as Record<string, unknown>).id
  return typeof id === "string" && id.trim().length > 0 ? id : null
}
