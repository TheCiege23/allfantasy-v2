"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Check, Loader2, Sparkles } from "lucide-react"
import {
  fetchWorldCupGroupStageView,
  saveWorldCupGroupRankingClient,
  saveWorldCupThirdPlaceAdvancersClient,
  type WorldCupGroupStageTeamClient,
  type WorldCupGroupStageViewClient,
} from "@/lib/world-cup/worldCupClientApi"

type Props = {
  challengeId: string
  entryId: string
  onCompletionChanged?: () => void
  onDirtyChange?: (hasUnsavedChanges: boolean) => void
  aiInsightsUnlocked?: boolean
}

type GroupSaveState = "idle" | "dirty" | "saving" | "saved" | "error"

function orderedTeamIdsForGroup(view: WorldCupGroupStageViewClient, groupId: string): string[] {
  const group = view.groups.find((row) => row.id === groupId)
  const picks = view.groupRankingPicks
    .filter((pick) => pick.groupId === groupId)
    .sort((a, b) => a.predictedRank - b.predictedRank)
    .map((pick) => pick.teamId)
  if (picks.length === 4) return picks
  return group?.teams.slice().sort((a, b) => a.seedOrder - b.seedOrder).map((team) => team.teamId) ?? []
}

function isGroupRanked(view: WorldCupGroupStageViewClient, groupId: string): boolean {
  const ranks = new Set(
    view.groupRankingPicks
      .filter((pick) => pick.groupId === groupId)
      .map((pick) => pick.predictedRank)
  )
  return [1, 2, 3, 4].every((rank) => ranks.has(rank))
}

function findTeam(groupTeams: WorldCupGroupStageTeamClient[], teamId: string) {
  return groupTeams.find((team) => team.teamId === teamId) ?? null
}

function resultBorderClass(status: "correct" | "wrong" | "pending" | "none") {
  if (status === "correct") return "border-cyan-300/80 shadow-[0_0_0_1px_rgba(103,232,249,0.28)]"
  if (status === "wrong") return "border-rose-400/70 shadow-[0_0_0_1px_rgba(251,113,133,0.2)]"
  if (status === "pending") return "border-amber-300/70 shadow-[0_0_0_1px_rgba(252,211,77,0.22)]"
  return "border-white/10"
}

function resultBadge(status: "correct" | "wrong" | "pending" | "none", pointsAwarded = 0) {
  if (status === "correct") return { label: `Correct +${pointsAwarded}`, className: "border-cyan-300/30 bg-cyan-300/10 text-cyan-100" }
  if (status === "wrong") return { label: "Wrong +0", className: "border-rose-300/30 bg-rose-400/10 text-rose-100" }
  if (status === "pending") return { label: "Pending", className: "border-amber-300/25 bg-amber-400/10 text-amber-100" }
  return null
}

function groupPickForTeam(view: WorldCupGroupStageViewClient, groupId: string, teamId: string) {
  return view.groupRankingPicks.find((pick) => pick.groupId === groupId && pick.teamId === teamId) ?? null
}

function groupRankingResultStatus(view: WorldCupGroupStageViewClient, groupId: string, teamId: string) {
  const pick = groupPickForTeam(view, groupId, teamId)
  if (!pick) return "none"
  if (pick.isCorrect === true) return "correct"
  if (pick.isCorrect === false) return "wrong"
  return pick.actualRank ? "pending" : "pending"
}

function thirdPlaceResultStatus(view: WorldCupGroupStageViewClient, teamId: string | null | undefined) {
  if (!teamId) return "none"
  const pick = view.thirdPlaceAdvancerPicks.find((row) => row.teamId === teamId && row.isSelected)
  if (!pick) return "none"
  if (pick.isCorrect === true) return "correct"
  if (pick.isCorrect === false) return "wrong"
  return "pending"
}

function moveItem(ids: string[], index: number, direction: -1 | 1) {
  const nextIndex = index + direction
  if (nextIndex < 0 || nextIndex >= ids.length) return ids
  const next = [...ids]
  const current = next[index]
  next[index] = next[nextIndex]
  next[nextIndex] = current
  return next
}

function sameOrderedValues(a: string[], b: string[]) {
  return a.length === b.length && a.every((value, index) => value === b[index])
}

function sameValueSet(a: string[], b: string[]) {
  if (a.length !== b.length) return false
  const sortedA = [...a].sort()
  const sortedB = [...b].sort()
  return sortedA.every((value, index) => value === sortedB[index])
}

