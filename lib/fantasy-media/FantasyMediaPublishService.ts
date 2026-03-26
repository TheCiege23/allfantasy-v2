/**
 * Fantasy media publish service (Prompt 115 follow-up).
 * Logs publish attempts to FantasyMediaPublishLog and returns provider-safe statuses.
 */

import { prisma } from "@/lib/prisma"
import {
  FANTASY_MEDIA_DESTINATIONS,
  type FantasyMediaDestinationType,
} from "./publish-providers/destinations"
import { getProviderForDestination } from "./publish-providers/registry"

export { FANTASY_MEDIA_DESTINATIONS }
export type { FantasyMediaDestinationType }
export type FantasyMediaPublishStatus =
  | "pending"
  | "success"
  | "failed"
  | "provider_unavailable"

export interface FantasyMediaPublishResult {
  destinationType: string
  status: FantasyMediaPublishStatus
  publishId: string
  message?: string
}

export interface FantasyMediaPublishExecutionOptions {
  onProviderCredentialRefresh?: (payload: {
    providerId: string
    destinationType: FantasyMediaDestinationType
    userId: string
    accessToken: string
    expiresInSeconds: number | null
  }) => void | Promise<void>
}

function isProviderConfigured(): boolean {
  return process.env.FANTASY_MEDIA_PUBLISH_ENABLED === "true"
}

export async function publishFantasyMediaEpisode(
  episodeId: string,
  destinationType: string,
  userId: string,
  options?: FantasyMediaPublishExecutionOptions
): Promise<FantasyMediaPublishResult> {
  const normalizedDestination = destinationType.toLowerCase()

  if (!FANTASY_MEDIA_DESTINATIONS.includes(normalizedDestination as FantasyMediaDestinationType)) {
    const log = await prisma.fantasyMediaPublishLog.create({
      data: {
        episodeId,
        destinationType: normalizedDestination,
        status: "failed",
        responseMetadata: { reason: "unsupported_destination" },
      },
    })
    return {
      destinationType: normalizedDestination,
      status: "failed",
      publishId: log.id,
      message: "Unsupported publish destination",
    }
  }

  const episode = await prisma.fantasyMediaEpisode.findFirst({
    where: { id: episodeId, userId },
  })
  if (!episode) {
    return {
      destinationType: normalizedDestination,
      status: "failed",
      publishId: "",
      message: "Episode not found",
    }
  }

  if (episode.status !== "completed" || !episode.playbackUrl) {
    const log = await prisma.fantasyMediaPublishLog.create({
      data: {
        episodeId,
        destinationType: normalizedDestination,
        status: "failed",
        responseMetadata: { reason: "episode_not_ready", status: episode.status },
      },
    })
    return {
      destinationType: normalizedDestination,
      status: "failed",
      publishId: log.id,
      message: "Episode is not ready to publish yet",
    }
  }

  if (!isProviderConfigured()) {
    const log = await prisma.fantasyMediaPublishLog.create({
      data: {
        episodeId,
        destinationType: normalizedDestination,
        status: "provider_unavailable",
        responseMetadata: { reason: "provider_not_configured" },
      },
    })
    return {
      destinationType: normalizedDestination,
      status: "provider_unavailable",
      publishId: log.id,
      message: "Publishing provider not configured yet",
    }
  }

  const provider = getProviderForDestination(normalizedDestination as FantasyMediaDestinationType)
  if (!provider) {
    const log = await prisma.fantasyMediaPublishLog.create({
      data: {
        episodeId,
        destinationType: normalizedDestination,
        status: "failed",
        responseMetadata: { reason: "provider_not_found" },
      },
    })
    return {
      destinationType: normalizedDestination,
      status: "failed",
      publishId: log.id,
      message: "No provider registered for destination",
    }
  }

  if (!provider.isConfigured()) {
    const log = await prisma.fantasyMediaPublishLog.create({
      data: {
        episodeId,
        destinationType: normalizedDestination,
        status: "provider_unavailable",
        responseMetadata: {
          reason: "provider_not_configured",
          providerId: provider.id,
        },
      },
    })
    return {
      destinationType: normalizedDestination,
      status: "provider_unavailable",
      publishId: log.id,
      message: "Publishing provider credentials are not configured",
    }
  }

  const providerResult = await provider.publish({
    destinationType: normalizedDestination as FantasyMediaDestinationType,
    episodeId: episode.id,
    title: episode.title,
    playbackUrl: episode.playbackUrl,
    userId,
    onCredentialRefresh: options?.onProviderCredentialRefresh,
  })

  const log = await prisma.fantasyMediaPublishLog.create({
    data: {
      episodeId,
      destinationType: normalizedDestination,
      status: providerResult.status,
      responseMetadata: {
        providerId: provider.id,
        playbackUrl: episode.playbackUrl,
        ...(providerResult.responseMetadata ?? {}),
      },
    },
  })
  return {
    destinationType: normalizedDestination,
    status: providerResult.status,
    publishId: log.id,
    message: providerResult.message ?? "Publish requested",
  }
}

export async function getFantasyMediaPublishLogs(episodeId: string, userId: string) {
  const episode = await prisma.fantasyMediaEpisode.findFirst({
    where: { id: episodeId, userId },
    include: {
      publishLogs: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  })

  return episode?.publishLogs ?? []
}
