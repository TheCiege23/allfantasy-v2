"use client"
import { WORLD_CUP_ROUND_LABELS } from "@/lib/world-cup/types"
import type { WorldCupMatchView, WorldCupPickView, WorldCupRound } from "@/lib/world-cup/types"
import WorldCupMatchupCard from "./WorldCupMatchupCard"
export default function WorldCupRoundColumn({ round, matches, picks, onPick }: { round: WorldCupRound; matches: WorldCupMatchView[]; picks: WorldCupPickView[]; onPick: (match: WorldCupMatchView, side: "home" | "away") => void }) {
  return <section className="flex min-w-[19rem] shrink-0 flex-col gap-3"><div className="sticky top-0 z-10 rounded-lg border border-white/10 bg-black/70 px-3 py-2 backdrop-blur"><h2 className="text-xs font-black uppercase tracking-[0.2em] text-white/70">{WORLD_CUP_ROUND_LABELS[round]}</h2></div><div className="flex flex-col gap-3">{matches.map((match) => <WorldCupMatchupCard key={match.id} match={match} pick={picks.find((pick) => pick.matchId === match.id)} locked={Boolean(match.startsAt && new Date(match.startsAt) <= new Date()) || match.status === "final" || match.status === "live"} onPick={onPick} />)}</div></section>
}