function savedThirdPlaceTeamIds(view: WorldCupGroupStageViewClient): string[] {
  return view.thirdPlaceAdvancerPicks
    .filter((pick) => pick.isSelected)
    .map((pick) => pick.teamId)
}

function GroupAiInsightPanel({
  groupName,
  order,
  teams,
  unlocked,
}: {
  groupName: string
  order: string[]
  teams: WorldCupGroupStageTeamClient[]
  unlocked: boolean
}) {
  const teamById = new Map(teams.map((team) => [team.teamId, team]))
  const orderedTeams = order.map((teamId) => teamById.get(teamId)).filter((team): team is WorldCupGroupStageTeamClient => Boolean(team))
  const safest = orderedTeams[0]?.name ?? "Rank the group first"
  const upside = orderedTeams[1]?.name ?? orderedTeams[0]?.name ?? "Add a runner-up"
  const chaos = orderedTeams[2]?.name ?? orderedTeams.at(-1)?.name ?? "No third-place pick yet"
  return (
    <details
      data-testid={`world-cup-group-ai-insight-${groupName.replace(/\s+/g, "-").toLowerCase()}`}
      className="mt-3 rounded-xl border border-cyan-300/20 bg-cyan-300/[0.055] p-3 text-xs text-cyan-50"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 font-black">
        <span className="inline-flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5" />
          AI Insights
        </span>
        <span className="rounded-full border border-cyan-200/25 px-2 py-0.5 text-[10px] uppercase tracking-wide">
          {unlocked ? "Open" : "Locked"}
        </span>
      </summary>
      {unlocked ? (
        <div className="mt-3 space-y-2 leading-5 text-cyan-50/85">
          <p><span className="font-black text-white">Safest group winner:</span> {safest} based on your current top slot.</p>
          <p><span className="font-black text-white">Highest-upside pick:</span> {upside} as the pressure pick if you want a less chalk-heavy bracket.</p>
          <p><span className="font-black text-white">Chaos/upset risk:</span> {chaos} is the volatility marker from your current third-place slot.</p>
          <p className="rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-[11px] text-white/55">
            Prediction and scoring complexity only. Bracket guidance stays limited to pool picks and scoring mechanics.
          </p>
        </div>
      ) : (
        <div className="mt-3 rounded-lg border border-white/10 bg-black/25 px-2 py-2 text-[11px] leading-5 text-white/60" hidden>
          Upgrade to AI/Pro to open deterministic World Cup insights. No AI is called while this is locked.
        </div>
      )}
    </details>
  )
}

function ThirdPlaceAiInsightPanel({
  selectedCount,
  missingCount,
  unlocked,
}: {
  selectedCount: number
  missingCount: number
  unlocked: boolean
}) {
  return (
    <details data-testid="world-cup-third-place-ai-insight" className="mt-3 rounded-xl border border-cyan-300/20 bg-cyan-300/[0.055] p-3 text-xs text-cyan-50">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 font-black">
        <span className="inline-flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5" /> Ask Chimmy</span>
        <span className="rounded-full border border-cyan-200/25 px-2 py-0.5 text-[10px] uppercase tracking-wide">{unlocked ? "Open" : "Locked"}</span>
      </summary>
      {unlocked ? (
        <div className="mt-3 space-y-2 leading-5 text-cyan-50/85">
          <p><span className="font-black text-white">Current selected 8:</span> {selectedCount}/8 selected, {missingCount} remaining.</p>
          <p><span className="font-black text-white">Risk check:</span> Avoid overloading weaker groups unless you want a contrarian bracket shape.</p>
          <p><span className="font-black text-white">Contrarian reminder:</span> One or two volatile third-place calls can separate your bracket without turning every slot into chaos.</p>
          <p className="rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-[11px] text-white/55">
            Prediction and scoring complexity only. Bracket guidance stays limited to pool picks and scoring mechanics.
          </p>
        </div>
      ) : (
        <div className="mt-3 rounded-lg border border-white/10 bg-black/25 px-2 py-2 text-[11px] leading-5 text-white/60" hidden>
          AI/Pro unlocks third-place selection insights. Locked users only see this CTA and no AI request is made.
        </div>
      )}
    </details>
  )
}

