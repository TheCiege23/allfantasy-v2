'use client'

import { RosterSettingsEditor } from '@/components/league-settings/RosterSettingsEditor'
import type { LeagueSettingsTabProps } from '../league-settings-tabs-types'

export function RostersTab({ ctx }: LeagueSettingsTabProps) {
  return (
    <div className="space-y-3">
      <p className="text-[12px] text-white/45">
        Roster slots and templates are saved from this panel using the roster API (auto-save on apply).
      </p>
      <RosterSettingsEditor leagueId={ctx.league.id} />
    </div>
  )
}
