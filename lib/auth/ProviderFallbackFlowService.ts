import type { SocialProvider } from '@/lib/auth/SocialProviderResolver'

const PROVIDER_FALLBACK_MESSAGES: Record<SocialProvider, string> = {
  google:
    'Google sign-in is not configured for this environment. It will appear here when enabled.',
  apple:
    'Apple sign-in is not configured for this environment. It will appear here when enabled.',
  facebook:
    'Facebook sign-in is planned. Follow updates for when it is available.',
  instagram:
    'Instagram sign-in is planned. Follow updates for when it is available.',
  x: 'X sign-in is planned. Follow updates for when it is available.',
  tiktok: 'TikTok sign-in is planned. Follow updates for when it is available.',
}

export function getProviderFallbackMessage(provider: SocialProvider): string {
  return PROVIDER_FALLBACK_MESSAGES[provider]
}

export function getProviderDisplayName(provider: SocialProvider): string {
  const map: Record<SocialProvider, string> = {
    google: 'Google',
    apple: 'Apple',
    facebook: 'Facebook',
    instagram: 'Instagram',
    x: 'X',
    tiktok: 'TikTok',
  }
  return map[provider]
}
