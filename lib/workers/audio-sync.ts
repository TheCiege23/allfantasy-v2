/**
 * Sync TheAudioDB artist metadata for sports players.
 * Fetches audio data and stores in database.
 */

import { prisma } from '@/lib/prisma'
import { matchPlayerToArtist, type AudioMetadataPayload } from '@/lib/workers/providers/theaudiodb'

export interface SyncResult {
  ok: boolean
  sport: string
  attempted: number
  synced: number
  errors: string[]
}

/**
 * Sync audio metadata for a specific sport.
 * Fetches players, matches to artists, stores metadata.
 */
export async function syncAudioMetadataForSport(sport: string): Promise<SyncResult> {
  const normalizedSport = sport.toUpperCase()
  const errors: string[] = []
  let attempted = 0
  let synced = 0

  try {
    const alreadySynced = await prisma.audioMetadata.findMany({
      where: { sport: normalizedSport },
      select: { playerName: true },
    })
    const skipNames = new Set(alreadySynced.map((r) => r.playerName))

    const candidates = await prisma.sportsPlayer.findMany({
      where: { sport: normalizedSport },
      select: { name: true },
      take: 200,
      distinct: ['name'],
    })
    const players = candidates.filter((p) => !skipNames.has(p.name)).slice(0, 50)

    if (!players.length) {
      return { ok: true, sport: normalizedSport, attempted: 0, synced: 0, errors: [] }
    }

    // Match each player to an artist
    for (const player of players) {
      attempted++

      try {
        const metadata = await matchPlayerToArtist(player.name, normalizedSport)
        
        if (metadata) {
          await prisma.audioMetadata.upsert({
            where: {
              uniq_audio_metadata_player_sport: {
                playerName: player.name,
                sport: normalizedSport,
              },
            },
            update: {
              artistId: metadata.artistId,
              artistName: metadata.artistName,
              biography: metadata.biography,
              imageUrl: metadata.imageUrl,
              website: metadata.website,
              countryCode: metadata.countryCode,
              genres: metadata.genres,
              confidence: metadata.confidence,
              lastSyncedAt: new Date(),
            },
            create: {
              playerName: metadata.playerName,
              sport: metadata.sport,
              artistId: metadata.artistId,
              artistName: metadata.artistName,
              biography: metadata.biography,
              imageUrl: metadata.imageUrl,
              website: metadata.website,
              countryCode: metadata.countryCode,
              genres: metadata.genres,
              confidence: metadata.confidence,
              source: 'theaudiodb',
            },
          })
          synced += 1
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        errors.push(`${player.name}: ${msg}`)
        console.error('[audio-sync] player error:', msg)
      }

      // Rate limit: small delay between requests
      await new Promise((r) => setTimeout(r, 200))
    }

    return { ok: true, sport: normalizedSport, attempted, synced, errors }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    errors.push(msg)
    console.error('[audio-sync] fatal error:', msg)
    return { ok: false, sport: normalizedSport, attempted, synced, errors }
  }
}

/**
 * Sync audio metadata for all sports.
 */
export async function syncAllAudioMetadata(): Promise<SyncResult[]> {
  const sports = ['NFL', 'NBA', 'MLB', 'NHL', 'NCAAF', 'NCAAB', 'SOCCER']
  
  const results = await Promise.all(
    sports.map((sport) => syncAudioMetadataForSport(sport))
  )

  console.log('[audio-sync] completed', {
    totalSports: sports.length,
    results: results.map((r) => ({ sport: r.sport, synced: r.synced, errors: r.errors.length })),
  })

  return results
}

/**
 * Get audio metadata for a player.
 */
export async function getAudioMetadata(
  playerName: string,
  sport: string
) {
  return prisma.audioMetadata.findUnique({
    where: {
      uniq_audio_metadata_player_sport: {
        playerName,
        sport: sport.toUpperCase(),
      },
    },
  })
}

/**
 * Get audio metadata for multiple players.
 */
export async function getAudioMetadataBatch(
  players: Array<{ name: string; sport?: string }>
) {
  const results = new Map()

  for (const player of players) {
    const metadata = await getAudioMetadata(player.name, player.sport || 'NFL')
    if (metadata) {
      results.set(player.name, metadata)
    }
  }

  return results
}
