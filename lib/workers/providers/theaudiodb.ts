/**
 * TheAudioDB integration for sports player → artist mapping.
 * Fetch and store audio metadata (artist bio, albums, images).
 * 
 * API: https://www.theaudiodb.com/api/v1/json/2/
 */

const THEAUDIODB_BASE = 'https://www.theaudiodb.com/api/v1/json/2'

export interface TheAudioDBSearchResult {
  artists?: Array<{
    idArtist: string
    strArtist: string
    strArtistImg?: string
    strBiographyEN?: string
    strCountry?: string
    strWebsite?: string
    strStyle?: string
    strGenre?: string
  }>
}

export interface AudioMetadataPayload {
  playerName: string
  sport: string
  artistId: string
  artistName: string
  biography?: string | null
  imageUrl?: string | null
  website?: string | null
  countryCode?: string | null
  genres?: string[]
  confidence: number
}

function getApiKey(): string {
  return process.env.THEAUDIODB_API_KEY?.trim() || '123'
}

/**
 * Search for an artist by name on TheAudioDB.
 * Returns first match or null if not found.
 */
export async function searchArtist(artistName: string): Promise<AudioMetadataPayload | null> {
  if (!artistName?.trim()) return null

  try {
    const url = `${THEAUDIODB_BASE}/search.php?s=${encodeURIComponent(artistName)}&apikey=${getApiKey()}`
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
    
    if (!res.ok) return null

    const data = (await res.json()) as TheAudioDBSearchResult
    const artist = data.artists?.[0]
    
    if (!artist) return null

    // Parse genres/styles
    const genres: string[] = []
    if (artist.strStyle) genres.push(...artist.strStyle.split(',').map(s => s.trim()))
    if (artist.strGenre) genres.push(...artist.strGenre.split(',').map(g => g.trim()))

    return {
      playerName: artistName,
      sport: 'UNKNOWN',
      artistId: artist.idArtist || '',
      artistName: artist.strArtist || '',
      biography: artist.strBiographyEN || null,
      imageUrl: artist.strArtistImg || null,
      website: artist.strWebsite || null,
      countryCode: artist.strCountry ? artist.strCountry.substring(0, 2) : null,
      genres: [...new Set(genres)], // deduplicate
      confidence: 0.8, // high confidence for exact match
    }
  } catch (err) {
    console.error('[theaudiodb] search failed:', err instanceof Error ? err.message : err)
    return null
  }
}

/**
 * Map a player name to an artist name.
 * Strategy: first + last name → artist search.
 * 
 * Examples:
 *   "Patrick Mahomes" → "Patrick Mahomes" (if artist exists)
 *   "Patrick Mahomes" → "Patrick" (first name fallback)
 *   "Patrick Mahomes" → "Mahomes" (last name fallback)
 */
export function playerNameToArtistGuesses(playerName: string): string[] {
  const parts = playerName.trim().split(/\s+/)
  if (!parts.length) return []

  const guesses: string[] = []
  
  // Full name first
  if (parts.length >= 2) {
    guesses.push(playerName.trim())
  }

  // First name
  if (parts[0]) guesses.push(parts[0])

  // Last name
  if (parts[parts.length - 1]) guesses.push(parts[parts.length - 1])

  // Remove duplicates while preserving order
  return [...new Set(guesses)]
}

/**
 * Attempt to find artist metadata for a player.
 * Tries multiple name variations (full, first, last).
 */
export async function matchPlayerToArtist(
  playerName: string,
  sport: string
): Promise<AudioMetadataPayload | null> {
  const guesses = playerNameToArtistGuesses(playerName)

  for (const guess of guesses) {
    try {
      const result = await searchArtist(guess)
      if (result) {
        return {
          ...result,
          playerName,
          sport,
          confidence: guesses[0] === guess ? 0.9 : 0.6, // higher confidence for full name match
        }
      }
    } catch (err) {
      // Continue to next guess
    }
  }

  return null
}
