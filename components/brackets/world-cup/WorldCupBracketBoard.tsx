"use client"
import { useMemo } from "react"
import { WORLD_CUP_ROUNDS } from "@/lib/world-cup/types"
import type { WorldCupChallengeView, WorldCupMatchView, WorldCupPickView, WorldCupRound } from "@/lib/world-cup/types"
import { hasWorldCupPickSelection } from "@/lib/world-cup/worldCupProjectedBracket"
import WorldCupRoundColumn from "./WorldCupRoundColumn"

export default function WorldCupBracketBoard({
	view,
	picks,
	matches,
	onPick,
	onOpenMatchupPicker,
	savingMatchIds,
	isLocked = false,
	aiInsightsUnlocked = false,
	confidenceScoringEnabled = false,
}: {
	view: WorldCupChallengeView
	picks: WorldCupPickView[]
	matches: WorldCupMatchView[]
	onPick: (match: WorldCupMatchView, side: "home" | "away", confidencePoints?: number | null) => void
	onOpenMatchupPicker?: (matchId: string) => void
	savingMatchIds?: Set<string>
	isLocked?: boolean
	aiInsightsUnlocked?: boolean
	confidenceScoringEnabled?: boolean
}) {
	const champion = picks.find((p) => p.round === "final" && hasWorldCupPickSelection(p))
	const rounds = WORLD_CUP_ROUNDS.filter((r) => matches.some((m) => m.round === r && (r !== "third_place" || view.challenge.includeThirdPlace)))
	const { pickLockStrategy, pickLockAt } = view.challenge
	return (
		<div data-testid="world-cup-knockout-board-scroll" className="min-h-full scroll-pt-32 px-3 pb-6 pt-6 sm:px-5 sm:pt-8">
			<div className="mb-3 flex min-w-0 flex-col gap-2 sm:mb-4 sm:min-w-max sm:flex-row sm:items-center sm:gap-3">
				<div className="rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-3 py-2.5 sm:px-4 sm:py-3">
					<div className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100/60 sm:text-[10px]">Champion Pick</div>
					<div className="mt-0.5 truncate text-base font-black text-white sm:mt-1 sm:text-lg">{champion?.selectedTeamName ?? "Not picked"}</div>
				</div>
				<div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-[11px] leading-snug text-white/50 sm:px-4 sm:py-3 sm:text-xs">
					Your knockout bracket is generated from your predicted group results. Picks advance visually as soon as you choose a winner.
				</div>
			</div>
			<div className="flex min-w-max gap-3 sm:gap-4">
				{rounds.map((round) => (
					<WorldCupRoundColumn
						key={round}
						round={round as WorldCupRound}
						matches={matches.filter((m) => m.round === round)}
						picks={picks}
						onPick={onPick}
						onOpenMatchupPicker={onOpenMatchupPicker}
						savingMatchIds={savingMatchIds}
						isBracketLocked={isLocked}
						lockStrategy={pickLockStrategy}
						tournamentLockAt={pickLockAt}
						aiInsightsUnlocked={aiInsightsUnlocked}
						confidenceScoringEnabled={confidenceScoringEnabled}
					/>
				))}
			</div>
		</div>
	)
}
