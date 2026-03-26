import type { SocialPlatform } from "../types"
import type {
  SocialPublishProvider,
  SocialPublishProviderRequest,
  SocialPublishProviderResponse,
} from "./types"

const GRAPH_BASE = (process.env.SOCIAL_GRAPH_API_BASE ?? "https://graph.facebook.com/v20.0").replace(/\/+$/, "")
const REQUEST_TIMEOUT_MS = 15_000

function getInstagramToken(): string | null {
  const token = process.env.INSTAGRAM_PUBLISH_ACCESS_TOKEN ?? process.env.SOCIAL_PUBLISH_TOKEN
  if (typeof token !== "string") return null
  const trimmed = token.trim()
  return trimmed.length > 0 ? trimmed : null
}

function resolveInstagramAccountId(input: SocialPublishProviderRequest): string | null {
  const fromTarget =
    typeof input.target.accountIdentifier === "string" ? input.target.accountIdentifier.trim() : ""
  if (fromTarget.length > 0) return fromTarget
  const fromEnv = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID
  if (typeof fromEnv !== "string") return null
  const trimmed = fromEnv.trim()
  return trimmed.length > 0 ? trimmed : null
}

function resolveMediaUrl(input: SocialPublishProviderRequest): string | null {
  const metadata = input.assetMetadata
  const candidates = [
    metadata.mediaUrl,
    metadata.videoUrl,
    metadata.playbackUrl,
    metadata.assetUrl,
    process.env.SOCIAL_DEFAULT_MEDIA_URL,
  ]
  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue
    const trimmed = candidate.trim()
    if (/^https?:\/\//i.test(trimmed)) return trimmed
  }
  return null
}

function isVideoUrl(url: string): boolean {
  const lowered = url.toLowerCase()
  return lowered.endsWith(".mp4") || lowered.includes("video")
}

async function postForm(
  url: string,
  params: Record<string, string>
): Promise<{ ok: boolean; status: number; body: Record<string, unknown> | null }> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const body = new URLSearchParams(params).toString()
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      signal: controller.signal,
    })
    const parsed = (await response.json().catch(() => null)) as Record<string, unknown> | null
    return { ok: response.ok, status: response.status, body: parsed }
  } finally {
    clearTimeout(timeout)
  }
}

export class InstagramSocialPublishProvider implements SocialPublishProvider {
  id = "social-instagram-provider"

  supports(platform: SocialPlatform): boolean {
    return platform === "instagram"
  }

  isConfigured(platform: SocialPlatform): boolean {
    return this.supports(platform) && !!getInstagramToken()
  }

  async publish(input: SocialPublishProviderRequest): Promise<SocialPublishProviderResponse> {
    const accessToken = getInstagramToken()
    if (!accessToken) {
      return {
        status: "provider_unavailable",
        message: "Instagram provider credentials are not configured",
        responseMetadata: { reason: "missing_access_token" },
      }
    }
    const igUserId = resolveInstagramAccountId(input)
    if (!igUserId) {
      return {
        status: "failed",
        message: "Instagram account is not linked to a publish target",
        responseMetadata: { reason: "missing_instagram_user_id" },
      }
    }
    const mediaUrl = resolveMediaUrl(input)
    if (!mediaUrl) {
      return {
        status: "failed",
        message: "Instagram publishing requires a media URL",
        responseMetadata: { reason: "missing_media_url" },
      }
    }

    const containerResponse = await postForm(`${GRAPH_BASE}/${encodeURIComponent(igUserId)}/media`, {
      access_token: accessToken,
      caption: input.publishText,
      ...(isVideoUrl(mediaUrl) ? { video_url: mediaUrl, media_type: "REELS" } : { image_url: mediaUrl }),
    })
    if (!containerResponse.ok) {
      return {
        status: "failed",
        message: `Instagram media container failed (${containerResponse.status})`,
        responseMetadata: {
          status: containerResponse.status,
          body: containerResponse.body ?? {},
        },
      }
    }

    const creationId =
      containerResponse.body && typeof containerResponse.body.id === "string"
        ? containerResponse.body.id
        : null
    if (!creationId) {
      return {
        status: "failed",
        message: "Instagram media container missing creation id",
        responseMetadata: {
          body: containerResponse.body ?? {},
        },
      }
    }

    const publishResponse = await postForm(
      `${GRAPH_BASE}/${encodeURIComponent(igUserId)}/media_publish`,
      {
        access_token: accessToken,
        creation_id: creationId,
      }
    )
    if (!publishResponse.ok) {
      return {
        status: "failed",
        message: `Instagram publish failed (${publishResponse.status})`,
        responseMetadata: {
          status: publishResponse.status,
          body: publishResponse.body ?? {},
        },
      }
    }

    const mediaId =
      publishResponse.body && typeof publishResponse.body.id === "string"
        ? publishResponse.body.id
        : null
    return {
      status: "success",
      message: "Published to Instagram",
      responseMetadata: {
        mediaId,
        creationId,
      },
    }
  }
}
