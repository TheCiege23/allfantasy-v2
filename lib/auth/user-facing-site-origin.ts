/**
 * Canonical production origin for links in transactional emails.
 * Avoids Vercel preview URLs (NEXTAUTH_URL / VERCEL_URL) in user inboxes.
 * Resolved at module load from env via `getPublicSiteOrigin()` (see lib/site-public-origin.ts).
 */
import { getPublicSiteOrigin } from "@/lib/site-public-origin"

export const USER_FACING_SITE_ORIGIN: string = getPublicSiteOrigin()
