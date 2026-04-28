export type SocialProvider =
  | 'google'
  | 'spotify'
  | 'apple'
  | 'facebook'
  | 'instagram'
  | 'x'
  | 'tiktok'

export function isSocialProviderEnabled(provider: SocialProvider): boolean {
  if (provider === 'google') return process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH === 'true'
  if (provider === 'spotify') {
    return !!(process.env.NEXT_PUBLIC_ENABLE_SPOTIFY_AUTH === 'true' || (process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET))
  }
  if (provider === 'apple') return process.env.NEXT_PUBLIC_ENABLE_APPLE_AUTH === 'true'
  return false
}

export function getSupportedSocialProviders(): SocialProvider[] {
  return ['google', 'spotify', 'apple', 'facebook', 'instagram', 'x', 'tiktok']
}
