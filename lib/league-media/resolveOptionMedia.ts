import { getConceptIntroVideoUrl } from '@/lib/league-creation/concept-intro-videos'

/**
 * Returns true if the URL looks like a video resource we should try in a <video> element.
 */
export function shouldAttemptVideo(url: string | null | undefined): boolean {
  if (url == null) return false
  const u = String(url).trim()
  if (!u) return false
  if (/\.(mp4|webm|ogg)(\?|#|$)/i.test(u)) return true
  if (u.startsWith('http://') || u.startsWith('https://')) return true
  return false
}

/**
 * Sport tiles: optional CDN concept clip (`NEXT_PUBLIC_LEAGUE_CONCEPT_VIDEO_BASE/{sport}.mp4`) overrides local public MP4.
 */
export function getSportSelectionVideoUrl(sport: string, localRelativeMp4: string): string | undefined {
  const fromEnv = getConceptIntroVideoUrl(sport)
  if (fromEnv && shouldAttemptVideo(fromEnv)) return fromEnv
  if (shouldAttemptVideo(localRelativeMp4)) return localRelativeMp4
  return undefined
}
