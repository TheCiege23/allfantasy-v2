'use client'

import { useState } from 'react'
import { useAfSubGate } from '@/hooks/useAfSubGate'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Sparkles } from 'lucide-react'
import { PlayerImage } from '@/app/components/PlayerImage'
import type { PlayerMap } from '@/lib/hooks/useSleeperPlayers'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { mockIdpPoints, mockStatPills, idpRoleLabel } from './idpPositionUtils'
import { isWeatherSensitiveSport } from '@/lib/weather/outdoorSportMetadata'
import { WeatherBadge } from '@/components/weather/WeatherBadge'
import { ProjectionDisplay } from '@/components/weather/ProjectionDisplay'
import type { IdpSalaryRecordJson } from '@/app/idp/hooks/useIdpTeamCap'
import { mockContractUi } from '@/app/idp/hooks/useIdpTeamCap'
import type { DefenderEvaluation } from '@/lib/idp/ai/idpCapChimmy'

export type IDPPlayerModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  leagueId: string
  rosterId?: string | null
  playerId: string
  name: string
  position: string
  team?: string | null
  sport: string
  week: number
  players: PlayerMap
  contract?: IdpSalaryRecordJson | null
}

export function IDPPlayerModal({
  open,
  onOpenChange,
  leagueId,
  rosterId,
  playerId,
  name,
  position,
  team,
  sport,
  week,
  players,
  contract: contractProp,
}: IDPPlayerModalProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const userId = session?.user?.id ?? ''
  const p = players[playerId]
  const stats = mockStatPills(playerId)
  const { pts, proj } = mockIdpPoints(playerId, week)
  const role = idpRoleLabel(playerId)
  const matchup: 'Favorable' | 'Average' | 'Tough' =
    playerId.length % 3 === 0 ? 'Favorable' : playerId.length % 3 === 1 ? 'Average' : 'Tough'
  const matchupClass =
    matchup === 'Favorable'
      ? 'text-emerald-300'
      : matchup === 'Tough'
        ? 'text-red-300'
        : 'text-white/50'

  const showOutdoorWeatherHint = isWeatherSensitiveSport(sport)
  const mockGameWeather =
    showOutdoorWeatherHint
      ? {
          conditionLabel: 'Partly cloudy' as const,
          temperatureF: 48,
          windSpeedMph: 14,
          precipChancePct: 12,
        }
      : null

  const [aiLoading, setAiLoading] = useState(false)
  const [aiEval, setAiEval] = useState<DefenderEvaluation | null>(null)
  const [aiNarrative, setAiNarrative] = useState<string | null>(null)
  const { handleApiResponse } = useAfSubGate('commissioner_idp_analysis')

  const mock = mockContractUi(playerId)
  const contract = contractProp
  const salaryM = contract?.salary ?? mock.salaryM
  const yearsRem = contract?.yearsRemaining ?? mock.yearsRemaining
  const startYear = contract?.contractStartYear ?? new Date().getFullYear()
  const totalRemainingValue = salaryM * yearsRem
  const cutPenalty =
    contract?.cutPenaltyCurrent ??
    (contract
      ? contract.salary + contract.salary * 0.25 * Math.max(0, contract.yearsRemaining - 1)
      : mock.salaryM * 1.25)
  const expiresYear = startYear + yearsRem - 1
  const isExpiring = yearsRem <= 1
  const isTagged = contract?.isFranchiseTagged || contract?.status === 'franchise_tagged'

  const [cutOpen, setCutOpen] = useState(false)
  const [extendOpen, setExtendOpen] = useState(false)
  const [tagOpen, setTagOpen] = useState(false)
  const [extendYears, setExtendYears] = useState(1)
  const [capActionLoading, setCapActionLoading] = useState(false)
  const [capActionError, setCapActionError] = useState<string | null>(null)

  const extensionBoost = contract?.extensionBoostPct ?? 0.1
  const newSalaryPreview = salaryM * (1 + extensionBoost * extendYears)

  const runCapPatch = async (body: Record<string, unknown>) => {
    if (!rosterId) {
      setCapActionError('Roster not linked — open league from team context.')
      return
    }
    setCapActionLoading(true)
    setCapActionError(null)
    try {
      const res = await fetch('/api/idp/cap', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ leagueId, rosterId, ...body }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        setCapActionError(data.error ?? 'Request failed')
        return
      }
      setCutOpen(false)
      setExtendOpen(false)
      setTagOpen(false)
      router.refresh()
      onOpenChange(false)
    } finally {
      setCapActionLoading(false)
    }
  }

  const runAiAnalysis = async () => {
    if (!userId) return
    setAiLoading(true)
    setAiEval(null)
    setAiNarrative(null)
    try {
      const res = await fetch('/api/idp/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          leagueId,
          week,
          action: 'defender_eval',
          managerId: userId,
          playerId,
        }),
      })
      if (!(await handleApiResponse(res))) return
      const data = (await res.json().catch(() => ({}))) as {
        evaluation?: DefenderEvaluation
        error?: string
      }
      if (data.evaluation) {
        setAiEval(data.evaluation)
      } else {
        setAiNarrative(data.error ?? 'Could not load evaluation.')
      }
    } finally {
      setAiLoading(false)
    }
  }

  const overallTone =
    aiEval == null
      ? 'text-white/50'
      : aiEval.overallGrade >= 72
        ? 'text-[color:var(--cap-green)]'
        : aiEval.overallGrade >= 48
          ? 'text-[color:var(--cap-amber)]'
          : 'text-red-300'

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border border-[color:var(--idp-border)] bg-[color:var(--idp-panel)] text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-start gap-3 pr-8 text-left text-base">
              <PlayerImage
                sleeperId={playerId}
                sport={sport}
                name={name}
                position={position}
                espnId={p?.espn_id}
                nbaId={p?.nba_id}
                size={48}
                variant="round"
              />
              <div className="min-w-0">
                <p className="truncate font-bold">{name}</p>
                <p className="text-sm font-normal text-white/55">
                  {team ?? '—'} · {position}
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>

          <section className="space-y-2 border-t border-white/[0.06] pt-3">
            <h4 className="text-[11px] font-bold uppercase tracking-wide text-white/40">This week</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {Object.entries(stats).map(([k, v]) => (
                <div
                  key={k}
                  className="flex justify-between rounded-md border border-white/[0.06] bg-black/20 px-2 py-1.5"
                >
                  <span className="text-white/50">{k}</span>
                  <span className="font-semibold">{String(v)}</span>
                </div>
              ))}
            </div>
            <p className="text-sm flex flex-wrap items-center gap-2">
              <span className="text-white/45">IDP points:</span>{' '}
              <span className="font-bold text-[color:var(--idp-defense)]">{pts}</span>{' '}
              <span className="text-white/35 inline-flex items-center gap-1">
                proj
                <ProjectionDisplay
                  projection={proj}
                  suffix=""
                  pointsClassName="text-sm text-white/35"
                  afCrestProps={{
                    playerId,
                    playerName: name,
                    sport,
                    position,
                    week,
                    season: new Date().getFullYear(),
                    size: 'sm',
                  }}
                />
              </span>
            </p>
            <p className="text-xs text-white/45">Snap share (snapshot): ~{40 + (playerId.length % 55)}%</p>
          </section>

          <section className="space-y-2 border-t border-white/[0.06] pt-3">
            <h4 className="text-[11px] font-bold uppercase tracking-wide text-white/40">Season averages</h4>
            <p className="text-sm text-white/70">
              Avg tackles ~{(stats.soloTackles + stats.assistedTackles) / 2} · Avg sacks ~{stats.sacks} · Avg IDP pts
              ~{(pts + proj) / 2}
            </p>
            <div className="h-12 rounded-md bg-gradient-to-r from-red-500/20 via-violet-500/15 to-blue-500/20" title="Week-by-week sparkline (placeholder)" />
          </section>

          <section className="space-y-2 border-t border-white/[0.06] pt-3">
            <h4 className="text-[11px] font-bold uppercase tracking-wide text-white/40">Role + matchup</h4>
            <p className="text-sm text-white/80">
              {role} — Edge / box mix (illustrative). Defender role:{' '}
              <span className="text-white">{position === 'LB' ? 'Run Stopper – 4-3 MIKE' : 'Edge Rusher – 3-4 OLB'}</span>
            </p>
            <p className="text-sm flex flex-wrap items-center gap-2">
              Matchup: <span className={matchupClass}>{matchup}</span> · Opp rank vs {position}: #
              {10 + (playerId.charCodeAt(0) ?? 0) % 22}
              {mockGameWeather ? (
                <WeatherBadge
                  conditionLabel={mockGameWeather.conditionLabel}
                  temperatureF={mockGameWeather.temperatureF}
                  windSpeedMph={mockGameWeather.windSpeedMph}
                  precipChancePct={mockGameWeather.precipChancePct}
                  className="text-white/45"
                />
              ) : null}
            </p>
          </section>

          <section className="space-y-2 border-t border-white/[0.06] pt-3">
            <h4 className="text-[11px] font-bold uppercase tracking-wide text-white/40">Projection</h4>
            <p className="text-sm text-white/70 flex flex-wrap items-center gap-2">
              <span>Projected IDP pts for remaining schedule (UI placeholder): ~</span>
              <ProjectionDisplay
                projection={proj + 0.5}
                suffix=" / game"
                pointsClassName="text-sm text-white/70"
                afCrestProps={{
                  playerId,
                  playerName: name,
                  sport,
                  position,
                  week,
                  season: new Date().getFullYear(),
                  size: 'sm',
                }}
              />
            </p>
          </section>

          <section className="space-y-2 border-t border-white/[0.06] pt-3" data-testid="idp-player-contract-panel">
            <h4 className="text-[11px] font-bold uppercase tracking-wide text-[color:var(--cap-contract)]/90">
              Contract
            </h4>
            <div className="rounded-lg border border-white/[0.08] bg-black/25 px-3 py-2 text-sm text-white/85">
              <p>
                <span className="text-white/45">Salary:</span>{' '}
                <span className="font-semibold text-white">${salaryM.toFixed(1)}M</span> / year
              </p>
              <p>
                <span className="text-white/45">Years remaining:</span> {yearsRem}
              </p>
              <p>
                <span className="text-white/45">Contract expires:</span> {expiresYear}
              </p>
              <p>
                <span className="text-white/45">Total remaining value:</span>{' '}
                <span className="font-semibold">${totalRemainingValue.toFixed(1)}M</span>
              </p>
              <p>
                <span className="text-white/45">Cut penalty (dead money):</span>{' '}
                <span className="text-[color:var(--cap-dead)]">${cutPenalty.toFixed(1)}M</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {isExpiring ? (
                <span className="rounded-full border border-[color:var(--cap-amber)]/40 bg-[color:var(--cap-amber)]/10 px-2 py-0.5 text-[10px] font-semibold text-amber-100">
                  Expiring Contract
                </span>
              ) : null}
              {isTagged ? (
                <span className="rounded-full border border-amber-400/45 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-50">
                  Franchise Tagged
                </span>
              ) : null}
            </div>
            {capActionError ? (
              <p className="text-[11px] text-red-300">{capActionError}</p>
            ) : null}
          </section>

          {aiEval || aiNarrative ? (
            <section className="space-y-3 border-t border-white/[0.06] pt-3" data-testid="idp-player-ai-panel">
              <h4 className="text-[11px] font-bold uppercase tracking-wide text-cyan-200/90">AI evaluation</h4>
              {aiEval ? (
                <div className="space-y-3 rounded-lg border border-cyan-500/20 bg-cyan-950/10 p-3">
                  <div className="flex items-center gap-4">
                    <div
                      className={`relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-4 border-white/10 bg-black/30 text-lg font-bold ${overallTone}`}
                      style={{
                        borderColor:
                          aiEval.overallGrade >= 72
                            ? 'var(--cap-green)'
                            : aiEval.overallGrade >= 48
                              ? 'var(--cap-amber)'
                              : 'var(--cap-red)',
                      }}
                    >
                      {Math.round(aiEval.overallGrade)}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-white/45">Overall</p>
                      <p className={`text-2xl font-bold ${overallTone}`}>{aiEval.overallGrade.toFixed(1)}/100</p>
                      <span className="mt-1 inline-block rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] font-bold text-white/90">
                        {aiEval.verdict.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-3">
                    {[
                      ['Weekly start', aiEval.weeklyStartGrade],
                      ['Dynasty', aiEval.dynastyGrade],
                      ['Salary eff.', aiEval.salaryEfficiencyGrade],
                      ['Contract val.', aiEval.contractValueGrade],
                      ['Boom/Bust', aiEval.boomBustScore],
                      ['Floor', aiEval.floorScore],
                      ['Risk', aiEval.riskScore],
                      ['Trade value', aiEval.tradeValueScore],
                      ['Waiver prio.', aiEval.waiverPriorityScore],
                      ['Trend', aiEval.trendScore],
                    ].map(([label, val]) => (
                      <div key={String(label)} className="rounded-md border border-white/[0.06] bg-black/25 px-2 py-1.5">
                        <p className="text-[9px] text-white/40">{label}</p>
                        <p className="font-mono font-semibold text-white/90">{typeof val === 'number' ? val.toFixed(0) : val}</p>
                      </div>
                    ))}
                  </div>
                  <ul className="list-inside list-disc space-y-1 text-[11px] text-white/80">
                    {aiEval.topReasons.map((r) => (
                      <li key={r.slice(0, 24)}>{r}</li>
                    ))}
                  </ul>
                  <p className="text-[11px] text-amber-200/85">Risk: {aiEval.mainRisk}</p>
                  <p className="text-[10px] text-white/45">
                    Confidence: <span className="font-semibold text-white/70">{aiEval.confidence}</span>
                  </p>
                </div>
              ) : null}
              {aiNarrative ? (
                <p className="text-sm leading-relaxed text-white/85" data-testid="idp-player-ai-narrative">
                  {aiNarrative}
                </p>
              ) : null}
            </section>
          ) : null}

          <div className="flex flex-wrap gap-2 border-t border-white/[0.06] pt-4">
            <button
              type="button"
              className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10"
            >
              Start / Sit
            </button>
            <button
              type="button"
              className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10"
            >
              Add / Drop
            </button>
            {rosterId && contract ? (
              <>
                <button
                  type="button"
                  onClick={() => setCutOpen(true)}
                  className="rounded-lg border border-red-500/35 bg-red-950/30 px-3 py-2 text-xs font-semibold text-red-100"
                  data-testid="idp-contract-cut"
                >
                  Cut Player
                </button>
                <button
                  type="button"
                  onClick={() => setExtendOpen(true)}
                  className="rounded-lg border border-sky-500/35 bg-sky-950/35 px-3 py-2 text-xs font-semibold text-sky-100"
                  data-testid="idp-contract-extend"
                >
                  Extend
                </button>
                <button
                  type="button"
                  onClick={() => setTagOpen(true)}
                  className="rounded-lg border border-amber-500/35 bg-amber-950/35 px-3 py-2 text-xs font-semibold text-amber-100"
                  data-testid="idp-contract-tag"
                >
                  Franchise Tag
                </button>
              </>
            ) : null}
            <Link
              href={rosterId ? `/league/${leagueId}?view=trades` : '#'}
              className={`rounded-lg border border-cyan-500/30 bg-cyan-950/40 px-3 py-2 text-xs font-semibold text-cyan-100 ${!rosterId ? 'pointer-events-none opacity-50' : ''}`}
            >
              Propose Trade
            </Link>
            <button
              type="button"
              onClick={() => void runAiAnalysis()}
              disabled={aiLoading || !userId}
              className="inline-flex items-center gap-2 rounded-lg border border-amber-500/35 bg-amber-950/35 px-3 py-2 text-xs font-semibold text-amber-100 disabled:opacity-50"
              data-testid="idp-player-ai-analysis"
            >
              {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 text-amber-200/90" />}
              AI Analysis (AfSub)
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={cutOpen} onOpenChange={setCutOpen}>
        <DialogContent className="border border-white/[0.08] bg-[#0f141c] text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm cut</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-white/75">
            Cutting {name} will create ~${cutPenalty.toFixed(1)}M in dead money. Are you sure?
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCutOpen(false)}
              className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-white/80"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={capActionLoading || !contract}
              onClick={() =>
                void runCapPatch({
                  action: 'cut',
                  salaryRecordId: contract?.id,
                  playerId,
                })
              }
              className="rounded-lg border border-red-500/40 bg-red-900/40 px-3 py-2 text-xs font-semibold text-red-100"
            >
              {capActionLoading ? '…' : 'Confirm Cut'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={extendOpen} onOpenChange={setExtendOpen}>
        <DialogContent className="border border-white/[0.08] bg-[#0f141c] text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Extend contract</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-white/70">
            Add years to the contract (+{Math.round(extensionBoost * 100)}% salary boost per extension year).
          </p>
          <div className="flex gap-2 py-2">
            {([1, 2, 3] as const).map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => setExtendYears(y)}
                className={`flex-1 rounded-lg border px-2 py-2 text-xs font-bold ${
                  extendYears === y ? 'border-sky-400/50 bg-sky-500/20 text-sky-100' : 'border-white/10 text-white/55'
                }`}
              >
                {y} yr
              </button>
            ))}
          </div>
          <p className="text-[11px] text-white/50">
            New salary preview (approx): ${newSalaryPreview.toFixed(2)}M / yr · Cap impact follows league rules.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setExtendOpen(false)}
              className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-white/80"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={capActionLoading || !contract}
              onClick={() =>
                void runCapPatch({
                  action: 'extend',
                  salaryRecordId: contract?.id,
                  additionalYears: extendYears,
                })
              }
              className="rounded-lg border border-sky-500/40 bg-sky-900/40 px-3 py-2 text-xs font-semibold text-sky-100"
            >
              {capActionLoading ? '…' : 'Confirm Extension'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={tagOpen} onOpenChange={setTagOpen}>
        <DialogContent className="border border-white/[0.08] bg-[#0f141c] text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Franchise tag</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-white/70">
            Applies a 1-year tag at your league&apos;s franchise tag value (see commissioner cap settings).
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setTagOpen(false)}
              className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-white/80"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={capActionLoading}
              onClick={() =>
                void runCapPatch({
                  action: 'franchise_tag',
                  playerId,
                })
              }
              className="rounded-lg border border-amber-500/40 bg-amber-900/40 px-3 py-2 text-xs font-semibold text-amber-100"
            >
              {capActionLoading ? '…' : 'Apply Tag'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
