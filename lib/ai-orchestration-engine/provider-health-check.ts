/**
 * ProviderHealthCheck — async health and availability for AI providers.
 * Used by status API and admin; no secrets exposed. Supported sports: NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER.
 */

import type { AIModelRole } from '@/lib/unified-ai/types'
import { checkProviderAvailability } from '@/lib/ai-orchestration/provider-registry'
import { getProvider } from '@/lib/ai-orchestration/provider-registry'
import { sanitizeProviderError } from '@/lib/ai-orchestration/provider-utils'

export interface ProviderHealthEntry {
  role: AIModelRole
  available: boolean
  healthy?: boolean
  error?: string
}

/**
 * Synchronous availability check (has key / configured). No network call.
 */
export function getProviderAvailability(): Record<AIModelRole, boolean> {
  return checkProviderAvailability()
}

/**
 * Run optional healthCheck on each provider if implemented. Returns availability + optional healthy.
 * Use for /api/ai/providers/status or admin dashboards.
 */
export async function runProviderHealthCheck(): Promise<ProviderHealthEntry[]> {
  const availability = checkProviderAvailability()
  const roles: AIModelRole[] = ['openai', 'deepseek', 'grok']
  const entries: ProviderHealthEntry[] = []

  for (const role of roles) {
    const client = getProvider(role)
    const available = availability[role]
    let healthy: boolean | undefined
    let error: string | undefined
    if (client.healthCheck && available) {
      try {
        healthy = await client.healthCheck()
      } catch (e) {
        healthy = false
        error = sanitizeProviderError(e instanceof Error ? e.message : String(e))
      }
    } else if (available) {
      healthy = true
    }
    entries.push({ role, available, healthy, error })
  }
  return entries
}
