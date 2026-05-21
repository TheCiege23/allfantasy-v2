/**
 * Single public HTTPS origin for SEO metadata, emails, and canonical host redirects.
 * Prefer NEXT_PUBLIC_SITE_URL / PUBLIC_SITE_URL / NEXT_PUBLIC_APP_URL / NEXTAUTH_URL in production; default www.
 */

export const DEFAULT_PUBLIC_SITE_ORIGIN = "https://www.allfantasy.ai"

export function normalizeBaseUrl(value?: string | null): string {
  const raw = String(value ?? "").trim()

  if (!raw || raw === "https://" || raw === "http://") {
    return DEFAULT_PUBLIC_SITE_ORIGIN
  }

  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`

  try {
    const parsed = new URL(candidate)
    if (!parsed.hostname || (parsed.protocol !== "http:" && parsed.protocol !== "https:")) {
      return DEFAULT_PUBLIC_SITE_ORIGIN
    }
    return parsed.origin
  } catch {
    return DEFAULT_PUBLIC_SITE_ORIGIN
  }
}

/**
 * Returns origin only, e.g. `https://www.allfantasy.ai` (no trailing slash).
 */
export function getPublicSiteOrigin(): string {
  const raw =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
        process.env.PUBLIC_SITE_URL?.trim() ||
        process.env.NEXT_PUBLIC_APP_URL?.trim() ||
        process.env.NEXT_PUBLIC_APP_DOMAIN?.trim() ||
        process.env.NEXTAUTH_URL?.trim() ||
        process.env.APP_URL?.trim() ||
        process.env.SITE_URL?.trim() ||
        process.env.RAILWAY_PUBLIC_DOMAIN?.trim() ||
        process.env.VERCEL_URL?.trim() ||
        ""
      : ""
  return normalizeBaseUrl(raw)
}

export function getPublicSiteHostname(): string {
  try {
    return new URL(getPublicSiteOrigin()).hostname.toLowerCase()
  } catch {
    return "www.allfantasy.ai"
  }
}
