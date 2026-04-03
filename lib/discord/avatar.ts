/** Discord CDN avatar URL from user id + optional avatar hash (OAuth `@me`). */
export function discordAvatarUrl(userId: string, hash: string | null | undefined): string {
  if (hash) {
    return `https://cdn.discordapp.com/avatars/${userId}/${hash}.png?size=128`
  }
  const defaultIndex = Number(BigInt(userId) % 5n)
  return `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`
}
