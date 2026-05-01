"use client"
import { useMemo, useRef, useState, useTransition } from "react"
import Link from "next/link"
import { ArrowLeft, ClipboardList, RefreshCw, Share2, Trophy, Users } from "lucide-react"
import type { WorldCupChallengeView, WorldCupMatchView, WorldCupPickView } from "@/lib/world-cup/types"
import WorldCupBracketBoard from "./WorldCupBracketBoard"
import WorldCupInvitePanel from "./WorldCupInvitePanel"
import WorldCupLeaderboard from "./WorldCupLeaderboard"
import WorldCupLiveScoreTicker from "./WorldCupLiveScoreTicker"
type Tab = "picks" | "leaderboard" | "rules" | "invite"
const TABS: Array<{ id: Tab; label: string; icon: typeof ClipboardList }> = [{ id: "picks", label: "Picks", icon: ClipboardList }, { id: "leaderboard", label: "Leaderboard", icon: Trophy }, { id: "rules", label: "Rules", icon: Users }, { id: "invite", label: "Invite", icon: Share2 }]
function normalizeWorldCupView(input: WorldCupChallengeView | (Partial<WorldCupChallengeView> & { id?: string; name?: string }) | undefined): WorldCupChallengeView {
  const raw = input as any
  if (raw?.challenge) return raw as WorldCupChallengeView
  return {
    challenge: {
      id: raw?.id ?? "",
      name: raw?.name ?? "World Cup Bracket",
      ownerUserId: raw?.ownerUserId ?? "",
      seasonYear: raw?.seasonYear ?? 2026,
      inviteCode: raw?.inviteCode ?? "",
      inviteUrl: raw?.inviteUrl ?? null,
      visibility: raw?.visibility ?? "private",
      pickLockStrategy: raw?.pickLockStrategy ?? "per_match",
      pickLockAt: raw?.pickLockAt ?? null,
      status: raw?.status ?? "open",
      includeThirdPlace: Boolean(raw?.includeThirdPlace),
      lastSyncedAt: raw?.lastSyncedAt ?? null,
      createdAt: raw?.createdAt ?? new Date().toISOString(),
      updatedAt: raw?.updatedAt ?? new Date().toISOString(),
    },
    scoring: raw?.scoring ?? {
      roundOf32Points: 1,
      roundOf16Points: 2,
      quarterFinalPoints: 4,
      semiFinalPoints: 8,
      finalPoints: 16,
      championBonusPoints: 0,
      thirdPlacePoints: 4,
    },
    slots: raw?.slots ?? [],
    matches: raw?.matches ?? [],
    participant: raw?.participant ?? null,
    picks: raw?.picks ?? [],
    leaderboard: raw?.leaderboard ?? [],
    isOwner: Boolean(raw?.isOwner),
    isAdmin: Boolean(raw?.isAdmin),
  }
}
export default function WorldCupBracketShell({ initialView, challenge, defaultTab = "picks" }: { initialView?: WorldCupChallengeView; challenge?: WorldCupChallengeView | any; defaultTab?: Tab }) {
  const normalizedInitialView = normalizeWorldCupView(initialView ?? challenge)
  const [view, setView] = useState(normalizedInitialView), [picks, setPicks] = useState<WorldCupPickView[]>(normalizedInitialView.picks), [tab, setTab] = useState<Tab>(defaultTab), [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle"), [isPending, startTransition] = useTransition()
  const saveTracker = useRef({ pending: 0, hasError: false }), pickRequestIds = useRef(new Map<string, number>()), nextPickRequestId = useRef(0)
  const progress = useMemo(() => ({ done: picks.length, required: view.matches.length }), [picks.length, view.matches.length])
  async function persistPick(match: WorldCupMatchView, side: "home" | "away") {
    const selectedTeamId = side === "home" ? match.homeTeamId : match.awayTeamId, selectedSlotKey = side === "home" ? match.homeSlotKey : match.awaySlotKey, selectedTeamName = side === "home" ? match.homeTeamName : match.awayTeamName, requestId = nextPickRequestId.current + 1
    nextPickRequestId.current = requestId
    pickRequestIds.current.set(match.id, requestId)
    setPicks((cur) => [...cur.filter((p) => p.matchId !== match.id), { id: `optimistic-${match.id}`, matchId: match.id, round: match.round, selectedTeamId, selectedSlotKey, selectedTeamName, pointsAwarded: 0, isCorrect: null, lockedAt: null }])
    if (saveTracker.current.pending === 0) saveTracker.current.hasError = false
    saveTracker.current.pending += 1
    setSaveState("saving")
    try {
      const res = await fetch(`/api/brackets/world-cup/${view.challenge.id}/picks`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ picks: [{ matchId: match.id, selectedTeamId, selectedSlotKey }] }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed")
      const nextView = normalizeWorldCupView(data.view ?? data.challenge ?? data)
      setView(nextView)
      setPicks((cur) => {
        const byMatch = new Map(cur.map((pick) => [pick.matchId, pick]))
        for (const pick of nextView.picks) {
          if (pick.matchId === match.id && pickRequestIds.current.get(match.id) !== requestId) continue
          byMatch.set(pick.matchId, pick)
        }
        return Array.from(byMatch.values())
      })
      saveTracker.current.pending -= 1
      setSaveState(saveTracker.current.pending > 0 ? "saving" : saveTracker.current.hasError ? "error" : "saved")
    } catch {
      saveTracker.current.pending -= 1
      saveTracker.current.hasError = true
      setSaveState(saveTracker.current.pending > 0 ? "saving" : "error")
    }
  }
  function runOwnerAction(action: "sync" | "recalculate") { startTransition(async () => { const res = action === "sync" ? await fetch("/api/brackets/world-cup/sync", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ challengeId: view.challenge.id }) }) : await fetch(`/api/brackets/world-cup/${view.challenge.id}/recalculate`, { method: "POST" }); if (res.ok) { const latest = await fetch(`/api/brackets/world-cup/${view.challenge.id}`); if (latest.ok) { const data = await latest.json(); const nextView = normalizeWorldCupView(data.view ?? data.challenge ?? data); setView(nextView); setPicks(nextView.picks) } } }) }
  return <div className="fixed inset-0 z-50 flex flex-col bg-[#05070b] text-white"><header className="shrink-0 border-b border-white/10 bg-zinc-950/95 backdrop-blur"><div className="flex items-center gap-3 px-3 py-3 sm:px-5"><Link href="/brackets" className="rounded-lg border border-white/10 bg-white/[0.04] p-2 text-white/70"><ArrowLeft className="h-4 w-4" /></Link><div className="min-w-0 flex-1"><h1 className="truncate text-base font-black text-white sm:text-lg">{view.challenge.name}</h1><p className="text-[11px] text-white/45">{progress.done} of {progress.required} picks completed · {saveState === "saving" ? "Saving..." : saveState === "saved" ? "Saved" : saveState === "error" ? "Save error" : "World Cup 2026"}</p></div>{view.isAdmin ? <button type="button" onClick={() => runOwnerAction("sync")} disabled={isPending} className="hidden items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-white/70 hover:bg-white/[0.08] sm:inline-flex"><RefreshCw className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} />Sync</button> : null}<button type="button" onClick={() => setTab("invite")} className="inline-flex items-center gap-2 rounded-lg bg-cyan-300 px-3 py-2 text-xs font-black text-black"><Share2 className="h-3.5 w-3.5" />Invite</button></div><WorldCupLiveScoreTicker matches={view.matches} /><nav className="hidden gap-1 px-5 pb-3 sm:flex">{TABS.map(({ id, icon: Icon, label }) => <button key={id} type="button" onClick={() => setTab(id)} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold ${tab === id ? "bg-white text-black" : "bg-white/[0.04] text-white/55"}`}><Icon className="h-3.5 w-3.5" />{label}</button>)}</nav></header><main className="min-h-0 flex-1 overflow-hidden">{tab === "picks" ? <WorldCupBracketBoard view={view} picks={picks} onPick={persistPick} /> : null}{tab === "leaderboard" ? <WorldCupLeaderboard view={view} busy={isPending} onRecalculate={() => runOwnerAction("recalculate")} /> : null}{tab === "invite" ? <WorldCupInvitePanel view={view} /> : null}{tab === "rules" ? <div className="mx-auto max-w-2xl px-4 py-6 text-sm leading-7 text-white/60"><h2 className="mb-3 text-lg font-black text-white">Rules</h2><p>Pick every winner from the Round of 32 through the champion. Picks lock by matchup at kickoff unless the challenge uses a tournament-start lock.</p><p className="mt-3">Correct picks score more each round. Final API results update match winners, advance teams, score entries, and refresh the leaderboard.</p></div> : null}</main><nav className="fixed inset-x-0 bottom-0 grid grid-cols-4 border-t border-white/10 bg-zinc-950/95 sm:hidden">{TABS.map(({ id, icon: Icon, label }) => <button key={id} type="button" onClick={() => setTab(id)} className={`flex flex-col items-center gap-1 px-2 py-3 text-[10px] font-bold ${tab === id ? "text-cyan-200" : "text-white/45"}`}><Icon className="h-4 w-4" />{label === "Leaderboard" ? "Board" : label}</button>)}</nav></div>
}
