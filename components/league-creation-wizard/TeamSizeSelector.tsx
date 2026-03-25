'use client'

import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { StepHeader } from './StepHelp'

const TEAM_COUNTS = [4, 6, 8, 10, 12, 14, 16, 18, 20, 24] as const
const ROSTER_SIZES = [10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30] as const

export type TeamSizeSelectorProps = {
  name: string
  teamCount: number
  rosterSize: number | null
  tradeReviewMode: 'none' | 'commissioner' | 'league_vote' | 'instant'
  onNameChange: (name: string) => void
  onTeamCountChange: (n: number) => void
  onRosterSizeChange: (n: number | null) => void
  onTradeReviewModeChange: (mode: 'none' | 'commissioner' | 'league_vote' | 'instant') => void
}

/**
 * League name, number of teams, and optional roster size.
 */
export function TeamSizeSelector({
  name,
  teamCount,
  rosterSize,
  tradeReviewMode,
  onNameChange,
  onTeamCountChange,
  onRosterSizeChange,
  onTradeReviewModeChange,
}: TeamSizeSelectorProps) {
  const safeTeamCount = teamCount >= 4 && teamCount <= 24 ? teamCount : 12
  return (
    <div className="space-y-6">
      <h3 className="sr-only">Team setup</h3>
      <StepHeader
        title="Name your league"
        description="Don't worry. You will be able to change this later."
        help={
          <>
            Roster size is usually set by your scoring preset (e.g. PPR). Override it here only if you need a custom number of bench or total spots.
          </>
        }
        helpTitle="Roster size"
      />
      <div className="space-y-5">
        <div className="space-y-1.5">
          <Label className="text-cyan-300">League Name</Label>
          <Input
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="e.g. My League"
            className="mt-1.5 min-h-[48px] rounded-none border-0 border-b border-cyan-300/65 bg-transparent px-1 text-lg text-white placeholder:text-white/35 focus-visible:ring-0"
            aria-describedby="name-help"
            title="Editable later in league settings"
          />
          <p id="name-help" className="mt-1 text-sm text-white/70">Don't worry. You can change this later.</p>
        </div>

        <div className="space-y-2">
          <div className="space-y-0.5">
            <p className="text-3xl font-black tracking-tight text-white">Choose League Size</p>
            <p className="text-base text-white/65">You can change it later in settings.</p>
          </div>
          <Label className="text-cyan-300">Quick team size picks</Label>
          <div className="grid grid-cols-4 gap-2">
            {TEAM_COUNTS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onTeamCountChange(n)}
                className={`min-h-[56px] rounded-2xl border text-center text-xl font-black transition ${
                  safeTeamCount === n
                    ? 'border-cyan-300 bg-cyan-400/10 text-white shadow-[0_0_0_1px_rgba(0,255,220,0.2)_inset]'
                    : 'border-white/10 bg-white/[0.03] text-white/90 hover:bg-white/[0.06]'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-white/90">Number of teams</Label>
          <Select value={String(safeTeamCount)} onValueChange={(v) => onTeamCountChange(Number(v))}>
            <SelectTrigger
              className="mt-1.5 min-h-[44px] border-white/20 bg-[#030a20] text-white"
              title="10 or 12 is most common"
              aria-label="Number of teams"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TEAM_COUNTS.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n} teams
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-1 text-xs text-white/50">Standard leagues use 10 or 12 teams.</p>
        </div>
        <div className="space-y-1.5">
          <Label className="text-white/90">Trade review mode</Label>
          <Select value={tradeReviewMode} onValueChange={(v) => onTradeReviewModeChange(v as TeamSizeSelectorProps['tradeReviewMode'])}>
            <SelectTrigger
              className="mt-1.5 min-h-[44px] border-white/20 bg-[#030a20] text-white"
              aria-label="Trade review mode"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="commissioner">Commissioner review</SelectItem>
              <SelectItem value="league_vote">League vote</SelectItem>
              <SelectItem value="instant">Instant</SelectItem>
              <SelectItem value="none">No review</SelectItem>
            </SelectContent>
          </Select>
          <p className="mt-1 text-xs text-white/50">This is your starting policy and can be changed later in settings.</p>
        </div>
        <div className="space-y-1.5">
          <Label className="text-white/90">Roster size (optional)</Label>
          <Select
            value={rosterSize != null ? String(rosterSize) : 'default'}
            onValueChange={(v) => onRosterSizeChange(v === 'default' ? null : Number(v))}
          >
            <SelectTrigger
              className="mt-1.5 min-h-[44px] border-white/20 bg-[#030a20] text-white"
              title="Default uses your sport and scoring preset"
              aria-label="Roster size"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Use sport default</SelectItem>
              {ROSTER_SIZES.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n} players
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-1 text-xs text-white/50">Leave as default to use the preset for your sport and scoring.</p>
        </div>
      </div>
    </div>
  )
}
