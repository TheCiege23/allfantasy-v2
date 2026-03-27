import type {
  FantasyMediaProviderCredentialRefreshPayload,
  FantasyMediaPublishProvider,
  FantasyMediaPublishProviderRequest,
  FantasyMediaPublishProviderResponse,
} from "./types"
import type { FantasyMediaDestinationType } from "./destinations"

const YOUTUBE_ACCESS_TOKEN_ENV = "YOUTUBE_PUBLISH_ACCESS_TOKEN"
const YOUTUBE_REFRESH_TOKEN_ENV = "YOUTUBE_PUBLISH_REFRESH_TOKEN"
const YOUTUBE_CLIENT_ID_ENV = "YOUTUBE_PUBLISH_CLIENT_ID"
const YOUTUBE_CLIENT_SECRET_ENV = "YOUTUBE_PUBLISH_CLIENT_SECRET"
const YOUTUBE_TOKEN_URL_ENV = "YOUTUBE_PUBLISH_TOKEN_URL"
const YOUTUBE_API_BASE_ENV = "YOUTUBE_PUBLISH_API_BASE"
const YOUTUBE_DEFAULT_TOKEN_URL = "https://oauth2.googleapis.com/token"
const YOUTUBE_DEFAULT_API_BASE = "https://www.googleapis.com"
const REQUEST_TIMEOUT_MS = 30_000
const MAX_DOWNLOAD_BYTES = 250 * 1024 * 1024 // 250MB

/**
 * YouTube publish provider with resumable upload flow.
 */
export class YouTubePublishProvider implements FantasyMediaPublishProvider {
  id = "youtube-provider"

  supports(destinationType: FantasyMediaDestinationType): boolean {
    return destinationType === "youtube"
  }

  isConfigured(): boolean {
    return !!getAccessTokenFromEnv() || hasRefreshCredentials()
  }

  async publish(
    input: FantasyMediaPublishProviderRequest
  ): Promise<FantasyMediaPublishProviderResponse> {
    let accessToken = await resolveAccessToken({
      forceRefresh: false,
      onCredentialRefresh: input.onCredentialRefresh,
      userId: input.userId,
      destinationType: input.destinationType,
      providerId: this.id,
    })
    if (!accessToken) {
      return {
        status: "failed",
        message: "YouTube publish token is not configured",
        responseMetadata: {
          provider: this.id,
          reason: "missing_access_token",
        },
      }
    }

    const sourceResult = await fetchSourceVideo(input.playbackUrl)
    if (!sourceResult.ok) {
      return {
        status: "failed",
        message: sourceResult.message,
        responseMetadata: {
          provider: this.id,
          reason: sourceResult.reason,
        },
      }
    }

    const initUpload = await this.createResumableSession(accessToken, input, sourceResult)
    if (initUpload.status === 401 && hasRefreshCredentials()) {
      const refreshedToken = await resolveAccessToken({
        forceRefresh: true,
        onCredentialRefresh: input.onCredentialRefresh,
        userId: input.userId,
        destinationType: input.destinationType,
        providerId: this.id,
      })
      if (refreshedToken) {
        accessToken = refreshedToken
      }
    }

    const sessionResult =
      initUpload.status === 401 && accessToken
        ? await this.createResumableSession(accessToken, input, sourceResult)
        : initUpload

    if (!sessionResult.ok) {
      return {
        status: "failed",
        message: `YouTube resumable session failed with status ${sessionResult.status}`,
        responseMetadata: {
          provider: this.id,
          step: "session_create",
          status: sessionResult.status,
          body: sessionResult.body ?? {},
        },
      }
    }

    const uploadAttempt = await this.uploadVideoBytes(accessToken, sessionResult.sessionUrl, sourceResult)
    const finalUpload =
      uploadAttempt.status === 401 && hasRefreshCredentials()
        ? await this.retryUploadWithRefreshedToken(uploadAttempt, sessionResult.sessionUrl, sourceResult, input)
        : uploadAttempt

    if (!finalUpload.ok) {
      return {
        status: "failed",
        message: `YouTube upload failed with status ${finalUpload.status}`,
        responseMetadata: {
          provider: this.id,
          step: "upload_bytes",
          status: finalUpload.status,
          body: finalUpload.body ?? {},
        },
      }
    }

    const videoId = extractYouTubeVideoId(finalUpload.body)
    return {
      status: videoId ? "success" : "pending",
      message: videoId ? "Uploaded to YouTube" : "YouTube upload accepted",
      responseMetadata: {
        provider: this.id,
        destinationType: input.destinationType,
        videoId: videoId ?? null,
        videoUrl: videoId ? `https://www.youtube.com/watch?v=${videoId}` : null,
      },
    }
  }

  private async retryUploadWithRefreshedToken(
    initialAttempt: UploadResult,
    sessionUrl: string,
    source: SourceVideoSuccess,
    input: FantasyMediaPublishProviderRequest
  ): Promise<UploadResult> {
    if (initialAttempt.status !== 401) return initialAttempt
    const refreshedToken = await resolveAccessToken({
      forceRefresh: true,
      onCredentialRefresh: input.onCredentialRefresh,
      userId: input.userId,
      destinationType: input.destinationType,
      providerId: this.id,
    })
    if (!refreshedToken) return initialAttempt
    return this.uploadVideoBytes(refreshedToken, sessionUrl, source)
  }

