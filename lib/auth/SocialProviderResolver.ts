export type SocialProvider =
  | 'google'
  | 'spotify'
  | 'apple'
  | 'facebook'
  | 'instagram'
  | 'x'
  | 'tiktok'
  | 'discord'

export function isSocialProviderEnabled(provider: SocialProvider): boolean {
  if (provider === 'google') {
    // Accept either the explicit public flag OR (server-side) the presence of credentials.
    // On the client, GOOGLE_CLIENT_ID is not exposed, so the flag is the only signal.
    return (
      process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH === 'true' ||
      !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
    )
  }
  if (provider === 'spotify') {
    return !!(process.env.NEXT_PUBLIC_ENABLE_SPOTIFY_AUTH === 'true' || (process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET))
  }
  if (provider === 'apple') return process.env.NEXT_PUBLIC_ENABLE_APPLE_AUTH === 'true'
  if (provider === 'facebook') {
    // Accept the explicit public flag OR (server-side) the presence of credentials.
    return (
      process.env.NEXT_PUBLIC_ENABLE_FACEBOOK_AUTH === 'true' ||
      !!(process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET)
    )
  }
  if (provider === 'x') {
    // No NextAuth provider is wired for X/Twitter yet (lib/auth.ts has no
    // TwitterProvider). This flag exists so callers can flip it on the moment
    // a real provider lands, same forward-compat shape as facebook/spotify.
    return process.env.NEXT_PUBLIC_ENABLE_X_AUTH === 'true'
  }
  if (provider === 'discord') {
    // No NextAuth provider is wired for Discord yet (lib/auth.ts has no
    // DiscordProvider) — Discord only exists elsewhere for unrelated league
    // integrations. Same forward-compat shape as 'x' above.
    return process.env.NEXT_PUBLIC_ENABLE_DISCORD_AUTH === 'true'
  }
  return false
}

export function getSupportedSocialProviders(): SocialProvider[] {
  return ['google', 'spotify', 'apple', 'facebook', 'instagram', 'x', 'tiktok', 'discord']
}
