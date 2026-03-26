import type { SocialPlatform } from "./types"

const PLATFORM_ENV_KEYS: Record<SocialPlatform, string[]> = {
  x: ["X_PUBLISH_ACCESS_TOKEN", "X_PUBLISH_API_KEY"],
  instagram: [
    "INSTAGRAM_PUBLISH_ACCESS_TOKEN",
    "SOCIAL_PUBLISH_TOKEN",
    "INSTAGRAM_BUSINESS_ACCOUNT_ID",
  ],
  tiktok: ["TIKTOK_PUBLISH_ACCESS_TOKEN", "SOCIAL_PUBLISH_TOKEN"],
  facebook: ["FACEBOOK_PUBLISH_ACCESS_TOKEN", "SOCIAL_PUBLISH_TOKEN", "FACEBOOK_PAGE_ID"],
}

export function isSocialProviderConfigured(platform: SocialPlatform): boolean {
  const envKeys = PLATFORM_ENV_KEYS[platform] ?? []
  return envKeys.some((key) => {
    const value = process.env[key]
    return typeof value === "string" && value.trim().length > 0
  })
}

export function getSocialProviderConfigStatus(): Record<SocialPlatform, boolean> {
  return {
    x: isSocialProviderConfigured("x"),
    instagram: isSocialProviderConfigured("instagram"),
    tiktok: isSocialProviderConfigured("tiktok"),
    facebook: isSocialProviderConfigured("facebook"),
  }
}

export function getSocialProviderEnvKeys(platform: SocialPlatform): string[] {
  return [...(PLATFORM_ENV_KEYS[platform] ?? [])]
}
