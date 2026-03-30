export type MonetizationSubscriptionSku =
  | "af_pro_monthly"
  | "af_pro_yearly"
  | "af_commissioner_monthly"
  | "af_commissioner_yearly"
  | "af_war_room_monthly"
  | "af_war_room_yearly"
  | "af_all_access_monthly"
  | "af_all_access_yearly"

export type MonetizationTokenPackSku =
  | "af_tokens_5"
  | "af_tokens_10"
  | "af_tokens_25"

export type MonetizationSku = MonetizationSubscriptionSku | MonetizationTokenPackSku

export type SubscriptionPlanFamily = "af_pro" | "af_commissioner" | "af_war_room" | "af_all_access"

export type MonetizationCatalogItem = {
  sku: MonetizationSku
  type: "subscription" | "token_pack"
  title: string
  description: string
  amountUsd: number
  currency: "usd"
  interval: "month" | "year" | null
  tokenAmount: number | null
  planFamily: SubscriptionPlanFamily | null
  stripePriceEnvVar: string
}

const CATALOG_ITEMS: readonly MonetizationCatalogItem[] = [
  {
    sku: "af_pro_monthly",
    type: "subscription",
    title: "AF Pro Monthly",
    description: "Player-specific AI features for active fantasy managers.",
    amountUsd: 9.99,
    currency: "usd",
    interval: "month",
    tokenAmount: null,
    planFamily: "af_pro",
    stripePriceEnvVar: "STRIPE_PRICE_AF_PRO_MONTHLY",
  },
  {
    sku: "af_pro_yearly",
    type: "subscription",
    title: "AF Pro Yearly",
    description: "Player-specific AI features for active fantasy managers.",
    amountUsd: 99.99,
    currency: "usd",
    interval: "year",
    tokenAmount: null,
    planFamily: "af_pro",
    stripePriceEnvVar: "STRIPE_PRICE_AF_PRO_YEARLY",
  },
  {
    sku: "af_commissioner_monthly",
    type: "subscription",
    title: "AF Commissioner Monthly",
    description: "League-specific commissioner tools and automation controls.",
    amountUsd: 4.99,
    currency: "usd",
    interval: "month",
    tokenAmount: null,
    planFamily: "af_commissioner",
    stripePriceEnvVar: "STRIPE_PRICE_AF_COMMISSIONER_MONTHLY",
  },
  {
    sku: "af_commissioner_yearly",
    type: "subscription",
    title: "AF Commissioner Yearly",
    description: "League-specific commissioner tools and automation controls.",
    amountUsd: 49.99,
    currency: "usd",
    interval: "year",
    tokenAmount: null,
    planFamily: "af_commissioner",
    stripePriceEnvVar: "STRIPE_PRICE_AF_COMMISSIONER_YEARLY",
  },
  {
    sku: "af_war_room_monthly",
    type: "subscription",
    title: "AF War Room Monthly",
    description: "Draft strategy and long-term planning tools for one user.",
    amountUsd: 9.99,
    currency: "usd",
    interval: "month",
    tokenAmount: null,
    planFamily: "af_war_room",
    stripePriceEnvVar: "STRIPE_PRICE_AF_WAR_ROOM_MONTHLY",
  },
  {
    sku: "af_war_room_yearly",
    type: "subscription",
    title: "AF War Room Yearly",
    description: "Draft strategy and long-term planning tools for one user.",
    amountUsd: 99.99,
    currency: "usd",
    interval: "year",
    tokenAmount: null,
    planFamily: "af_war_room",
    stripePriceEnvVar: "STRIPE_PRICE_AF_WAR_ROOM_YEARLY",
  },
  {
    sku: "af_all_access_monthly",
    type: "subscription",
    title: "AF All-Access Monthly",
    description: "AF Pro + AF Commissioner + AF War Room in one bundle.",
    amountUsd: 19.99,
    currency: "usd",
    interval: "month",
    tokenAmount: null,
    planFamily: "af_all_access",
    stripePriceEnvVar: "STRIPE_PRICE_AF_ALL_ACCESS_MONTHLY",
  },
  {
    sku: "af_all_access_yearly",
    type: "subscription",
    title: "AF All-Access Yearly",
    description: "AF Pro + AF Commissioner + AF War Room in one bundle.",
    amountUsd: 199.99,
    currency: "usd",
    interval: "year",
    tokenAmount: null,
    planFamily: "af_all_access",
    stripePriceEnvVar: "STRIPE_PRICE_AF_ALL_ACCESS_YEARLY",
  },
  {
    sku: "af_tokens_5",
    type: "token_pack",
    title: "AllFantasy AI Tokens (5)",
    description: "5 AI tokens for metered premium AI actions.",
    amountUsd: 4.99,
    currency: "usd",
    interval: null,
    tokenAmount: 5,
    planFamily: null,
    stripePriceEnvVar: "STRIPE_PRICE_AF_TOKENS_5",
  },
  {
    sku: "af_tokens_10",
    type: "token_pack",
    title: "AllFantasy AI Tokens (10)",
    description: "10 AI tokens for metered premium AI actions.",
    amountUsd: 8.99,
    currency: "usd",
    interval: null,
    tokenAmount: 10,
    planFamily: null,
    stripePriceEnvVar: "STRIPE_PRICE_AF_TOKENS_10",
  },
  {
    sku: "af_tokens_25",
    type: "token_pack",
    title: "AllFantasy AI Tokens (25)",
    description: "25 AI tokens for metered premium AI actions.",
    amountUsd: 19.99,
    currency: "usd",
    interval: null,
    tokenAmount: 25,
    planFamily: null,
    stripePriceEnvVar: "STRIPE_PRICE_AF_TOKENS_25",
  },
] as const

const CATALOG_BY_SKU = new Map<MonetizationSku, MonetizationCatalogItem>(
  CATALOG_ITEMS.map((item) => [item.sku, item])
)

export type MonetizationCatalog = {
  subscriptions: MonetizationCatalogItem[]
  tokenPacks: MonetizationCatalogItem[]
  all: MonetizationCatalogItem[]
}

export function getMonetizationCatalog(): MonetizationCatalog {
  const all = CATALOG_ITEMS.map((item) => ({ ...item }))
  return {
    subscriptions: all.filter((item) => item.type === "subscription"),
    tokenPacks: all.filter((item) => item.type === "token_pack"),
    all,
  }
}

export function getMonetizationCatalogItemBySku(sku: MonetizationSku): MonetizationCatalogItem | null {
  const found = CATALOG_BY_SKU.get(sku)
  return found ? { ...found } : null
}

export function getMonetizationStripePriceIdForSku(
  sku: MonetizationSku,
  env: NodeJS.ProcessEnv = process.env
): string | null {
  const item = CATALOG_BY_SKU.get(sku)
  if (!item) return null
  const value = env[item.stripePriceEnvVar]?.trim()
  return value && value.length > 0 ? value : null
}
