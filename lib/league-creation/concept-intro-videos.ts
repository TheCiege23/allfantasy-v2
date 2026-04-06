/**
 * Optional welcome clips after creating a league. Set `NEXT_PUBLIC_LEAGUE_CONCEPT_VIDEO_BASE`
 * to a CDN base URL; files are expected at `{base}/{sport}.mp4` (lowercase sport).
 */
export function getConceptIntroVideoUrl(sport: string): string | undefined {
  const base = process.env.NEXT_PUBLIC_LEAGUE_CONCEPT_VIDEO_BASE?.replace(/\/$/, '')
  if (!base) return undefined
  const key = String(sport).trim().toLowerCase()
  if (!key) return undefined
  return `${base}/${key}.mp4`
}
