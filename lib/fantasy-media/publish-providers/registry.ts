import type { FantasyMediaDestinationType } from "./destinations"
import type { FantasyMediaPublishProvider } from "./types"
import { XPublishProvider } from "./XPublishProvider"
import { YouTubePublishProvider } from "./YouTubePublishProvider"
import { GenericSocialPublishProvider } from "./GenericSocialPublishProvider"

let providerCache: FantasyMediaPublishProvider[] | null = null

export function getFantasyMediaPublishProviders(): FantasyMediaPublishProvider[] {
  if (providerCache) return providerCache
  providerCache = [
    new XPublishProvider(),
    new YouTubePublishProvider(),
    new GenericSocialPublishProvider(),
  ]
  return providerCache
}

export function getProviderForDestination(
  destinationType: FantasyMediaDestinationType
): FantasyMediaPublishProvider | null {
  const providers = getFantasyMediaPublishProviders()
  return providers.find((provider) => provider.supports(destinationType)) ?? null
}

export function resetPublishProviderCacheForTests() {
  providerCache = null
}
