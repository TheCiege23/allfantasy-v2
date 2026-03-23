export type SocialProvider =
  | 'google'
  | 'apple'
  | 'facebook'
  | 'instagram'
  | 'x'
  | 'tiktok'

export function isSocialProviderEnabled(provider: SocialProvider): boolean {
  if (provider === 'google') return process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH === 'true'
  if (provider === 'apple') return process.env.NEXT_PUBLIC_ENABLE_APPLE_AUTH === 'true'
  return false
}

export function getSupportedSocialProviders(): SocialProvider[] {
  return ['google', 'apple', 'facebook', 'instagram', 'x', 'tiktok']
}