export default function WorldCupGroupStagePicks({ challengeId, entryId, onCompletionChanged, onDirtyChange, aiInsightsUnlocked = false }: Props) {
  const [view, setView] = useState<WorldCupGroupStageViewClient | null>(null)
  const [localOrders, setLocalOrders] = useState<Record<string, string[]>>({})
  const [saveStates, setSaveStates] = useState<Record<string, GroupSaveState>>({})
  const [thirdPlaceSelection, setThirdPlaceSelection] = useState<Set<string>>(new Set())
  const [thirdPlaceStatus, setThirdPlaceStatus] = useState<GroupSaveState>("idle")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [thirdPlaceError, setThirdPlaceError] = useState<string | null>(null)
  const savingGroupIdsRef = useRef<Set<string>>(new Set())
  const savingThirdPlaceRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)
    fetchWorldCupGroupStageView(challengeId, entryId)
      .then((nextView) => {
        if (cancelled) return
        setView(nextView)
        const nextOrders: Record<string, string[]> = {}
        const nextSaveStates: Record<string, GroupSaveState> = {}
        for (const group of nextView.groups) {
          nextOrders[group.id] = orderedTeamIdsForGroup(nextView, group.id)
          if (isGroupRanked(nextView, group.id)) nextSaveStates[group.id] = "saved"
        }
        setLocalOrders(nextOrders)
        setSaveStates(nextSaveStates)
        setThirdPlaceSelection(new Set(nextView.thirdPlaceAdvancerPicks.filter((pick) => pick.isSelected).map((pick) => pick.teamId)))
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : "Failed to load group stage")
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [challengeId, entryId])

  const isLocked = Boolean(view?.lock.isLocked)
  const hasUnsavedThirdPlaceChanges = Boolean(
    view && !sameValueSet([...thirdPlaceSelection], savedThirdPlaceTeamIds(view))
  )
  const hasUnsavedGroupOrderChanges = Boolean(
    view?.groups.some((group) =>
      !sameOrderedValues(
        localOrders[group.id] ?? orderedTeamIdsForGroup(view, group.id),
        orderedTeamIdsForGroup(view, group.id)
      )
    )
  )
  const hasUnsavedChanges = hasUnsavedGroupOrderChanges || hasUnsavedThirdPlaceChanges

  useEffect(() => {
    onDirtyChange?.(hasUnsavedChanges)
    return () => onDirtyChange?.(false)
  }, [hasUnsavedChanges, onDirtyChange])

  const thirdPlaceCandidates = useMemo(() => {
    if (!view) return []
    return view.groups.map((group) => {
      const order = localOrders[group.id] ?? orderedTeamIdsForGroup(view, group.id)
      const teamId = order[2] ?? null
      const team = teamId ? findTeam(group.teams, teamId) : null
      return { groupId: group.id, groupKey: group.groupKey, displayName: group.displayName, team }
    })
  }, [localOrders, view])

  function setGroupOrder(groupId: string, orderedTeamIds: string[]) {
    setLocalOrders((prev) => ({ ...prev, [groupId]: orderedTeamIds }))
    setSaveStates((prev) => ({ ...prev, [groupId]: "dirty" }))
  }

  async function saveGroup(groupId: string) {
    if (savingGroupIdsRef.current.has(groupId)) return
    const orderedTeamIds = localOrders[groupId] ?? []
    const group = view?.groups.find((row) => row.id === groupId)
    if (view && sameOrderedValues(orderedTeamIds, orderedTeamIdsForGroup(view, groupId))) {
      setSaveStates((prev) => ({ ...prev, [groupId]: "saved" }))
      return
    }
    if (group && group.teams.length !== 4) {
      setSaveStates((prev) => ({ ...prev, [groupId]: "error" }))
      setError(`${group.displayName} needs 4 teams before it can be saved.`)
      return
    }
    savingGroupIdsRef.current.add(groupId)
    setSaveStates((prev) => ({ ...prev, [groupId]: "saving" }))
    setError(null)
    try {
      const nextView = await saveWorldCupGroupRankingClient(challengeId, entryId, groupId, orderedTeamIds)
      setView(nextView)
      const nextOrders: Record<string, string[]> = {}
      const nextSaveStates: Record<string, GroupSaveState> = {}
      for (const group of nextView.groups) {
        nextOrders[group.id] = orderedTeamIdsForGroup(nextView, group.id)
        if (isGroupRanked(nextView, group.id)) nextSaveStates[group.id] = "saved"
      }
      setLocalOrders(nextOrders)
      setSaveStates((prev) => ({ ...nextSaveStates, [groupId]: "saved" }))
      setThirdPlaceSelection(new Set(nextView.thirdPlaceAdvancerPicks.filter((pick) => pick.isSelected).map((pick) => pick.teamId)))
      onCompletionChanged?.()
    } catch (err) {
      setSaveStates((prev) => ({ ...prev, [groupId]: "error" }))
      setError(err instanceof Error ? err.message : "Failed to save group ranking")
    } finally {
      savingGroupIdsRef.current.delete(groupId)
    }
  }

  function toggleThirdPlace(teamId: string) {
    if (isLocked || !view?.completion.allGroupsRanked) return
    setThirdPlaceSelection((prev) => {
      const next = new Set(prev)
      if (next.has(teamId)) {
        next.delete(teamId)
      } else if (next.size < 8) {
        next.add(teamId)
      } else {
        setThirdPlaceError("Choose exactly 8 third-place advancers.")
      }
      return next
    })
    setThirdPlaceStatus("dirty")
  }

  async function saveThirdPlace() {
    if (savingThirdPlaceRef.current) return
    setThirdPlaceError(null)
    if (!view?.completion.allGroupsRanked) {
      setThirdPlaceError("Rank all 12 groups before choosing third-place advancers.")
      return
    }
    if (thirdPlaceSelection.size !== 8) {
      setThirdPlaceError("Choose exactly 8 third-place advancers.")
      return
    }
    savingThirdPlaceRef.current = true
    setThirdPlaceStatus("saving")
    try {
      const nextView = await saveWorldCupThirdPlaceAdvancersClient(challengeId, entryId, {
        selectedTeamIds: [...thirdPlaceSelection],
      })
      setView(nextView)
      setThirdPlaceSelection(new Set(nextView.thirdPlaceAdvancerPicks.filter((pick) => pick.isSelected).map((pick) => pick.teamId)))
      setThirdPlaceStatus("saved")
      onCompletionChanged?.()
    } catch (err) {
      setThirdPlaceStatus("error")
      setThirdPlaceError(err instanceof Error ? err.message : "Failed to save third-place advancers")
    } finally {
      savingThirdPlaceRef.current = false
    }
  }

  if (isLoading) {
    return (
      <section data-testid="world-cup-group-stage-loading" className="mx-auto max-w-6xl rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-sm text-white/55">
        <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
        Loading group-stage picks...
      </section>
    )
  }

  if (error && !view) {
    return (
      <section className="mx-auto max-w-4xl rounded-2xl border border-rose-400/25 bg-rose-400/10 p-4 text-sm text-rose-100">
        {error}
      </section>
    )
  }

  if (!view) return null

  return (
    <section data-testid="world-cup-group-stage-picks" className="mx-auto max-w-6xl space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-black text-white">Group Stage Picks</h2>
            <p className="mt-1 text-sm text-white/50">
              Rank each group 1st through 4th, then choose 8 third-place teams to advance.
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm font-bold text-white/70">
            Groups ranked: {view.completion.groupsRankedCount}/12
          </div>
        </div>
        {isLocked ? (
          <p className="mt-3 rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs font-bold text-rose-100">
            Group-stage picks are locked{view.lock.lockReason ? `: ${view.lock.lockReason}` : "."}
          </p>
        ) : null}
        {error ? <p className="mt-3 rounded-lg bg-rose-400/10 px-3 py-2 text-xs text-rose-100">{error}</p> : null}
        {view.warnings.length > 0 ? (
          <div className="mt-3 space-y-1 rounded-lg border border-amber-300/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
            {view.warnings.slice(0, 4).map((warning) => (
              <p key={`${warning.code}-${warning.groupKey ?? warning.message}`}>{warning.message}</p>
            ))}
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {view.groups.map((group) => {
          const order = localOrders[group.id] ?? orderedTeamIdsForGroup(view, group.id)
          const state = saveStates[group.id] ?? "idle"
          const hasCompleteTeams = group.teams.length === 4 && order.length === 4
          const hasUnsavedOrderChanges = !sameOrderedValues(order, orderedTeamIdsForGroup(view, group.id))
          return (
            <div key={group.id} data-testid={`world-cup-group-${group.groupKey}`} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="font-black text-white">{group.displayName}</h3>
                <span className="text-xs text-white/45">{order.length}/4 teams</span>
              </div>
              <div className="space-y-2">
                {order.map((teamId, index) => {
                  const team = findTeam(group.teams, teamId)
                  const pick = groupPickForTeam(view, group.id, teamId)
                  const status = groupRankingResultStatus(view, group.id, teamId)
                  const badge = resultBadge(status, pick?.pointsAwarded ?? 0)
                  return (
                    <div
                      key={teamId}
                      data-testid={`world-cup-group-pick-result-${group.groupKey}-${teamId}`}
                      data-result-state={status}
                      className={`flex flex-wrap items-center gap-2 rounded-xl border bg-black/20 px-2 py-2 sm:flex-nowrap ${resultBorderClass(status)}`}
                    >
                      <span className="w-7 shrink-0 text-center text-sm font-black text-cyan-100">{index + 1}</span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-bold text-white">{team?.name ?? teamId}</div>
                        <div className="truncate text-xs text-white/40">
                          {team?.country ?? "Team"}
                          {team?.actualRank ? ` · Actual #${team.actualRank}` : ""}
                        </div>
                      </div>
                      {badge ? (
                        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-black ${badge.className}`}>
                          {badge.label}
                        </span>
                      ) : null}
                      <div className="grid w-full grid-cols-2 gap-1 sm:flex sm:w-auto sm:shrink-0">
                        <button
                          type="button"
                          onClick={() => setGroupOrder(group.id, moveItem(order, index, -1))}
                          disabled={isLocked || index === 0}
                          className="min-h-9 rounded-lg border border-white/10 bg-white/[0.06] px-2 py-1 text-[10px] font-bold text-white/70 touch-manipulation disabled:opacity-35"
                        >
                          Move Up
                        </button>
                        <button
                          type="button"
                          onClick={() => setGroupOrder(group.id, moveItem(order, index, 1))}
                          disabled={isLocked || index === order.length - 1}
                          className="min-h-9 rounded-lg border border-white/10 bg-white/[0.06] px-2 py-1 text-[10px] font-bold text-white/70 touch-manipulation disabled:opacity-35"
                        >
                          Move Down
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
              {!hasCompleteTeams ? (
                <p className="mt-3 rounded-lg border border-amber-300/25 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-100">
                  {group.displayName} needs 4 teams before it can be saved.
                </p>
              ) : null}
              {hasUnsavedOrderChanges ? (
                <p className="mt-3 rounded-lg border border-cyan-300/25 bg-cyan-400/10 px-3 py-2 text-xs font-bold text-cyan-100">
                  Unsaved order change. Click Save Group before Review will count it.
                </p>
              ) : state === "saved" ? (
                <p className="mt-3 rounded-lg border border-emerald-300/20 bg-emerald-400/10 px-3 py-2 text-xs font-bold text-emerald-100">
                  Saved. Review uses this group order.
                </p>
              ) : null}
              <GroupAiInsightPanel
                groupName={group.displayName}
                order={order}
                teams={group.teams}
                unlocked={aiInsightsUnlocked}
              />
              <button
                type="button"
                onClick={() => void saveGroup(group.id)}
                disabled={isLocked || state === "saving" || !hasCompleteTeams || !hasUnsavedOrderChanges}
                className="mt-3 w-full rounded-xl bg-cyan-300 px-3 py-2 text-xs font-black text-black disabled:cursor-not-allowed disabled:opacity-45"
              >
                {state === "saving" ? "Saving..." : state === "saved" && !hasUnsavedOrderChanges ? "Saved" : state === "error" ? "Retry Save" : "Save Group"}
              </button>
            </div>
          )
        })}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-lg font-black text-white">Third-Place Advancers</h3>
            <p className="mt-1 text-sm text-white/50">
              Choose exactly 8 predicted third-place teams after all groups are ranked.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <div data-testid="world-cup-third-place-count" className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm font-bold text-white/70">
              Third-place advancers selected: {thirdPlaceSelection.size}/8
            </div>
            <button
              type="button"
              onClick={() => void saveThirdPlace()}
              disabled={isLocked || !view.completion.allGroupsRanked || thirdPlaceStatus === "saving" || !hasUnsavedThirdPlaceChanges}
              className="min-h-11 rounded-xl bg-cyan-300 px-4 py-2 text-sm font-black text-black touch-manipulation disabled:cursor-not-allowed disabled:opacity-45"
            >
              {thirdPlaceStatus === "saving" ? "Saving..." : thirdPlaceStatus === "saved" ? "Saved" : "Save Third-Place"}
            </button>
          </div>
        </div>

        {!view.completion.allGroupsRanked ? (
          <p className="mt-3 rounded-lg border border-amber-300/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
            Rank all 12 groups before selecting third-place advancers.
          </p>
        ) : null}
        {thirdPlaceError ? <p className="mt-3 rounded-lg bg-rose-400/10 px-3 py-2 text-xs text-rose-100">{thirdPlaceError}</p> : null}
        {hasUnsavedThirdPlaceChanges ? (
          <p className="mt-3 rounded-lg border border-cyan-300/25 bg-cyan-400/10 px-3 py-2 text-xs font-bold text-cyan-100">
            Unsaved third-place changes. Click Save Third-Place Advancers before Review will count them.
          </p>
        ) : thirdPlaceStatus === "saved" ? (
          <p className="mt-3 rounded-lg border border-emerald-300/20 bg-emerald-400/10 px-3 py-2 text-xs font-bold text-emerald-100">
            Third-place picks saved. Review uses these selections.
          </p>
        ) : null}
        <ThirdPlaceAiInsightPanel
          selectedCount={thirdPlaceSelection.size}
          missingCount={Math.max(0, 8 - thirdPlaceSelection.size)}
          unlocked={aiInsightsUnlocked}
        />

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {thirdPlaceCandidates.map((candidate) => {
            const isSelected = Boolean(candidate.team?.teamId && thirdPlaceSelection.has(candidate.team.teamId))
            const status = thirdPlaceResultStatus(view, candidate.team?.teamId)
            const pick = candidate.team?.teamId
              ? view.thirdPlaceAdvancerPicks.find((row) => row.teamId === candidate.team?.teamId && row.isSelected)
              : null
            const badge = resultBadge(status, pick?.pointsAwarded ?? 0)
            return (
              <label
                key={candidate.groupId}
                data-testid={`world-cup-third-place-result-${candidate.groupKey}`}
                data-result-state={status}
                data-selected={isSelected ? "true" : "false"}
                className={[
                  "flex min-h-[4.75rem] items-center gap-3 rounded-2xl border px-3 py-3 text-sm transition",
                  resultBorderClass(status),
                  isSelected
                    ? "border-cyan-200 bg-cyan-300/18 text-cyan-50 shadow-[0_0_0_2px_rgba(103,232,249,0.35),0_14px_36px_rgba(8,145,178,0.22)]"
                    : "border-white/10 bg-black/25 text-white/75",
                  isLocked || !view.completion.allGroupsRanked || !candidate.team ? "opacity-60" : "cursor-pointer hover:border-cyan-200/50 hover:bg-cyan-300/10",
                ].join(" ")}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => candidate.team && toggleThirdPlace(candidate.team.teamId)}
                  disabled={isLocked || !view.completion.allGroupsRanked || !candidate.team}
                  className="sr-only"
                  aria-label={`Select ${candidate.team?.name ?? candidate.displayName} as a third-place advancer`}
                />
                <span
                  aria-hidden
                  className={[
                    "grid h-9 w-9 shrink-0 place-items-center rounded-xl border text-sm font-black",
                    isSelected
                      ? "border-cyan-100 bg-cyan-200 text-slate-950 shadow-[0_0_18px_rgba(103,232,249,0.45)]"
                      : "border-white/15 bg-white/[0.06] text-white/30",
                  ].join(" ")}
                >
                  {isSelected ? <Check className="h-5 w-5 stroke-[3]" /> : candidate.groupKey}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={isSelected ? "block text-xs font-black uppercase tracking-wide text-cyan-100" : "block text-xs font-black uppercase tracking-wide text-white/45"}>
                    {candidate.displayName}
                  </span>
                  <span className="block truncate text-base font-black text-white">{candidate.team?.name ?? "No 3rd-place pick yet"}</span>
                  <span className={isSelected ? "mt-0.5 block text-[11px] font-bold text-cyan-100" : "mt-0.5 block text-[11px] text-white/40"}>
                    {isSelected ? "Selected to advance" : "Tap to select"}
                  </span>
                </span>
                {badge ? (
                  <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-black ${badge.className}`}>
                    {badge.label}
                  </span>
                ) : null}
              </label>
            )
          })}
        </div>

        <button
          type="button"
          onClick={() => void saveThirdPlace()}
          disabled={isLocked || !view.completion.allGroupsRanked || thirdPlaceStatus === "saving" || !hasUnsavedThirdPlaceChanges}
          className="mt-4 min-h-11 w-full rounded-xl bg-cyan-300 px-4 py-2 text-sm font-black text-black touch-manipulation disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto"
        >
          {thirdPlaceStatus === "saving" ? "Saving..." : thirdPlaceStatus === "saved" ? "Saved Third-Place Picks" : "Save Third-Place Advancers"}
        </button>
      </div>
    </section>
  )
}
