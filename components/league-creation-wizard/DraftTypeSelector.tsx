'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DRAFT_TYPE_LABELS,
  getAllowedDraftTypesForLeagueType,
} from '@/lib/league-creation-wizard/league-type-registry'
import type { DraftTypeId, LeagueTypeId } from '@/lib/league-creation-wizard/types'
import { useSportRules } from '@/hooks/useSportRules'
import { StepHeader } from './StepHelp'

export type DraftTypeSelectorProps = {
  sport: string
  leagueType: LeagueTypeId
  value: DraftTypeId
  onChange: (draftType: DraftTypeId) => void
}

const DRAFT_TYPE_TOOLTIPS: Record<DraftTypeId, string> = {
  snake: 'Pick order reverses each round (1–12, then 12–1). Most common.',
  linear: 'Same pick order every round (1, 2, 3…).',
  auction: 'Each team has a budget; bid on players. Highest bid wins.',
  slow_draft: 'No live timer; picks can take hours or days. Good for busy leagues.',
  mock_draft: 'Practice draft engine mode tied to mock-draft flows and recap tools.',
  devy_snake: 'Snake draft with a college-only devy pool and devy-specific rules.',
  devy_auction: 'Auction draft for devy assets with college-only player pool support.',
  c2c_snake: 'Snake draft for mixed C2C pools, including dedicated college rounds.',
  c2c_auction: 'Auction draft for C2C leagues with college/pro pool controls.',
}

const DRAFT_TYPE_DESCRIPTIONS: Record<DraftTypeId, string> = {
  snake: 'Each round reverses order. Most common way to draft.',
  linear: 'The same draft order repeats every round.',
  auction: 'Each manager gets a budget and bids on every player.',
  slow_draft: 'Async format with longer pick windows.',
  mock_draft: 'Practice-first draft flow that integrates with the mock draft engine stack.',
  devy_snake: 'College-player snake draft that feeds long-term devy rosters.',
  devy_auction: 'College-player auction draft that supports premium devy stash formats.',
  c2c_snake: 'Campus to Canton snake draft with college rounds and optional pro mixing.',
  c2c_auction: 'Campus to Canton auction format with mixed pool bidding.',
}

const DRAFT_TYPE_ICONS: Record<DraftTypeId, string> = {
  snake: '↔',
  linear: '⇢',
  auction: '◼',
  slow_draft: '⏱',
  mock_draft: '🎯',
  devy_snake: '🎓',
  devy_auction: '🏷',
  c2c_snake: '🏈',
  c2c_auction: '🏀',
}

/**
 * Draft type selection (snake, linear, auction, slow draft, mock draft).
 * Integrates with live draft engines and mock draft engine paths.
 */
export function DraftTypeSelector({ sport, leagueType, value, onChange }: DraftTypeSelectorProps) {
  const { rules } = useSportRules(sport, null)
  const [showAdvancedSelector, setShowAdvancedSelector] = useState(false)
  const allowedByLeagueType = getAllowedDraftTypesForLeagueType(leagueType)
  const allowedBySport = rules?.draft.allowedDraftTypes ?? allowedByLeagueType
  const allowed = (() => {
    const normalizedSportAllowed = new Set(
      allowedBySport.flatMap((id) => {
        if (id === 'snake') return ['snake', 'devy_snake', 'c2c_snake']
        if (id === 'auction') return ['auction', 'devy_auction', 'c2c_auction']
        return [id]
      })
    )
    const intersected = allowedByLeagueType.filter((id) => normalizedSportAllowed.has(id))
    return intersected.length > 0 ? intersected : allowedByLeagueType
  })()
  const safeValue = allowed.includes(value) ? value : allowed[0]!
  return (
    <div className="space-y-6">
      <StepHeader
        title="Choose Draft Type"
        description="You can change it later in settings."
        help={
          <>
            <strong>Snake</strong> — Rounds go 1–12, 12–1, 1–12… <strong>Linear</strong> — Same order every round. <strong>Auction</strong> — Budget (e.g. $200); bid on players. <strong>Slow draft</strong> — Asynchronous; each manager has a time window per pick. <strong>Mock draft</strong> — Practice flow backed by mock draft runtime and recap.
          </>
        }
        helpTitle="Draft type explained"
      />
      <div className="space-y-3">
        <Label className="text-cyan-300">Type</Label>
        <p className="text-xs text-white/60">
          {String(sport).toUpperCase()} supports: {allowed.map((id) => DRAFT_TYPE_LABELS[id]).join(', ')}
        </p>
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
        <button
          type="button"
          onClick={() => setShowAdvancedSelector((v) => !v)}
          className="flex items-center gap-2 text-sm text-white/70 hover:text-white/90 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 rounded px-1 py-0.5"
          aria-expanded={showAdvancedSelector}
        >
          {showAdvancedSelector ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          Advanced selector
        </button>
        {showAdvancedSelector && (
          <>
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
          </>
        )}
      </div>
    </div>
  )
}
