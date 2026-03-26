import { prisma } from "@/lib/prisma"
import { SUPPORTED_PLATFORMS, type SocialPlatform } from "./types"
import { getSocialProviderForPlatform } from "./publish-providers/registry"
import { getSocialProviderEnvKeys } from "./ProviderConfig"

export interface SocialPublishPlatformHealth {
  platform: SocialPlatform
  providerId: string | null
  adapterAvailable: boolean
  configured: boolean
  requiredEnvKeys: string[]
  connectedTargets: number
  autoPostEnabledTargets: number
  pendingCount: number
  successLast24h: number
  failedLast24h: number
  providerUnavailableLast24h: number
  lastStatus: string | null
  lastPublishAt: string | null
  latestResponseMetadata: Record<string, unknown> | null
  latestErrorSummary: string | null
}

export interface SocialPublishHealthStatus {
  generatedAt: string
  platforms: SocialPublishPlatformHealth[]
}

function sanitizeMetadata(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[truncated]"
  if (value == null) return value
  if (typeof value === "string") return value.length > 500 ? `${value.slice(0, 500)}…` : value
  if (typeof value === "number" || typeof value === "boolean") return value
  if (Array.isArray(value)) return value.slice(0, 20).map((entry) => sanitizeMetadata(entry, depth + 1))
  if (typeof value !== "object") return String(value)
  const output: Record<string, unknown> = {}
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    output[key] = sanitizeMetadata(entry, depth + 1)
  }
  return output
}

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  return sanitizeMetadata(value) as Record<string, unknown>
}

function toLatestErrorSummary(
  status: string | null,
  responseMetadata: Record<string, unknown> | null
): string | null {
  if (!status || status === "success") return null
  if (!responseMetadata) return status
  const directError = responseMetadata.error
  if (typeof directError === "string" && directError.trim().length > 0) return directError
  const reason = responseMetadata.reason
  if (typeof reason === "string" && reason.trim().length > 0) return reason
  const body = responseMetadata.body
  if (body && typeof body === "object" && !Array.isArray(body)) {
    const bodyError = (body as Record<string, unknown>).error
    if (typeof bodyError === "string" && bodyError.trim().length > 0) return bodyError
    if (bodyError && typeof bodyError === "object" && !Array.isArray(bodyError)) {
      const message = (bodyError as Record<string, unknown>).message
      if (typeof message === "string" && message.trim().length > 0) return message
    }
  }
  return status
}

export async function getSocialPublishHealthStatus(): Promise<SocialPublishHealthStatus> {
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const [targets, recentLogs] = await Promise.all([
    prisma.socialPublishTarget.findMany({
      select: {
        platform: true,
        autoPostingEnabled: true,
      },
    }),
    prisma.socialPublishLog.findMany({
      where: {
        createdAt: { gte: since24h },
      },
      select: {
        platform: true,
        status: true,
      },
    }),
  ])

  const targetCounts = new Map<string, { connected: number; autoEnabled: number }>()
  for (const target of targets) {
    const existing = targetCounts.get(target.platform) ?? { connected: 0, autoEnabled: 0 }
    existing.connected += 1
    if (target.autoPostingEnabled) existing.autoEnabled += 1
    targetCounts.set(target.platform, existing)
  }

  const recentCounts = new Map<
    string,
    {
      success: number
      failed: number
      providerUnavailable: number
      pending: number
    }
  >()
  for (const log of recentLogs) {
    const existing = recentCounts.get(log.platform) ?? {
      success: 0,
      failed: 0,
      providerUnavailable: 0,
      pending: 0,
    }
    if (log.status === "success") existing.success += 1
    else if (log.status === "provider_unavailable") existing.providerUnavailable += 1
    else if (log.status === "pending") existing.pending += 1
    else if (log.status === "failed") existing.failed += 1
    recentCounts.set(log.platform, existing)
  }

  const latestLogs = await Promise.all(
    SUPPORTED_PLATFORMS.map(async (platform) => {
      const latest = await prisma.socialPublishLog.findFirst({
        where: { platform },
        orderBy: { createdAt: "desc" },
        select: {
          status: true,
          createdAt: true,
          responseMetadata: true,
        },
      })
      return { platform, latest }
    })
  )

  const latestByPlatform = new Map(
    latestLogs.map((entry) => [entry.platform, entry.latest] as const)
  )

  const platforms: SocialPublishPlatformHealth[] = SUPPORTED_PLATFORMS.map((platform) => {
    const provider = getSocialProviderForPlatform(platform)
    const targetCount = targetCounts.get(platform) ?? { connected: 0, autoEnabled: 0 }
    const counts24h = recentCounts.get(platform) ?? {
      success: 0,
      failed: 0,
      providerUnavailable: 0,
      pending: 0,
    }
    const latest = latestByPlatform.get(platform)
    const latestResponseMetadata = toRecord(latest?.responseMetadata)
    return {
      platform,
      providerId: provider?.id ?? null,
      adapterAvailable: !!provider,
      configured: provider ? provider.isConfigured(platform) : false,
      requiredEnvKeys: getSocialProviderEnvKeys(platform),
      connectedTargets: targetCount.connected,
      autoPostEnabledTargets: targetCount.autoEnabled,
      pendingCount: counts24h.pending,
      successLast24h: counts24h.success,
      failedLast24h: counts24h.failed,
      providerUnavailableLast24h: counts24h.providerUnavailable,
      lastStatus: latest?.status ?? null,
      lastPublishAt: latest?.createdAt?.toISOString() ?? null,
      latestResponseMetadata,
      latestErrorSummary: toLatestErrorSummary(latest?.status ?? null, latestResponseMetadata),
    }
  })

  return {
    generatedAt: new Date().toISOString(),
    platforms,
  }
}
