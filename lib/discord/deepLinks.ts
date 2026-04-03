/** Open Discord to a guild channel in the client or web. */
export function channelLink(guildId: string, channelId: string): string {
  return `https://discord.com/channels/${guildId}/${channelId}`
}

/** Open a user's Discord profile (best-effort; works in web client). */
export function userProfileLink(discordUserId: string): string {
  return `https://discord.com/users/${discordUserId}`
}

/** Same as profile — DMs cannot be opened programmatically. */
export function dmLink(discordUserId: string): string {
  return userProfileLink(discordUserId)
}
