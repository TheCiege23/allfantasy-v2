"use client"
import { useMemo } from "react"
import type { WorldCupChallengeView, WorldCupMatchView, WorldCupPickView, WorldCupRound } from "@/lib/world-cup/types"
import { hasWorldCupPickSelection } from "@/lib/world-cup/worldCupProjectedBracket"
import WorldCupRoundColumn from "./WorldCupRoundColumn"
import { useOptionalLanguage } from "@/components/i18n/LanguageProviderClient"
import { makeWcT } from "@/lib/world-cup/worldCupI18n"

const WORLD_CUP_SIDE_ROUNDS: WorldCupRound[] = ["round_of_32", "round_of_16", "quarterfinal", "semifinal"]

function splitWorldCupSideMatches(matches: WorldCupMatchView[]) {
	const middle = Math.ceil(matches.length / 2)
	return {
		left: matches.slice(0, middle),
		right: matches.slice(middle),
	}
}

function toCamelRound(round: string) {
	return round.replace(/_([a-z0-9])/g, (_: string, c: string) => c.toUpperCase())
}

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
	// Hydration-safe: locale flows from the global LanguageProviderClient.
	const { language } = useOptionalLanguage()
	const t = useMemo(() => makeWcT(language), [language])
	const champion = picks.find((p) => p.round === "final" && hasWorldCupPickSelection(p))
	const sideRounds = WORLD_CUP_SIDE_ROUNDS.filter((round) => matches.some((match) => match.round === round))
	const finalMatches = matches.filter((match) => match.round === "final")
	const thirdPlaceMatches = view.challenge.includeThirdPlace
		? matches.filter((match) => match.round === "third_place")
		: []
	const { pickLockStrategy, pickLockAt } = view.challenge

	const renderRoundColumn = (
		round: WorldCupRound,
		roundMatches: WorldCupMatchView[],
		align: "left" | "right" | "center",
		connectorSide: "left" | "right" | "both" | "none",
	) => (
		<WorldCupRoundColumn
			key={`${align}-${round}`}
			round={round}
			label={t(`wc.round.${toCamelRound(round)}`)}
			matches={roundMatches}
			picks={picks}
			onPick={onPick}
			onOpenMatchupPicker={onOpenMatchupPicker}
			savingMatchIds={savingMatchIds}
			isBracketLocked={isLocked}
			lockStrategy={pickLockStrategy}
			tournamentLockAt={pickLockAt}
			aiInsightsUnlocked={aiInsightsUnlocked}
			confidenceScoringEnabled={confidenceScoringEnabled}
			align={align}
			fillHeight
			connectorSide={connectorSide}
		/>
	)

	return (
		<div data-testid="world-cup-knockout-board-scroll" className="min-h-full scroll-pt-32 overflow-x-auto px-3 pb-6 pt-6 sm:px-5 sm:pt-8">
			<div className="relative min-w-[1860px] overflow-hidden rounded-[1.5rem] border border-cyan-300/15 bg-[#020711] px-6 py-6 shadow-[0_28px_90px_-54px_rgba(34,211,238,0.75)]">
				<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_7%,rgba(250,204,21,0.26),transparent_22%),radial-gradient(circle_at_50%_43%,rgba(20,184,166,0.16),transparent_30%),linear-gradient(90deg,rgba(8,47,73,0.48),transparent_28%,transparent_72%,rgba(8,47,73,0.48))]" />
				<div className="pointer-events-none absolute left-1/2 top-8 h-[41rem] w-[31rem] -translate-x-1/2 rounded-full border border-amber-200/15 bg-amber-300/[0.03] blur-[1px]" />
				<div className="pointer-events-none absolute bottom-0 left-1/2 h-36 w-[46rem] -translate-x-1/2 rounded-[100%] bg-cyan-300/[0.08] blur-3xl" />

				<div className="relative z-10 mb-5 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
					<div className="rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3">
						<div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100/55">{t("wc.matchup.bracketBoardChampionLabel")}</div>
						{/* champion?.selectedTeamName is a team name and should not be translated. */}
						<div className="mt-1 max-w-[24rem] truncate text-xl font-black text-white">{champion?.selectedTeamName ?? t("wc.matchup.bracketBoardChampionFallback")}</div>
					</div>
					<div className="text-center">
						<div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full border border-cyan-200/45 bg-cyan-300/10 text-lg font-black text-white shadow-[0_0_32px_rgba(34,211,238,0.35)]">
							AF
						</div>
						<div className="mt-2 text-[11px] font-black uppercase tracking-[0.28em] text-white/55">
							AllFantasy World Cup
						</div>
					</div>
					<div className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-right text-xs leading-5 text-white/55">
						{t("wc.matchup.bracketBoardHelper")}
					</div>
				</div>

				<div className="relative z-10 grid min-h-[82rem] grid-cols-[repeat(4,minmax(18rem,1fr))_minmax(21rem,0.9fr)_repeat(4,minmax(18rem,1fr))] items-stretch gap-5">
					{sideRounds.map((round) => {
						const { left } = splitWorldCupSideMatches(matches.filter((match) => match.round === round))
						return renderRoundColumn(round, left, "left", "right")
					})}

					<section className="relative flex h-full min-w-[21rem] flex-col items-center justify-center">
						<div className="pointer-events-none absolute inset-y-20 left-1/2 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-amber-200/25 to-transparent" />
						<div className="relative z-10 mb-5 w-full rounded-[1.25rem] border border-amber-200/25 bg-black/45 px-4 py-5 text-center shadow-[0_20px_70px_-42px_rgba(250,204,21,0.85)]">
							<img
								src="/images/brackets/world-cup/af-world-cup-logo.png"
								alt=""
								className="mx-auto mb-3 h-32 w-24 rounded-2xl object-contain drop-shadow-[0_0_30px_rgba(250,204,21,0.34)]"
								aria-hidden="true"
							/>
							<div className="text-[11px] font-black uppercase tracking-[0.24em] text-amber-100/65">
								{t("wc.round.final")}
							</div>
							<div className="mt-1 truncate text-4xl font-black text-white drop-shadow-[0_0_18px_rgba(250,204,21,0.35)]">
								{champion?.selectedTeamName ?? t("wc.matchup.bracketBoardChampionFallback")}
							</div>
						</div>
						{finalMatches.length > 0 ? renderRoundColumn("final", finalMatches, "center", "both") : null}
						{thirdPlaceMatches.length > 0 ? (
							<div className="mt-5 w-full opacity-90">
								{renderRoundColumn("third_place", thirdPlaceMatches, "center", "both")}
							</div>
						) : null}
					</section>

					{[...sideRounds].reverse().map((round) => {
						const { right } = splitWorldCupSideMatches(matches.filter((match) => match.round === round))
						return renderRoundColumn(round, right, "right", "left")
					})}
				</div>
			</div>
		</div>
	)
}
