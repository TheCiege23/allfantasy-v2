'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { isKeeperLeagueType } from '@/lib/league-creation-wizard/league-type-registry'
import type { DraftTypeId, LeagueTypeId, WizardDraftSettings } from '@/lib/league-creation-wizard/types'
import { StepHeader } from './StepHelp'
import { cn } from '@/lib/utils'

const ROUNDS = [10, 12, 15, 18, 20, 22, 25, 30] as const
const TIMER_OPTS = [60, 90, 120, 180, 300, 0] as const

export type DraftSettingsPanelProps = {
  leagueType: LeagueTypeId
  draftType: DraftTypeId
  draftSettings: WizardDraftSettings
  onDraftSettingsChange: (patch: Partial<WizardDraftSettings>) => void
}

/**
 * Draft rounds, timer, and variant-specific options (auction budget, keeper max). Primary options first; advanced collapsed.
 */
export function DraftSettingsPanel({
  leagueType,
  draftType,
  draftSettings,
  onDraftSettingsChange,
}: DraftSettingsPanelProps) {
  const d = draftSettings
  const isAuction = draftType === 'auction'
  const showKeeper = isKeeperLeagueType(leagueType)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const hasAdvanced = true // third-round reversal
  return (
    <div className="space-y-5">
      <StepHeader
        title="Draft settings"
        description="Set rounds and per-pick timer. These apply when you start the draft from the draft room. Good defaults are below."
        help={
          <>
            Rounds = total players per team (e.g. 15 for 15 rounds). Timer = seconds per pick in a live draft; use &quot;No timer&quot; for slow drafts.
          </>
        }
        helpTitle="Draft settings explained"
      />
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-white/90">Rounds</Label>
          <Select value={String(d.rounds)} onValueChange={(v) => onDraftSettingsChange({ rounds: Number(v) })}>
            <SelectTrigger className="mt-1.5 bg-gray-900 border-white/20 text-white min-h-[44px]" title="Total draft rounds; 15–18 is typical for redraft">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROUNDS.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-1 text-xs text-white/50">Total draft rounds. Typical redraft: 15–18.</p>
        </div>
        <div className="space-y-1.5">
          <Label className="text-white/90">Timer per pick (seconds)</Label>
          <Select
            value={d.timerSeconds != null ? String(d.timerSeconds) : '90'}
            onValueChange={(v) => onDraftSettingsChange({ timerSeconds: v === '0' ? 0 : Number(v) })}
          >
            <SelectTrigger className="mt-1.5 bg-gray-900 border-white/20 text-white min-h-[44px]" title="0 = no timer (slow draft); 90s is common for live">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMER_OPTS.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n === 0 ? 'No timer' : `${n} seconds`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-1 text-xs text-white/50">Use 0 for no timer (slow draft). 90s is common for live drafts.</p>
        </div>
        {isAuction && (
          <div className="space-y-1.5">
            <Label className="text-white/90">Auction budget per team</Label>
            <Select
              value={String(d.auctionBudgetPerTeam ?? 200)}
              onValueChange={(v) => onDraftSettingsChange({ auctionBudgetPerTeam: Number(v) })}
            >
              <SelectTrigger className="mt-1.5 bg-gray-900 border-white/20 text-white min-h-[44px]" title="Starting budget for each team in auction">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[100, 200, 250, 300].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    ${n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-white/50">Starting budget for each team in auction drafts.</p>
          </div>
        )}
        {showKeeper && (
          <div className="space-y-1.5">
            <Label className="text-white/90">Max keepers</Label>
            <Select
              value={String(d.keeperMaxKeepers ?? 3)}
              onValueChange={(v) => onDraftSettingsChange({ keeperMaxKeepers: Number(v) })}
            >
              <SelectTrigger className="mt-1.5 bg-gray-900 border-white/20 text-white min-h-[44px]" title="Max players each team can keep (keeper leagues)">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-white/50">Maximum number of players each team can keep (keeper leagues).</p>
          </div>
        )}
        {hasAdvanced && (
          <div className="pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="flex items-center gap-2 text-sm text-white/70 hover:text-white/90 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 rounded px-1 py-0.5"
              aria-expanded={showAdvanced}
            >
              {showAdvanced ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
              Advanced options
            </button>
            {showAdvanced && (
              <div className={cn('mt-3 space-y-3 pl-6 border-l-2 border-white/10')}>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={d.thirdRoundReversal ?? false}
                    onChange={(e) => onDraftSettingsChange({ thirdRoundReversal: e.target.checked })}
                    className="mt-1 rounded border-white/30 bg-gray-900 shrink-0"
                    title="Snake order reverses again in round 3 (1-12, 12-1, 12-1...)"
                  />
                  <div>
                    <span className="text-sm font-medium text-white/90">Third round reversal</span>
                    <p className="text-xs text-white/50 mt-0.5">Snake order reverses again in round 3. Balances pick value in snake drafts.</p>
                  </div>
                </label>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