  private async createResumableSession(
    accessToken: string,
    input: FantasyMediaPublishProviderRequest,
    source: SourceVideoSuccess
  ): Promise<ResumableSessionResult> {
    const apiBase = (process.env[YOUTUBE_API_BASE_ENV] ?? YOUTUBE_DEFAULT_API_BASE).replace(/\/+$/, "")
    const response = await fetchWithTimeout(
      `${apiBase}/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
          "X-Upload-Content-Type": source.contentType,
          "X-Upload-Content-Length": String(source.bytes.byteLength),
        },
        body: JSON.stringify({
          snippet: {
            title: truncate(input.title, 100),
            description: buildYouTubeDescription(input),
            categoryId: "17",
          },
          status: {
            privacyStatus: "unlisted",
          },
        }),
      }
    )

    const body = await safeParseJson(response)
    const sessionUrl = response.headers.get("location")
    if (!response.ok || !sessionUrl) {
      return {
        ok: false,
        status: response.status,
        body,
      }
    }

    return {
      ok: true,
      status: response.status,
      sessionUrl,
      body,
    }
  }

  private async uploadVideoBytes(
    accessToken: string,
    sessionUrl: string,
    source: SourceVideoSuccess
  ): Promise<UploadResult> {
    const response = await fetchWithTimeout(sessionUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": source.contentType,
        "Content-Length": String(source.bytes.byteLength),
      },
      body: source.bytes,
    })

    const body = await safeParseJson(response)
    if (response.status === 308) {
      return {
        ok: true,
        status: 308,
        body,
      }
    }

    return {
      ok: response.ok,
      status: response.status,
      body,
    }
  }
}

type SourceVideoResult =
  | {
      ok: true
      bytes: ArrayBuffer
      contentType: string
    }
  | {
      ok: false
      reason: string
      message: string
    }

type SourceVideoSuccess = Extract<SourceVideoResult, { ok: true }>

type ResumableSessionResult =
  | {
      ok: true
      status: number
      sessionUrl: string
      body: Record<string, unknown> | null
    }
  | {
      ok: false
      status: number
      body: Record<string, unknown> | null
    }

interface UploadResult {
  ok: boolean
  status: number
  body: Record<string, unknown> | null
}

function getAccessTokenFromEnv(): string | null {
  const token = process.env[YOUTUBE_ACCESS_TOKEN_ENV]
  if (typeof token !== "string") return null
  const trimmed = token.trim()
  return trimmed.length > 0 ? trimmed : null
}

function hasRefreshCredentials(): boolean {
  const refreshToken = process.env[YOUTUBE_REFRESH_TOKEN_ENV]
  const clientId = process.env[YOUTUBE_CLIENT_ID_ENV]
  const clientSecret = process.env[YOUTUBE_CLIENT_SECRET_ENV]
  return !!refreshToken?.trim() && !!clientId?.trim() && !!clientSecret?.trim()
}

async function resolveAccessToken(input: {
  forceRefresh: boolean
  onCredentialRefresh?: (
    payload: FantasyMediaProviderCredentialRefreshPayload
  ) => void | Promise<void>
  userId: string
  destinationType: FantasyMediaDestinationType
  providerId: string
}): Promise<string | null> {
  if (!input.forceRefresh) {
    const directToken = getAccessTokenFromEnv()
    if (directToken) return directToken
  }

  if (!hasRefreshCredentials()) return null

  const tokenUrl = process.env[YOUTUBE_TOKEN_URL_ENV] ?? YOUTUBE_DEFAULT_TOKEN_URL
  const form = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: process.env[YOUTUBE_REFRESH_TOKEN_ENV]!.trim(),
    client_id: process.env[YOUTUBE_CLIENT_ID_ENV]!.trim(),
    client_secret: process.env[YOUTUBE_CLIENT_SECRET_ENV]!.trim(),
  })
  const response = await fetchWithTimeout(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  })
  if (!response.ok) return null
  const body = (await response.json().catch(() => null)) as
    | { access_token?: string; expires_in?: number }
    | null
  const token = body?.access_token?.trim()
  if (!token) return null
  if (input.onCredentialRefresh) {
    await input.onCredentialRefresh({
      providerId: input.providerId,
      destinationType: input.destinationType,
      userId: input.userId,
      accessToken: token,
      expiresInSeconds: typeof body?.expires_in === "number" ? body.expires_in : null,
    })
  }
  return token
}

async function fetchSourceVideo(playbackUrl: string): Promise<SourceVideoResult> {
  const response = await fetchWithTimeout(playbackUrl, { method: "GET" })
  if (!response.ok) {
    return {
      ok: false,
      reason: "source_fetch_failed",
      message: `Source media fetch failed with status ${response.status}`,
    }
  }
  const bytes = await response.arrayBuffer()
  if (bytes.byteLength === 0) {
    return {
      ok: false,
      reason: "source_media_empty",
      message: "Source media is empty",
    }
  }
  if (bytes.byteLength > MAX_DOWNLOAD_BYTES) {
    return {
      ok: false,
      reason: "source_media_too_large",
      message: "Source media exceeds upload size limit",
    }
  }
  return {
    ok: true,
    bytes,
    contentType: response.headers.get("content-type") || "video/mp4",
  }
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timeoutId)
  }
}

function truncate(value: string, maxLength: number): string {
  const normalized = value.replace(/\s+/g, " ").trim()
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`
}

function buildYouTubeDescription(input: FantasyMediaPublishProviderRequest): string {
  return [
    `AllFantasy upload: ${input.title}`.trim(),
    `Watch here: ${input.playbackUrl}`,
  ].join("\n")
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

function extractYouTubeVideoId(body: Record<string, unknown> | null): string | null {
  if (!body) return null
  const id = body.id
  if (typeof id === "string" && id.trim().length > 0) return id
  const data = body.data
  if (!data || typeof data !== "object" || Array.isArray(data)) return null
  const nestedId = (data as Record<string, unknown>).id
  return typeof nestedId === "string" && nestedId.trim().length > 0 ? nestedId : null
}
