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

const DRAFT_TYPE_DESCRIPTIONS: Record<DraftTypeId, string> = {
  snake: 'Each round reverses order. Most common way to draft.',
  linear: 'The same draft order repeats every round.',
  auction: 'Each manager gets a budget and bids on every player.',
  slow_draft: 'Async format with longer pick windows.',
  mock_draft: 'Practice-only flow for testing draft strategy.',
}

const DRAFT_TYPE_ICONS: Record<DraftTypeId, string> = {
  snake: '↔',
  linear: '⇢',
  auction: '◼',
  slow_draft: '⏱',
  mock_draft: '🎯',
}

/**
 * Draft type selection (snake, linear, auction, slow draft). Integrates with the live draft engine.
 */
export function DraftTypeSelector({ leagueType, value, onChange }: DraftTypeSelectorProps) {
  const allowed = getAllowedDraftTypesForLeagueType(leagueType)
  const safeValue = allowed.includes(value) ? value : allowed[0]!
  return (
    <div className="space-y-6">
      <StepHeader
        title="Choose Draft Type"
        description="You can change it later in settings."
        help={
          <>
            <strong>Snake</strong> — Rounds go 1–12, 12–1, 1–12… <strong>Linear</strong> — Same order every round. <strong>Auction</strong> — Budget (e.g. $200); bid on players. <strong>Slow draft</strong> — Asynchronous; each manager has a time window per pick.
          </>
        }
        helpTitle="Draft type explained"
      />
      <div className="space-y-3">
        <Label className="text-cyan-300">Type</Label>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {allowed.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              title={DRAFT_TYPE_TOOLTIPS[id]}
              className={`min-h-[108px] rounded-2xl border px-3 py-3 text-left transition ${
                safeValue === id
                  ? 'border-cyan-300 bg-cyan-400/10 shadow-[0_0_0_1px_rgba(0,255,220,0.2)_inset]'
                  : 'border-white/15 bg-black/25 hover:bg-white/[0.05]'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  aria-hidden
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-full border text-lg font-black ${
                    safeValue === id
                      ? 'border-cyan-300 text-cyan-200 bg-cyan-300/10'
                      : 'border-white/20 text-white/80 bg-black/20'
                  }`}
                >
                  {DRAFT_TYPE_ICONS[id]}
                </span>
                <p className="text-xs uppercase tracking-[0.14em] text-cyan-200/75">{id.replace('_', ' ')}</p>
              </div>
              <p className="mt-2 text-base font-bold text-white">{DRAFT_TYPE_LABELS[id]}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-cyan-400/25 bg-[#07122d]/80 p-4">
        <p className="text-2xl font-black text-white">{DRAFT_TYPE_LABELS[safeValue]}</p>
        <p className="mt-1 text-sm text-cyan-200/75">Duration: Moderate</p>
        <p className="mt-3 text-base text-white/85">{DRAFT_TYPE_DESCRIPTIONS[safeValue]}</p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-white/70">Advanced selector</Label>
        <Select value={safeValue} onValueChange={(v) => onChange(v as DraftTypeId)}>
          <SelectTrigger className="mt-1.5 min-h-[44px] border-white/20 bg-[#030a20] text-white" title={DRAFT_TYPE_TOOLTIPS[safeValue]}>
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
