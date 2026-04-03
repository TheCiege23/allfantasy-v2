/**
 * Avatar URL for dashboard profile strip: NextAuth image, DB avatar, or Sleeper hash → CDN.
 */
export function resolveDashboardAvatarUrl(
  sessionImage: string | null | undefined,
  dbAvatarUrl: string | null | undefined,
): string | undefined {
  const raw = (sessionImage?.trim() || dbAvatarUrl?.trim()) ?? ''
  if (!raw) return undefined
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw
  return `https://sleepercdn.com/avatars/${raw}`
}
