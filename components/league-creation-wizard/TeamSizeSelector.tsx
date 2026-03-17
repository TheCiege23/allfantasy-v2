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
  onNameChange: (name: string) => void
  onTeamCountChange: (n: number) => void
  onRosterSizeChange: (n: number | null) => void
}

/**
 * League name, number of teams, and optional roster size.
 */
export function TeamSizeSelector({
  name,
  teamCount,
  rosterSize,
  onNameChange,
  onTeamCountChange,
  onRosterSizeChange,
}: TeamSizeSelectorProps) {
  const safeTeamCount = teamCount >= 4 && teamCount <= 24 ? teamCount : 12
  return (
    <div className="space-y-5">
      <StepHeader
        title="Team setup"
        description="Give your league a name and choose how many teams. 10 or 12 teams is standard. You can invite managers after creation."
        help={
          <>
            Roster size is usually set by your scoring preset (e.g. PPR). Override it here only if you need a custom number of bench or total spots.
          </>
        }
        helpTitle="Roster size"
      />
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-white/90">League name</Label>
          <Input
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="e.g. My League"
            className="mt-1.5 bg-gray-900 border-white/20 text-white min-h-[44px] placeholder:text-white/40"
            aria-describedby="name-help"
            title="Editable later in league settings"
          />
          <p id="name-help" className="mt-1 text-xs text-white/50">You can change this later in league settings.</p>
        </div>
        <div className="space-y-1.5">
          <Label className="text-white/90">Number of teams</Label>
          <Select value={String(safeTeamCount)} onValueChange={(v) => onTeamCountChange(Number(v))}>
            <SelectTrigger className="mt-1.5 bg-gray-900 border-white/20 text-white min-h-[44px]" title="10 or 12 is most common">
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
          <Label className="text-white/90">Roster size (optional)</Label>
          <Select
            value={rosterSize != null ? String(rosterSize) : 'default'}
            onValueChange={(v) => onRosterSizeChange(v === 'default' ? null : Number(v))}
          >
            <SelectTrigger className="mt-1.5 bg-gray-900 border-white/20 text-white min-h-[44px]" title="Default uses your sport and scoring preset">
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
