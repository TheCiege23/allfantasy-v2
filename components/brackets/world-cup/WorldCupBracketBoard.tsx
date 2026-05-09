"use client"
import { useMemo } from "react"
import { WORLD_CUP_ROUNDS } from "@/lib/world-cup/types"
import type { WorldCupChallengeView, WorldCupMatchView, WorldCupPickView, WorldCupRound } from "@/lib/world-cup/types"
import { buildWorldCupProjectedMatches, hasWorldCupPickSelection } from "@/lib/world-cup/worldCupProjectedBracket"
import WorldCupRoundColumn from "./WorldCupRoundColumn"

export default function WorldCupBracketBoard({
	view,
	picks,
	onPick,
	onOpenMatchupPicker,
	isLocked = false,
}: {
	view: WorldCupChallengeView
	picks: WorldCupPickView[]
	onPick: (match: WorldCupMatchView, side: "home" | "away") => void
	onOpenMatchupPicker?: (matchId: string) => void
	isLocked?: boolean
}) {
	const matches = useMemo(() => buildWorldCupProjectedMatches(view.matches, picks), [view.matches, picks])
	const champion = picks.find((p) => p.round === "final" && hasWorldCupPickSelection(p))
	const rounds = WORLD_CUP_ROUNDS.filter((r) => matches.some((m) => m.round === r && (r !== "third_place" || view.challenge.includeThirdPlace)))
	const { pickLockStrategy, pickLockAt } = view.challenge
	return (
		<div className="min-h-full overflow-x-auto px-3 pb-6 pt-3 sm:px-5">
			<div className="mb-4 flex min-w-max items-center gap-3">
				<div className="rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-4 py-3">
					<div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/60">Champion Pick</div>
					<div className="mt-1 text-lg font-black text-white">{champion?.selectedTeamName ?? "Not picked"}</div>
				</div>
				<div className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-white/50">
					Picks advance visually as soon as you choose a winner.
				</div>
			</div>
			<div className="flex min-w-max gap-4">
				{rounds.map((round) => (
					<WorldCupRoundColumn
						key={round}
						round={round as WorldCupRound}
						matches={matches.filter((m) => m.round === round)}
						picks={picks}
						onPick={onPick}
						onOpenMatchupPicker={onOpenMatchupPicker}
						isBracketLocked={isLocked}
						lockStrategy={pickLockStrategy}
						tournamentLockAt={pickLockAt}
					/>
				))}
			</div>
		</div>
	)
}
