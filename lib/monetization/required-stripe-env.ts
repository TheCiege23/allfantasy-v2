import { getMonetizationCatalog } from '@/lib/monetization/catalog'
import { getStripeCheckoutLinkRegistry } from '@/lib/monetization/StripeCheckoutLinkRegistry'

/**
 * Single source of truth for which `process.env` keys the monetization layer expects.
 * Keep `.env` / hosting secrets aligned with `getMonetizationCatalog()` + Payment Link registry.
 */
export function getRequiredStripeEnvKeys(): {
  priceEnvVars: string[]
  checkoutLinkEnvVars: string[]
  skuByPriceEnvVar: Record<string, string>
  skuByCheckoutEnvVar: Record<string, string>
} {
  const catalog = getMonetizationCatalog()
  const priceEnvVars = catalog.all.map((i) => i.stripePriceEnvVar)
  const skuByPriceEnvVar = Object.fromEntries(catalog.all.map((i) => [i.stripePriceEnvVar, i.sku]))

  const registry = getStripeCheckoutLinkRegistry()
  const checkoutLinkEnvVars = registry.map((e) => e.checkoutLinkEnvVar)
  const skuByCheckoutEnvVar = Object.fromEntries(registry.map((e) => [e.checkoutLinkEnvVar, e.sku]))

  return { priceEnvVars, checkoutLinkEnvVars, skuByPriceEnvVar, skuByCheckoutEnvVar }
}
