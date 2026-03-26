import { prisma } from "@/lib/prisma"

const DEFAULT_PROVIDER_KEYS = ["google", "youtube"] as const
const PROVIDER_KEYS_ENV = "YOUTUBE_PUBLISH_PROVIDER_KEYS"

export interface PersistYouTubeTokenInput {
  userId: string
  accessToken: string
  expiresInSeconds: number | null
}

function resolveProviderKeys(): string[] {
  const raw = process.env[PROVIDER_KEYS_ENV]
  if (!raw) return [...DEFAULT_PROVIDER_KEYS]
  const keys = raw
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
  return keys.length > 0 ? keys : [...DEFAULT_PROVIDER_KEYS]
}

function resolveExpiresAtUnix(expiresInSeconds: number | null): number | null {
  if (typeof expiresInSeconds !== "number" || !Number.isFinite(expiresInSeconds)) return null
  const nowUnix = Math.floor(Date.now() / 1000)
  return nowUnix + Math.max(0, Math.floor(expiresInSeconds))
}

/**
 * Persists refreshed YouTube/Google access token into linked auth account rows.
 * Returns number of account records updated.
 */
export async function persistRefreshedYouTubeAccessToken(
  input: PersistYouTubeTokenInput
): Promise<number> {
  const providerKeys = resolveProviderKeys()
  if (!input.userId || !input.accessToken || providerKeys.length === 0) return 0

  const result = await (prisma as any).authAccount
    .updateMany({
      where: {
        userId: input.userId,
        provider: { in: providerKeys },
      },
      data: {
        access_token: input.accessToken,
        expires_at: resolveExpiresAtUnix(input.expiresInSeconds),
      },
    })
    .catch(() => ({ count: 0 }))

  return typeof result?.count === "number" ? result.count : 0
}
