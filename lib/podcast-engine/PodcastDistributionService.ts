import { prisma } from "@/lib/prisma"
import type { PodcastEpisodeRecord } from "./types"

/**
 * Create and retrieve podcast episodes; provide playback and share URLs.
 */
export async function createEpisode(params: {
  userId: string
  title: string
  script: string
  audioUrl?: string | null
  durationSeconds?: number | null
}): Promise<PodcastEpisodeRecord | null> {
  try {
    const row = await (prisma as any).podcastEpisode.create({
      data: {
        userId: params.userId,
        title: params.title,
        script: params.script,
        audioUrl: params.audioUrl ?? null,
        durationSeconds: params.durationSeconds ?? null,
      },
    })
    return mapRow(row)
  } catch (e) {
    console.error("[PodcastDistributionService] createEpisode error:", e)
    return null
  }
}

export async function getEpisode(episodeId: string, userId: string): Promise<PodcastEpisodeRecord | null> {
  const row = await (prisma as any).podcastEpisode.findFirst({
    where: { id: episodeId, userId },
  })
  return row ? mapRow(row) : null
}

export async function listEpisodes(userId: string, limit = 20): Promise<PodcastEpisodeRecord[]> {
  const rows = await (prisma as any).podcastEpisode.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  })
  return rows.map(mapRow)
}

/**
 * Playback URL: audio URL if present, otherwise client uses script + SpeechSynthesis.
 */
export function getPlaybackUrl(episode: PodcastEpisodeRecord): string | null {
  return episode.audioUrl ?? null
}

/**
 * Share URL for the episode (public or authenticated page).
 */
export function getShareUrl(episodeId: string, baseUrl: string): string {
  const trimmed = baseUrl.trim()
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    const url = new URL(withProtocol)
    url.pathname = `/podcast/${episodeId}`
    url.search = ""
    url.hash = ""
    return url.toString()
  } catch {
    return `https://allfantasy.ai/podcast/${episodeId}`
  }
}

function mapRow(row: any): PodcastEpisodeRecord {
  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    script: row.script,
    audioUrl: row.audioUrl ?? null,
    durationSeconds: row.durationSeconds ?? null,
    createdAt: row.createdAt,
  }
}
