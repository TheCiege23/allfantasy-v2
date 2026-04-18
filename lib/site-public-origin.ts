/**
 * Single public HTTPS origin for SEO metadata, emails, and canonical host redirects.
 * Prefer NEXT_PUBLIC_SITE_URL / PUBLIC_SITE_URL / NEXT_PUBLIC_APP_URL / NEXTAUTH_URL in production; default www.
 */

const DEFAULT_ORIGIN = "https://www.allfantasy.ai"

/**
 * Returns origin only, e.g. `https://www.allfantasy.ai` (no trailing slash).
 */
export function getPublicSiteOrigin(): string {
  const raw =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
        process.env.PUBLIC_SITE_URL?.trim() ||
        process.env.NEXT_PUBLIC_APP_URL?.trim() ||
        process.env.NEXTAUTH_URL?.trim() ||
        ""
      : ""
  if (!raw) return DEFAULT_ORIGIN
  try {
    const u = new URL(raw)
    if (u.protocol !== "http:" && u.protocol !== "https:") return DEFAULT_ORIGIN
    return `${u.protocol}//${u.host}`
  } catch {
    return DEFAULT_ORIGIN
  }
}

export function getPublicSiteHostname(): string {
  try {
    return new URL(getPublicSiteOrigin()).hostname.toLowerCase()
  } catch {
    return "www.allfantasy.ai"
  }
}
