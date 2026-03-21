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
  const hasAdvanced = draftType === 'snake' // third-round reversal only for snake
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
            <SelectTrigger
              className="mt-1.5 bg-gray-900 border-white/20 text-white min-h-[44px]"
              title="Total draft rounds; 15–18 is typical for redraft"
              aria-label="Draft rounds"
            >
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
            <SelectTrigger
              className="mt-1.5 bg-gray-900 border-white/20 text-white min-h-[44px]"
              title="0 = no timer (slow draft); 90s is common for live"
              aria-label="Draft timer per pick"
            >
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
        {leagueType === 'c2c' && (
          <>
            <div className="pt-3 mt-3 border-t border-white/10">
              <p className="text-sm font-medium text-cyan-200">C2C / Merged Devy settings</p>
              <p className="text-xs text-white/50 mt-0.5">C2C links your college and pro pipeline in one dynasty ecosystem.</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/90">Startup mode</Label>
              <Select
                value={d.c2cStartupMode ?? 'merged'}
                onValueChange={(v: 'merged' | 'separate') => onDraftSettingsChange({ c2cStartupMode: v })}
              >
                <SelectTrigger className="mt-1.5 bg-gray-900 border-white/20 text-white min-h-[44px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="merged">Merged startup (pro + college in one draft)</SelectItem>
                  <SelectItem value="separate">Separate (pro draft then college draft)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/90">Standings mode</Label>
              <Select
                value={d.c2cStandingsModel ?? 'unified'}
                onValueChange={(v: 'unified' | 'separate' | 'hybrid') => onDraftSettingsChange({ c2cStandingsModel: v })}
              >
                <SelectTrigger className="mt-1.5 bg-gray-900 border-white/20 text-white min-h-[44px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unified">Unified standings only</SelectItem>
                  <SelectItem value="separate">Separate college + pro standings</SelectItem>
                  <SelectItem value="hybrid">Hybrid championship</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm text-white/80">
                <input
                  type="checkbox"
                  checked={d.c2cBestBallPro ?? true}
                  onChange={(e) => onDraftSettingsChange({ c2cBestBallPro: e.target.checked })}
                  className="rounded border-white/20"
                />
                Best ball (pro)
              </label>
              <label className="flex items-center gap-2 text-sm text-white/80">
                <input
                  type="checkbox"
                  checked={d.c2cBestBallCollege ?? false}
                  onChange={(e) => onDraftSettingsChange({ c2cBestBallCollege: e.target.checked })}
                  className="rounded border-white/20"
                />
                Best ball (college)
              </label>
            </div>
            <p className="text-xs text-white/50">Best Ball auto-optimizes your highest scoring legal lineup for each enabled competition. College assets score only on the college side until promotion.</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-white/90">College roster size</Label>
                <Select
                  value={String(d.c2cCollegeRosterSize ?? 20)}
                  onValueChange={(v) => onDraftSettingsChange({ c2cCollegeRosterSize: Number(v) })}
                >
                  <SelectTrigger className="mt-1.5 bg-gray-900 border-white/20 text-white min-h-[44px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[12, 15, 18, 20, 24, 28, 30].map((n) => (
                      <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-white/90">Rookie draft rounds</Label>
                <Select
                  value={String(d.c2cRookieDraftRounds ?? 4)}
                  onValueChange={(v) => onDraftSettingsChange({ c2cRookieDraftRounds: Number(v) })}
                >
                  <SelectTrigger className="mt-1.5 bg-gray-900 border-white/20 text-white min-h-[44px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[3, 4, 5, 6].map((n) => (
                      <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-white/90">College draft rounds</Label>
                <Select
                  value={String(d.c2cCollegeDraftRounds ?? 6)}
                  onValueChange={(v) => onDraftSettingsChange({ c2cCollegeDraftRounds: Number(v) })}
                >
                  <SelectTrigger className="mt-1.5 bg-gray-900 border-white/20 text-white min-h-[44px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[4, 5, 6, 7, 8].map((n) => (
                      <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </>
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
            {showAdvanced && draftType === 'snake' && (
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
                    <p className="text-xs text-white/50 mt-0.5">Snake order reverses again in round 3. Only applies to snake draft; not used for linear or auction.</p>
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
