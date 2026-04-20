'use client'

/**
 * Commissioner league settings — tabbed control center (modal content).
 * Delegates to `LeagueSettingsControlCenter` for the full post-create settings surface.
 */

import { LeagueSettingsControlCenter } from '@/components/league-settings/LeagueSettingsControlCenter'
import type { SubPanelContext } from './LeagueSettingsSubPanels'

export function CommissionerLeagueSettingsShell({
  ctx,
  initialPanelId,
}: {
  ctx: SubPanelContext
  initialPanelId?: string | null
}) {
  return <LeagueSettingsControlCenter ctx={ctx} initialPanelId={initialPanelId} />
}
