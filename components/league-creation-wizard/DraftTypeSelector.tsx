'use client'

import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DRAFT_TYPE_LABELS,
  getAllowedDraftTypesForLeagueType,
} from '@/lib/league-creation-wizard/league-type-registry'
import type { DraftTypeId, LeagueTypeId } from '@/lib/league-creation-wizard/types'
import { StepHeader } from './StepHelp'

export type DraftTypeSelectorProps = {
  leagueType: LeagueTypeId
  value: DraftTypeId
  onChange: (draftType: DraftTypeId) => void
}

const DRAFT_TYPE_TOOLTIPS: Record<DraftTypeId, string> = {
  snake: 'Pick order reverses each round (1–12, then 12–1). Most common.',
  linear: 'Same pick order every round (1, 2, 3…).',
  auction: 'Each team has a budget; bid on players. Highest bid wins.',
  slow_draft: 'No live timer; picks can take hours or days. Good for busy leagues.',
  mock_draft: 'Practice draft only; not used for league creation.',
}

/**
 * Draft type selection (snake, linear, auction, slow draft). Integrates with the live draft engine.
 */
export function DraftTypeSelector({ leagueType, value, onChange }: DraftTypeSelectorProps) {
  const allowed = getAllowedDraftTypesForLeagueType(leagueType)
  const safeValue = allowed.includes(value) ? value : allowed[0]!
  return (
    <div className="space-y-5">
      <StepHeader
        title="Draft type"
        description="Snake is the most popular: pick order flips each round. Auction uses a budget per team; slow draft has no live clock."
        help={
          <>
            <strong>Snake</strong> — Rounds go 1–12, 12–1, 1–12… <strong>Linear</strong> — Same order every round. <strong>Auction</strong> — Budget (e.g. $200); bid on players. <strong>Slow draft</strong> — Asynchronous; each manager has a time window per pick.
          </>
        }
        helpTitle="Draft type explained"
      />
      <div className="space-y-1.5">
        <Label className="text-white/90">Type</Label>
        <Select value={safeValue} onValueChange={(v) => onChange(v as DraftTypeId)}>
          <SelectTrigger className="mt-1.5 bg-gray-900 border-white/20 text-white min-h-[44px]" title={DRAFT_TYPE_TOOLTIPS[safeValue]}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {allowed.map((id) => (
              <SelectItem key={id} value={id} title={DRAFT_TYPE_TOOLTIPS[id]}>
                {DRAFT_TYPE_LABELS[id]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
