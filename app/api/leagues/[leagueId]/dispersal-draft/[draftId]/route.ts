/**
 * GET: Full dispersal draft state (same payload as `/state`).
 * Alias for clients that expect REST-style `/dispersal-draft/[draftId]`.
 */
export const dynamic = 'force-dynamic'
export { GET } from './state/route'
