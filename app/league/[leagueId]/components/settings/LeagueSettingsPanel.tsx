'use client'

import { useEffect, useState } from 'react'
import type { CommissionerSettingsFormData } from '@/lib/league/commissioner-league-patch'
import { COMMON_TIMEZONES } from '@/lib/timezone'

export function LeagueSettingsPanel({
  leagueId,
  initialData,
  hasAfCommissionerSub,
  canEdit,
  save,
  debouncedSave,
}: {
  leagueId: string
  initialData: CommissionerSettingsFormData
  hasAfCommissionerSub: boolean
  canEdit: boolean
  save: (partial: Record<string, unknown>) => Promise<void>
  debouncedSave: (partial: Record<string, unknown>) => void
}) {
  const [name, setName] = useState(initialData.name ?? '')
  const [timezone, setTimezone] = useState(initialData.timezone ?? 'America/New_York')
  const [playoffTeams, setPlayoffTeams] = useState(initialData.playoffTeams ?? 4)
  const [medianGame, setMedianGame] = useState(Boolean(initialData.medianGame))
  const [keeperCount, setKeeperCount] = useState(initialData.keeperCount ?? 3)
  const [keeperCostSystem, setKeeperCostSystem] = useState(initialData.keeperCostSystem ?? 'round_based')
  const [keeperRoundPenalty, setKeeperRoundPenalty] = useState(initialData.keeperRoundPenalty ?? 1)
  const [keeperInflationRate, setKeeperInflationRate] = useState(initialData.keeperInflationRate ?? 1)
  const [keeperAuctionPct, setKeeperAuctionPct] = useState(
    () => (initialData.keeperAuctionPctIncrease != null ? initialData.keeperAuctionPctIncrease * 100 : 20),
  )
  const [keeperMaxYears, setKeeperMaxYears] = useState(initialData.keeperMaxYears ?? 3)
  const [keeperWaiverAllowed, setKeeperWaiverAllowed] = useState(initialData.keeperWaiverAllowed ?? true)
  const [keeperMinRoundsHeld, setKeeperMinRoundsHeld] = useState(initialData.keeperMinRoundsHeld ?? 0)
  const [keeperDeadlineLocal, setKeeperDeadlineLocal] = useState('')

  useEffect(() => {
    setName(initialData.name ?? '')
    setTimezone(initialData.timezone ?? 'America/New_York')
    setPlayoffTeams(initialData.playoffTeams ?? 4)
    setMedianGame(Boolean(initialData.medianGame))
    setKeeperCount(initialData.keeperCount ?? 3)
    setKeeperCostSystem(initialData.keeperCostSystem ?? 'round_based')
    setKeeperRoundPenalty(initialData.keeperRoundPenalty ?? 1)
    setKeeperInflationRate(initialData.keeperInflationRate ?? 1)
    setKeeperAuctionPct(initialData.keeperAuctionPctIncrease != null ? initialData.keeperAuctionPctIncrease * 100 : 20)
    setKeeperMaxYears(initialData.keeperMaxYears ?? 3)
    setKeeperWaiverAllowed(initialData.keeperWaiverAllowed ?? true)
    setKeeperMinRoundsHeld(initialData.keeperMinRoundsHeld ?? 0)
    if (initialData.keeperSelectionDeadline) {
      const d = new Date(initialData.keeperSelectionDeadline)
      setKeeperDeadlineLocal(d.toISOString().slice(0, 16))
    }
  }, [initialData])

  const disabled = !canEdit
  const subHint = !hasAfCommissionerSub
  const showKeeper = initialData.leagueType === 'keeper'

  return (
    <div className="space-y-6 px-6 py-6 text-[13px] text-white/85" data-league-id={leagueId}>
      <div>
        <label className="mb-1 block text-[11px] uppercase tracking-wide text-white/45" htmlFor="ls-name">
          League name
        </label>
        <input
          id="ls-name"
          className="w-full max-w-md rounded-lg border border-white/[0.12] bg-[#0a1220] px-3 py-2 text-white outline-none focus:border-sky-500/50 disabled:opacity-50"
          value={name}
          disabled={disabled}
          onChange={(e) => {
            const v = e.target.value
            setName(v)
            debouncedSave({ name: v })
          }}
        />
      </div>

      <div>
        <label className="mb-1 block text-[11px] uppercase tracking-wide text-white/45" htmlFor="ls-tz">
          Timezone
        </label>
        <input
          id="ls-tz"
          className="w-full max-w-md rounded-lg border border-white/[0.12] bg-[#0a1220] px-3 py-2 text-white outline-none focus:border-sky-500/50 disabled:opacity-50"
          value={timezone}
          disabled={disabled}
          onChange={(e) => {
            const v = e.target.value
            setTimezone(v)
            debouncedSave({ timezone: v })
          }}
        />
      </div>

      <div>
        <label className="mb-1 block text-[11px] uppercase tracking-wide text-white/45" htmlFor="ls-pt">
          Playoff teams
        </label>
        <input
          id="ls-pt"
          type="number"
          min={2}
          max={16}
          className="w-32 rounded-lg border border-white/[0.12] bg-[#0a1220] px-3 py-2 text-white outline-none focus:border-sky-500/50 disabled:opacity-50"
          value={playoffTeams}
          disabled={disabled}
          onChange={(e) => {
            const n = Number(e.target.value)
            setPlayoffTeams(n)
            debouncedSave({ playoffTeams: n })
          }}
        />
        {subHint ? (
          <p className="mt-1 text-[11px] text-amber-400/90">
            7- and 9-team brackets require an AF Commissioner subscription (server-enforced).
          </p>
        ) : null}
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-white/80">
        <input
          type="checkbox"
          className="rounded border-white/20 bg-[#0a1220]"
          checked={medianGame}
          disabled={disabled}
          onChange={(e) => {
            const v = e.target.checked
            setMedianGame(v)
            void save({ medianGame: v })
          }}
        />
        Median game (vs league median)
      </label>

      {showKeeper ? (
        <div className="space-y-4 border-t border-white/[0.08] pt-6">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-sky-300/90">Keeper rules</p>

          <div>
            <label className="mb-1 block text-[11px] text-white/45" htmlFor="kp-count">
              Keepers per team
            </label>
            <select
              id="kp-count"
              className="rounded-lg border border-white/[0.12] bg-[#0a1220] px-3 py-2 text-white disabled:opacity-50"
              disabled={disabled}
              value={Math.min(20, Math.max(0, keeperCount))}
              onChange={(e) => {
                const n = Number(e.target.value)
                setKeeperCount(n)
                debouncedSave({ keeperCount: n })
              }}
            >
              {Array.from({ length: 21 }, (_, i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-white/40">
              How many players each team can keep per season. 0 = no keepers.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-[11px] text-white/45">Keeper cost system</label>
            <select
              className="w-full max-w-md rounded-lg border border-white/[0.12] bg-[#0a1220] px-3 py-2 text-white disabled:opacity-50"
              disabled={disabled}
              value={keeperCostSystem}
              onChange={(e) => {
                const v = e.target.value
                setKeeperCostSystem(v)
                debouncedSave({ keeperCostSystem: v })
              }}
            >
              <option value="round_based">Round-based (draft round penalty)</option>
              <option value="inflation">Inflation (penalty grows yearly)</option>
              <option value="auction_value">Auction value carryover</option>
              <option value="free">Free (no pick cost)</option>
            </select>
          </div>

          {(keeperCostSystem === 'round_based' || keeperCostSystem === 'inflation') && (
            <div>
              <label className="mb-1 block text-[11px] text-white/45">Round penalty (rounds earlier)</label>
              <select
                className="rounded-lg border border-white/[0.12] bg-[#0a1220] px-3 py-2 text-white disabled:opacity-50"
                disabled={disabled}
                value={keeperRoundPenalty}
                onChange={(e) => {
                  const n = Number(e.target.value)
                  setKeeperRoundPenalty(n)
                  debouncedSave({ keeperRoundPenalty: n })
                }}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          )}

          {keeperCostSystem === 'inflation' && (
            <div>
              <label className="mb-1 block text-[11px] text-white/45">Inflation rate (rounds / year)</label>
              <select
                className="rounded-lg border border-white/[0.12] bg-[#0a1220] px-3 py-2 text-white disabled:opacity-50"
                disabled={disabled}
                value={keeperInflationRate}
                onChange={(e) => {
                  const n = Number(e.target.value)
                  setKeeperInflationRate(n)
                  debouncedSave({ keeperInflationRate: n })
                }}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          )}

          {keeperCostSystem === 'auction_value' && (
            <div>
              <label className="mb-1 block text-[11px] text-white/45">Auction inflation %</label>
              <input
                type="number"
                min={0}
                max={100}
                className="w-32 rounded-lg border border-white/[0.12] bg-[#0a1220] px-3 py-2 text-white disabled:opacity-50"
                disabled={disabled}
                value={Math.round(keeperAuctionPct)}
                onChange={(e) => {
                  const n = Number(e.target.value)
                  setKeeperAuctionPct(n)
                  debouncedSave({ keeperAuctionPctIncrease: n / 100 })
                }}
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-[11px] text-white/45">Max years per keeper</label>
            <select
              className="rounded-lg border border-white/[0.12] bg-[#0a1220] px-3 py-2 text-white disabled:opacity-50"
              disabled={disabled}
              value={keeperMaxYears}
              onChange={(e) => {
                const n = Number(e.target.value)
                setKeeperMaxYears(n)
                debouncedSave({ keeperMaxYears: n })
              }}
            >
              <option value={0}>Unlimited</option>
              <option value={1}>1 year</option>
              <option value={2}>2 years</option>
              <option value={3}>3 years</option>
              <option value={5}>5 years</option>
            </select>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-white/80">
            <input
              type="checkbox"
              className="rounded border-white/20 bg-[#0a1220]"
              checked={keeperWaiverAllowed}
              disabled={disabled}
              onChange={(e) => {
                const v = e.target.checked
                setKeeperWaiverAllowed(v)
                void save({ keeperWaiverAllowed: v })
              }}
            />
            Allow waiver pickups as keepers
          </label>

          <div>
            <label className="mb-1 block text-[11px] text-white/45">Keeper selection deadline (local)</label>
            <input
              type="datetime-local"
              className="max-w-xs rounded-lg border border-white/[0.12] bg-[#0a1220] px-3 py-2 text-white disabled:opacity-50"
              disabled={disabled}
              value={keeperDeadlineLocal}
              onChange={(e) => {
                const v = e.target.value
                setKeeperDeadlineLocal(v)
                if (!v) {
                  void save({ keeperSelectionDeadline: null })
                  return
                }
                void save({ keeperSelectionDeadline: new Date(v).toISOString() })
              }}
            />
            <p className="mt-1 text-[11px] text-white/40">Stored in UTC; pick time in your local browser.</p>
          </div>

          <div>
            <label className="mb-1 block text-[11px] text-white/45">Minimum rounds held</label>
            <select
              className="rounded-lg border border-white/[0.12] bg-[#0a1220] px-3 py-2 text-white disabled:opacity-50"
              disabled={disabled}
              value={keeperMinRoundsHeld}
              onChange={(e) => {
                const n = Number(e.target.value)
                setKeeperMinRoundsHeld(n)
                debouncedSave({ keeperMinRoundsHeld: n })
              }}
            >
              {Array.from({ length: 11 }, (_, i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[11px] text-white/45">Timezone (for display)</label>
            <select
              className="w-full max-w-md rounded-lg border border-white/[0.12] bg-[#0a1220] px-3 py-2 text-[12px] text-white disabled:opacity-50"
              disabled={disabled}
              value={timezone}
              onChange={(e) => {
                const v = e.target.value
                setTimezone(v)
                debouncedSave({ timezone: v })
              }}
            >
              {COMMON_TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>

          {subHint ? (
            <p className="text-[11px] text-amber-400/90">
              AF Commissioner subscription unlocks AI keeper recommendations (server-gated).
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
