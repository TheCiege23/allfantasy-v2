/**
 * Single source for “flat roster slot labels” used in need-based AI / autopick on the server.
 * Prefer league effective template (same as pool + pick validation); fall back to sport defaults only when needed.
 */

import { getLeagueDraftTemplatePayload, orderedSlotLabelsFromTemplate } from '@/lib/league/league-draft-template-payload'
import { getDefaultRosterSlotsForSport } from './SportDraftUIResolver'

export async function getRosterSlotLabelsForLeagueDraft(
  leagueId: string,
  sportFallback: string,
): Promise<string[]> {
  const payload = await getLeagueDraftTemplatePayload(leagueId).catch(() => null)
  if (payload?.template) {
    const labels = orderedSlotLabelsFromTemplate(payload.template)
    if (labels.length > 0) return labels
  }
  return getDefaultRosterSlotsForSport(sportFallback)
}
