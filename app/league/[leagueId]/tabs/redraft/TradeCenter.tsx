'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  analyzeRedraftTradeBuilder,
  type RedraftTradeBuilderAsset,
} from '@/lib/redraft/tradeBuilderAnalysis'
import {
  createTradeProposal,
  fetchRedraftRoster,
  listTradeProposals,
  submitTradeVote,
  vetoRedraftTradeProposal,
  type RedraftRosterClient,
  type RedraftRosterPlayerClient,
  type RedraftRosterRow,
  type RedraftTradeAssetInput,
  type RedraftTradeProposal,
} from '@/lib/redraft/client'

type DraftPickOption = {
  id: string
  label: string
  season: number
  round: number
}

function rosterName(row: RedraftRosterRow | undefined, fallbackId: string): string {
  return row?.teamName ?? row?.ownerName ?? fallbackId.slice(0, 6)
}

function playerSelectionId(player: RedraftRosterPlayerClient): string {
  return player.playerId || player.id
}

function toggleSelection(values: string[], value: string): string[] {
  return values.includes(value) ? values.filter((entry) => entry !== value) : [...values, value]
}

function isDraftPickOption(value: DraftPickOption | null): value is DraftPickOption {
  return Boolean(value)
}

function buildPickOptions(seasonYear: number): DraftPickOption[] {
  const seasons = [seasonYear + 1, seasonYear + 2]
  const rounds = [1, 2, 3, 4]
  return seasons.flatMap((season) =>
    rounds.map((round) => ({
      id: `${season}-round-${round}`,
      label: `${season} R${round}`,
      season,
      round,
    })),
  )
}

function playerToAnalysisAsset(player: RedraftRosterPlayerClient): RedraftTradeBuilderAsset {
  return {
    assetType: 'player',
    playerName: player.playerName,
    position: player.position,
    team: player.team,
    injuryStatus: player.injuryStatus,
    weeklyProjection: player.weeklyProjection ?? null,
    restOfSeasonProjection: player.restOfSeasonProjection ?? null,
    floorProjection: player.floorProjection ?? null,
    ceilingProjection: player.ceilingProjection ?? null,
    projectionConfidenceScore: player.projectionConfidenceScore ?? null,
    projectionSource: player.projectionSource ?? null,
  }
}

function pickToAnalysisAsset(pick: DraftPickOption): RedraftTradeBuilderAsset {
  return {
    assetType: 'draft_pick',
    pickSeason: pick.season,
    pickRound: pick.round,
    label: pick.label,
  }
}

function playerToApiAsset(
  player: RedraftRosterPlayerClient,
  fromRosterId: string,
  toRosterId: string,
): RedraftTradeAssetInput {
  return {
    fromRosterId,
    toRosterId,
    assetType: 'player',
    playerId: player.playerId,
    playerName: player.playerName,
    metadata: {
      position: player.position,
      team: player.team,
      slotType: player.slotType,
      injuryStatus: player.injuryStatus,
      weeklyProjection: player.weeklyProjection ?? null,
      restOfSeasonProjection: player.restOfSeasonProjection ?? null,
      floorProjection: player.floorProjection ?? null,
      ceilingProjection: player.ceilingProjection ?? null,
      projectionConfidenceScore: player.projectionConfidenceScore ?? null,
      projectionConfidenceLevel: player.projectionConfidenceLevel ?? null,
      projectionSource: player.projectionSource ?? null,
    },
  }
}

function pickToApiAsset(pick: DraftPickOption, fromRosterId: string, toRosterId: string): RedraftTradeAssetInput {
  return {
    fromRosterId,
    toRosterId,
    assetType: 'draft_pick',
    pickSeason: pick.season,
    pickRound: pick.round,
    metadata: { label: pick.label },
  }
}

function formatProposalAsset(asset: RedraftTradeProposal['assets'][number]): string {
  if (asset.assetType === 'player') return asset.playerName ?? 'Player'
  if (asset.assetType === 'draft_pick') {
    const season = asset.pickSeason ? `${asset.pickSeason} ` : ''
    const round = asset.pickRound ? `R${asset.pickRound}` : 'Pick'
    const number = asset.pickNumber ? `.${asset.pickNumber}` : ''
    return `${season}${round}${number}`.trim()
  }
  if (asset.assetType === 'faab') return 'FAAB'
  return 'Future consideration'
}

