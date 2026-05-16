"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2 } from "lucide-react"
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

export default function WorldCupGroupStagePicks({ challengeId, entryId, onCompletionChanged }: Props) {
  const [view, setView] = useState<WorldCupGroupStageViewClient | null>(null)
  const [localOrders, setLocalOrders] = useState<Record<string, string[]>>({})
  const [saveStates, setSaveStates] = useState<Record<string, GroupSaveState>>({})
  const [thirdPlaceSelection, setThirdPlaceSelection] = useState<Set<string>>(new Set())
  const [thirdPlaceStatus, setThirdPlaceStatus] = useState<GroupSaveState>("idle")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [thirdPlaceError, setThirdPlaceError] = useState<string | null>(null)

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
    setSaveStates((prev) => ({ ...prev, [groupId]: "saving" }))
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
    setThirdPlaceError(null)
    if (!view?.completion.allGroupsRanked) {
      setThirdPlaceError("Rank all 12 groups before choosing third-place advancers.")
      return
    }
    if (thirdPlaceSelection.size !== 8) {
      setThirdPlaceError("Choose exactly 8 third-place advancers.")
      return
    }
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
                  return (
                    <div key={teamId} className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-2 py-2">
                      <span className="w-7 shrink-0 text-center text-sm font-black text-cyan-100">{index + 1}</span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-bold text-white">{team?.name ?? teamId}</div>
                        <div className="truncate text-xs text-white/40">{team?.country ?? "Team"}</div>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          onClick={() => setGroupOrder(group.id, moveItem(order, index, -1))}
                          disabled={isLocked || index === 0}
                          className="rounded-lg border border-white/10 bg-white/[0.06] px-2 py-1 text-[10px] font-bold text-white/70 disabled:opacity-35"
                        >
                          Move Up
                        </button>
                        <button
                          type="button"
                          onClick={() => setGroupOrder(group.id, moveItem(order, index, 1))}
                          disabled={isLocked || index === order.length - 1}
                          className="rounded-lg border border-white/10 bg-white/[0.06] px-2 py-1 text-[10px] font-bold text-white/70 disabled:opacity-35"
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
          <div data-testid="world-cup-third-place-count" className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm font-bold text-white/70">
            Third-place advancers selected: {thirdPlaceSelection.size}/8
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

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {thirdPlaceCandidates.map((candidate) => (
            <label
              key={candidate.groupId}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/75"
            >
              <input
                type="checkbox"
                checked={Boolean(candidate.team?.teamId && thirdPlaceSelection.has(candidate.team.teamId))}
                onChange={() => candidate.team && toggleThirdPlace(candidate.team.teamId)}
                disabled={isLocked || !view.completion.allGroupsRanked || !candidate.team}
                className="h-4 w-4 accent-cyan-300 disabled:opacity-40"
              />
              <span className="min-w-0">
                <span className="block text-xs font-black uppercase text-white/40">{candidate.displayName}</span>
                <span className="block truncate font-bold text-white">{candidate.team?.name ?? "No 3rd-place pick yet"}</span>
              </span>
            </label>
          ))}
        </div>

        <button
          type="button"
          onClick={() => void saveThirdPlace()}
          disabled={isLocked || !view.completion.allGroupsRanked || thirdPlaceStatus === "saving" || !hasUnsavedThirdPlaceChanges}
          className="mt-4 rounded-xl bg-cyan-300 px-4 py-2 text-sm font-black text-black disabled:cursor-not-allowed disabled:opacity-45"
        >
          {thirdPlaceStatus === "saving" ? "Saving..." : thirdPlaceStatus === "saved" ? "Saved Third-Place Picks" : "Save Third-Place Advancers"}
        </button>
      </div>
    </section>
  )
}
