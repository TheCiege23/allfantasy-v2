/**
 * Canonical production origin for links in transactional emails.
 * Avoids Vercel preview URLs (NEXTAUTH_URL / VERCEL_URL) in user inboxes.
 */
export const USER_FACING_SITE_ORIGIN = "https://www.allfantasy.ai" as const