function TradeAssetSide({
  label,
  teamName,
  players,
  picks,
  selectedPlayerIds,
  selectedPickIds,
  search,
  loading,
  onSearch,
  onTogglePlayer,
  onTogglePick,
}: {
  label: string
  teamName: string
  players: RedraftRosterPlayerClient[]
  picks: DraftPickOption[]
  selectedPlayerIds: string[]
  selectedPickIds: string[]
  search: string
  loading: boolean
  onSearch: (value: string) => void
  onTogglePlayer: (value: string) => void
  onTogglePick: (value: string) => void
}) {
  const normalizedSearch = search.trim().toLowerCase()
  const visiblePlayers = players.filter((player) => {
    if (!normalizedSearch) return true
    return [player.playerName, player.position, player.team]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(normalizedSearch))
  })
  const selectedCount = selectedPlayerIds.length + selectedPickIds.length

  return (
    <section className="space-y-3 rounded-lg border border-white/10 bg-black/20 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold text-white">{label}</p>
          <p className="truncate text-[11px] text-white/55">{teamName}</p>
        </div>
        <span className="shrink-0 rounded border border-white/10 px-2 py-0.5 text-[10px] text-white/55">
          {selectedCount} selected
        </span>
      </div>

      <label className="block">
        <span className="sr-only">{label} trade player search</span>
        <input
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Search roster players"
          className="w-full rounded border border-white/15 bg-black/30 px-2 py-1 text-[11px] text-white placeholder:text-white/30"
        />
      </label>

      <div className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-white/45">Select Player</p>
        <div className="grid max-h-56 gap-1 overflow-auto pr-1">
          {loading ? (
            <p className="rounded border border-white/10 px-2 py-2 text-[11px] text-white/45">Loading roster...</p>
          ) : visiblePlayers.length ? (
            visiblePlayers.map((player) => {
              const selectionId = playerSelectionId(player)
              const selected = selectedPlayerIds.includes(selectionId)
              return (
                <button
                  key={player.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onTogglePlayer(selectionId)}
                  className={[
                    'grid min-h-10 grid-cols-[1fr_auto] items-center gap-2 rounded border px-2 py-1 text-left text-[11px]',
                    selected
                      ? 'border-emerald-300/70 bg-emerald-400/15 text-white'
                      : 'border-white/10 bg-white/[0.03] text-white/75 hover:border-white/25',
                  ].join(' ')}
                >
                  <span className="min-w-0 truncate font-medium">{player.playerName}</span>
                  <span className="text-[10px] text-white/45">
                    {player.position}
                    {player.team ? ` - ${player.team}` : ''}
                  </span>
                </button>
              )
            })
          ) : (
            <p className="rounded border border-white/10 px-2 py-2 text-[11px] text-white/45">No players found.</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-white/45">Select Pick</p>
        <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
          {picks.map((pick) => {
            const selected = selectedPickIds.includes(pick.id)
            return (
              <button
                key={pick.id}
                type="button"
                aria-pressed={selected}
                onClick={() => onTogglePick(pick.id)}
                className={[
                  'min-h-8 rounded border px-2 py-1 text-[11px]',
                  selected
                    ? 'border-sky-300/70 bg-sky-400/15 text-white'
                    : 'border-white/10 bg-white/[0.03] text-white/65 hover:border-white/25',
                ].join(' ')}
              >
                {pick.label}
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export function TradeCenter({
  leagueId,
  seasonId,
  standings,
  currentWeek = 1,
  seasonYear,
  isCommissioner = false,
}: {
  leagueId: string
  seasonId: string | null
  standings: RedraftRosterRow[]
  currentWeek?: number
  seasonYear?: number
  isCommissioner?: boolean
}) {
  const [proposals, setProposals] = useState<RedraftTradeProposal[]>([])
  const [loading, setLoading] = useState(false)
  const [assetLoading, setAssetLoading] = useState(false)
  const [busyProposalId, setBusyProposalId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [assetError, setAssetError] = useState<string | null>(null)
  const [createBusy, setCreateBusy] = useState(false)
  const [proposerRosterId, setProposerRosterId] = useState<string>('')
  const [receiverRosterId, setReceiverRosterId] = useState<string>('')
  const [proposerRoster, setProposerRoster] = useState<RedraftRosterClient | null>(null)
  const [receiverRoster, setReceiverRoster] = useState<RedraftRosterClient | null>(null)
  const [selectedProposerPlayers, setSelectedProposerPlayers] = useState<string[]>([])
  const [selectedReceiverPlayers, setSelectedReceiverPlayers] = useState<string[]>([])
  const [selectedProposerPicks, setSelectedProposerPicks] = useState<string[]>([])
  const [selectedReceiverPicks, setSelectedReceiverPicks] = useState<string[]>([])
  const [proposerSearch, setProposerSearch] = useState('')
  const [receiverSearch, setReceiverSearch] = useState('')
  const [reason, setReason] = useState('')

  const rosterNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const r of standings) map.set(r.id, rosterName(r, r.id))
    return map
  }, [standings])

  const effectiveSeasonYear = seasonYear ?? new Date().getFullYear()
  const pickOptions = useMemo(() => buildPickOptions(effectiveSeasonYear), [effectiveSeasonYear])

  const refresh = useCallback(async () => {
    if (!seasonId) {
      setProposals([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      const rows = await listTradeProposals({ leagueId, seasonId })
      setProposals(rows)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load trade proposals')
    } finally {
      setLoading(false)
    }
  }, [leagueId, seasonId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (standings.length < 2) {
      setProposerRosterId('')
      setReceiverRosterId('')
      return
    }
    setProposerRosterId((prev) => (prev && standings.some((r) => r.id === prev) ? prev : standings[0]!.id))
  }, [standings])

  useEffect(() => {
    if (!proposerRosterId || standings.length < 2) return
    setReceiverRosterId((prev) => {
      if (prev && prev !== proposerRosterId && standings.some((r) => r.id === prev)) return prev
      const fallback = standings.find((r) => r.id !== proposerRosterId)
      return fallback?.id ?? ''
    })
  }, [standings, proposerRosterId])

  useEffect(() => {
    setSelectedProposerPlayers([])
    setSelectedProposerPicks([])
    setProposerSearch('')
  }, [proposerRosterId])

  useEffect(() => {
    setSelectedReceiverPlayers([])
    setSelectedReceiverPicks([])
    setReceiverSearch('')
  }, [receiverRosterId])

  useEffect(() => {
    if (!seasonId || !proposerRosterId || !receiverRosterId || proposerRosterId === receiverRosterId) {
      setProposerRoster(null)
      setReceiverRoster(null)
      setAssetLoading(false)
      setAssetError(null)
      return
    }

    let cancelled = false
    setAssetLoading(true)
    setAssetError(null)
    ;(async () => {
      try {
        const [nextProposer, nextReceiver] = await Promise.all([
          fetchRedraftRoster(proposerRosterId, currentWeek),
          fetchRedraftRoster(receiverRosterId, currentWeek),
        ])
        if (!cancelled) {
          setProposerRoster(nextProposer)
          setReceiverRoster(nextReceiver)
        }
      } catch (e) {
        if (!cancelled) {
          setProposerRoster(null)
          setReceiverRoster(null)
          setAssetError(e instanceof Error ? e.message : 'Failed to load roster assets')
        }
      } finally {
        if (!cancelled) setAssetLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [currentWeek, proposerRosterId, receiverRosterId, seasonId])

  const selectedProposerPlayerRows = useMemo(
    () =>
      selectedProposerPlayers
        .map((id) => proposerRoster?.players.find((player) => playerSelectionId(player) === id) ?? null)
        .filter((player): player is RedraftRosterPlayerClient => Boolean(player)),
    [proposerRoster, selectedProposerPlayers],
  )
  const selectedReceiverPlayerRows = useMemo(
    () =>
      selectedReceiverPlayers
        .map((id) => receiverRoster?.players.find((player) => playerSelectionId(player) === id) ?? null)
        .filter((player): player is RedraftRosterPlayerClient => Boolean(player)),
    [receiverRoster, selectedReceiverPlayers],
  )
  const selectedProposerPickRows = useMemo(
    () => selectedProposerPicks.map((id) => pickOptions.find((pick) => pick.id === id) ?? null).filter(isDraftPickOption),
    [pickOptions, selectedProposerPicks],
  )
  const selectedReceiverPickRows = useMemo(
    () => selectedReceiverPicks.map((id) => pickOptions.find((pick) => pick.id === id) ?? null).filter(isDraftPickOption),
    [pickOptions, selectedReceiverPicks],
  )

  const rosterASends = useMemo<RedraftTradeBuilderAsset[]>(
    () => [...selectedProposerPlayerRows.map(playerToAnalysisAsset), ...selectedProposerPickRows.map(pickToAnalysisAsset)],
    [selectedProposerPickRows, selectedProposerPlayerRows],
  )
  const rosterBSends = useMemo<RedraftTradeBuilderAsset[]>(
    () => [...selectedReceiverPlayerRows.map(playerToAnalysisAsset), ...selectedReceiverPickRows.map(pickToAnalysisAsset)],
    [selectedReceiverPickRows, selectedReceiverPlayerRows],
  )

  const analysis = useMemo(
    () =>
      analyzeRedraftTradeBuilder({
        rosterALabel: 'Team A',
        rosterBLabel: 'Team B',
        rosterASends,
        rosterBSends,
      }),
    [rosterASends, rosterBSends],
  )

  const apiAssets = useMemo<RedraftTradeAssetInput[]>(() => {
    if (!proposerRosterId || !receiverRosterId) return []
    return [
      ...selectedProposerPlayerRows.map((player) => playerToApiAsset(player, proposerRosterId, receiverRosterId)),
      ...selectedProposerPickRows.map((pick) => pickToApiAsset(pick, proposerRosterId, receiverRosterId)),
      ...selectedReceiverPlayerRows.map((player) => playerToApiAsset(player, receiverRosterId, proposerRosterId)),
      ...selectedReceiverPickRows.map((pick) => pickToApiAsset(pick, receiverRosterId, proposerRosterId)),
    ]
  }, [
    proposerRosterId,
    receiverRosterId,
    selectedProposerPickRows,
    selectedProposerPlayerRows,
    selectedReceiverPickRows,
    selectedReceiverPlayerRows,
  ])

  const proposerAssetsSelected = selectedProposerPlayers.length + selectedProposerPicks.length > 0
  const receiverAssetsSelected = selectedReceiverPlayers.length + selectedReceiverPicks.length > 0
  const canCreate = Boolean(
    seasonId &&
      proposerRosterId &&
      receiverRosterId &&
      proposerRosterId !== receiverRosterId &&
      proposerAssetsSelected &&
      receiverAssetsSelected &&
      !assetLoading,
  )

  const onRosterAChange = (nextRosterId: string) => {
    setProposerRosterId(nextRosterId)
    if (nextRosterId === receiverRosterId) {
      setReceiverRosterId(standings.find((r) => r.id !== nextRosterId)?.id ?? '')
    }
  }

  const onRosterBChange = (nextRosterId: string) => {
    setReceiverRosterId(nextRosterId)
    if (nextRosterId === proposerRosterId) {
      setProposerRosterId(standings.find((r) => r.id !== nextRosterId)?.id ?? '')
    }
  }

  const onCreateProposal = async () => {
    if (!seasonId || !canCreate) return
    setCreateBusy(true)
    setError(null)
    try {
      await createTradeProposal({
        leagueId,
        seasonId,
        proposerRosterId,
        receiverRosterId,
        reason: reason.trim() || undefined,
        assets: apiAssets,
      })
      setReason('')
      setSelectedProposerPlayers([])
      setSelectedReceiverPlayers([])
      setSelectedProposerPicks([])
      setSelectedReceiverPicks([])
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create proposal')
    } finally {
      setCreateBusy(false)
    }
  }

  const onAction = async (proposalId: string, action: Parameters<typeof submitTradeVote>[0]['action']) => {
    setBusyProposalId(proposalId)
    setError(null)
    try {
      await submitTradeVote({ proposalId, action })
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : `Failed to ${action}`)
    } finally {
      setBusyProposalId(null)
    }
  }

  const onVeto = async (proposalId: string) => {
    setBusyProposalId(proposalId)
    setError(null)
    try {
      await vetoRedraftTradeProposal({ proposalId })
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to veto proposal')
    } finally {
      setBusyProposalId(null)
    }
  }

  const proposerTeamName = rosterNameById.get(proposerRosterId) ?? proposerRosterId.slice(0, 6)
  const receiverTeamName = rosterNameById.get(receiverRosterId) ?? receiverRosterId.slice(0, 6)

  return (
    <div className="space-y-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[12px] font-semibold text-white">Trade Center</p>
          <p className="text-[11px] text-white/50">Build player and pick proposals before league review.</p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading || !seasonId}
          className="rounded border border-white/15 px-2 py-1 text-[11px] text-white/80 disabled:opacity-50"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="space-y-3 rounded-lg border border-white/10 bg-black/20 p-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[12px] font-semibold text-white">Trade Creation</p>
            <p className="text-[11px] text-white/45">Select players or future redraft picks from both rosters.</p>
          </div>
          <button
            type="button"
            onClick={() => void onCreateProposal()}
            disabled={createBusy || !canCreate}
            className="min-h-8 rounded bg-emerald-500/80 px-3 py-1 text-[11px] font-semibold text-black disabled:opacity-50"
          >
            {createBusy ? 'Creating...' : 'Submit Trade'}
          </button>
        </div>

        <div className="grid gap-2 lg:grid-cols-[1fr_1fr_1.4fr]">
          <label className="space-y-1 text-[11px] text-white/55">
            Roster A
            <select
              aria-label="Roster A"
              value={proposerRosterId}
              onChange={(e) => onRosterAChange(e.target.value)}
              className="w-full rounded border border-white/15 bg-black/30 px-2 py-1 text-[11px] text-white"
            >
              {standings.map((r) => (
                <option key={r.id} value={r.id}>
                  {rosterName(r, r.id)}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-[11px] text-white/55">
            Roster B
            <select
              aria-label="Roster B"
              value={receiverRosterId}
              onChange={(e) => onRosterBChange(e.target.value)}
              className="w-full rounded border border-white/15 bg-black/30 px-2 py-1 text-[11px] text-white"
            >
              {standings.map((r) => (
                <option key={r.id} value={r.id}>
                  {rosterName(r, r.id)}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-[11px] text-white/55">
            Reason
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Optional note for league managers"
              className="w-full rounded border border-white/15 bg-black/30 px-2 py-1 text-[11px] text-white placeholder:text-white/30"
            />
          </label>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <TradeAssetSide
            label="Roster A"
            teamName={proposerTeamName}
            players={proposerRoster?.players ?? []}
            picks={pickOptions}
            selectedPlayerIds={selectedProposerPlayers}
            selectedPickIds={selectedProposerPicks}
            search={proposerSearch}
            loading={assetLoading}
            onSearch={setProposerSearch}
            onTogglePlayer={(value) => setSelectedProposerPlayers((prev) => toggleSelection(prev, value))}
            onTogglePick={(value) => setSelectedProposerPicks((prev) => toggleSelection(prev, value))}
          />
          <TradeAssetSide
            label="Roster B"
            teamName={receiverTeamName}
            players={receiverRoster?.players ?? []}
            picks={pickOptions}
            selectedPlayerIds={selectedReceiverPlayers}
            selectedPickIds={selectedReceiverPicks}
            search={receiverSearch}
            loading={assetLoading}
            onSearch={setReceiverSearch}
            onTogglePlayer={(value) => setSelectedReceiverPlayers((prev) => toggleSelection(prev, value))}
            onTogglePick={(value) => setSelectedReceiverPicks((prev) => toggleSelection(prev, value))}
          />
        </div>

        <div className="space-y-2 rounded-lg border border-white/10 bg-white/[0.03] p-3">
          <p className="text-[12px] font-semibold text-white">Trade Analyzer</p>
          <div className="grid gap-2 md:grid-cols-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-white/45">Fairness score</p>
              <p className="mt-1 text-[18px] font-bold text-white">{analysis.fairnessScore}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-white/45">Risk score</p>
              <p className="mt-1 text-[18px] font-bold text-white">{analysis.riskScore}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-white/45">Positional impact</p>
              <p className="mt-1 text-[11px] leading-5 text-white/70">{analysis.positionalImpact}</p>
            </div>
            <div className="md:col-span-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-white/45">Chimmy Explanation</p>
              <p className="mt-1 text-[11px] leading-5 text-white/75">{analysis.chimmyExplanation}</p>
            </div>
          </div>
        </div>

        {!proposerAssetsSelected || !receiverAssetsSelected ? (
          <p className="text-[11px] text-amber-100/80">Choose at least one asset from Roster A and Roster B.</p>
        ) : null}
        {assetError ? <p className="text-[11px] text-rose-300">{assetError}</p> : null}
      </div>

      {error ? <p className="text-[11px] text-rose-300">{error}</p> : null}

      <div className="space-y-2">
        {proposals.length === 0 ? (
          <p className="text-[11px] text-white/45">No trade proposals yet.</p>
        ) : (
          proposals.map((p) => {
            const proposerAssets = p.assets.filter((asset) => asset.fromRosterId === p.proposerRosterId)
            const receiverAssets = p.assets.filter((asset) => asset.fromRosterId === p.receiverRosterId)
            return (
              <div key={p.id} className="rounded border border-white/10 bg-black/20 p-3 text-[11px] text-white/80">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-white">
                    {rosterNameById.get(p.proposerRosterId) ?? p.proposerRosterId.slice(0, 6)}{' -> '}
                    {rosterNameById.get(p.receiverRosterId) ?? p.receiverRosterId.slice(0, 6)}
                  </p>
                  <span className="rounded border border-white/10 px-2 py-0.5 text-[10px] uppercase text-white/60">
                    {p.status}
                  </span>
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <div className="rounded border border-white/10 bg-white/[0.03] p-2">
                    <p className="font-semibold text-white/70">
                      {rosterNameById.get(p.proposerRosterId) ?? 'Roster A'} sends
                    </p>
                    <p className="mt-1 text-white/55">
                      {proposerAssets.length ? proposerAssets.map(formatProposalAsset).join(', ') : 'No assets listed'}
                    </p>
                  </div>
                  <div className="rounded border border-white/10 bg-white/[0.03] p-2">
                    <p className="font-semibold text-white/70">
                      {rosterNameById.get(p.receiverRosterId) ?? 'Roster B'} sends
                    </p>
                    <p className="mt-1 text-white/55">
                      {receiverAssets.length ? receiverAssets.map(formatProposalAsset).join(', ') : 'No assets listed'}
                    </p>
                  </div>
                </div>
                <p className="mt-2 text-white/55">{p.reason || 'No reason provided.'}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded border border-white/20 px-2 py-1 disabled:opacity-50"
                    disabled={busyProposalId === p.id || p.status !== 'pending'}
                    onClick={() => void onAction(p.id, 'accept')}
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    className="rounded border border-white/20 px-2 py-1 disabled:opacity-50"
                    disabled={busyProposalId === p.id || p.status !== 'pending'}
                    onClick={() => void onAction(p.id, 'reject')}
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    className="rounded border border-white/20 px-2 py-1 disabled:opacity-50"
                    disabled={busyProposalId === p.id || p.status !== 'pending'}
                    onClick={() => void onAction(p.id, 'cancel')}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="rounded border border-white/20 px-2 py-1 disabled:opacity-50"
                    disabled={busyProposalId === p.id || p.status !== 'pending'}
                    onClick={() => void onAction(p.id, 'vote_approve')}
                  >
                    Vote Approve
                  </button>
                  <button
                    type="button"
                    className="rounded border border-white/20 px-2 py-1 disabled:opacity-50"
                    disabled={busyProposalId === p.id || p.status !== 'pending'}
                    onClick={() => void onAction(p.id, 'vote_veto')}
                  >
                    Vote Veto
                  </button>
                  {isCommissioner ? (
                    <button
                      type="button"
                      className="rounded border border-rose-500/40 px-2 py-1 text-rose-300 disabled:opacity-50"
                      disabled={busyProposalId === p.id || p.status !== 'pending'}
                      onClick={() => void onVeto(p.id)}
                    >
                      Commissioner Veto
                    </button>
                  ) : null}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
