"use client"
import { useMemo } from "react"
import { Check, Loader2 } from "lucide-react"
import type { WorldCupMatchView, WorldCupPickView } from "@/lib/world-cup/types"
import {
  hasWorldCupPickSelection,
  isWorldCupMatchPickable,
} from "@/lib/world-cup/worldCupProjectedBracket"
import { formatWorldCupPlaceholder } from "@/lib/world-cup/worldCupBracketUtils"
import { useOptionalLanguage } from "@/components/i18n/LanguageProviderClient"
import { makeWcT } from "@/lib/world-cup/worldCupI18n"

/**
 * Compact bracket card — fixed h-[5.5rem] (88px) so it stacks precisely in
 * the championship-tree geometry managed by WorldCupBracketBoard.
 *
 * Layout: 16px header (match label + status) + 36px home row + 36px away row.
 * Total visible height = 88px; any overflow is hidden.
 */
export default function WorldCupBracketCard({
  match,
  pick,
  locked = false,
  onPick,
  onOpenMatchupPicker,
  isSaving = false,
}: {
  match: WorldCupMatchView
  pick?: WorldCupPickView
  locked?: boolean
  onPick?: (match: WorldCupMatchView, side: "home" | "away", confidencePoints?: number | null) => void
  onOpenMatchupPicker?: (matchId: string) => void
  isSaving?: boolean
}) {
  const { language } = useOptionalLanguage()
  const t = useMemo(() => makeWcT(language), [language])

  const pickable = isWorldCupMatchPickable(match)
  const homeName = formatWorldCupPlaceholder(match.homeSlotKey, match.homeTeamName, match.homeTeamId)
  const awayName = formatWorldCupPlaceholder(match.awaySlotKey, match.awayTeamName, match.awayTeamId)

  const homeSelected =
    pick &&
    hasWorldCupPickSelection(pick) &&
    (pick.selectedTeamId === match.homeTeamId ||
      (pick.selectedSlotKey != null && pick.selectedSlotKey === match.homeSlotKey))
  const awaySelected =
    pick &&
    hasWorldCupPickSelection(pick) &&
    !homeSelected

  function handlePick(side: "home" | "away") {
    if (locked || !pickable || isSaving) return
    onPick?.(match, side, null)
  }

  const statusText = (() => {
    if (match.status === "live" || match.status === "halftime") return "LIVE"
    if (match.status === "final") return "FT"
    if (isSaving) return "…"
    return null
  })()

  return (
    <div
      data-testid={`world-cup-match-${match.id}`}
      className="h-[5.5rem] overflow-hidden rounded-xl border border-white/10 bg-black/30 backdrop-blur"
    >
      {/* ── Header row: match label + status ───────────────────── */}
      <div className="flex h-4 items-center justify-between gap-1 border-b border-white/[0.07] px-2">
        <button
          type="button"
          role="button"
          aria-label={t("wc.matchup.openGuidedAria")}
          onClick={() => onOpenMatchupPicker?.(match.id)}
          className="min-w-0 flex-1 truncate text-left text-[9px] font-bold uppercase tracking-[0.12em] text-white/35 hover:text-white/65"
        >
          {match.label ?? `M${match.roundIndex + 1}`}
        </button>
        {isSaving ? (
          <Loader2 className="h-2.5 w-2.5 shrink-0 animate-spin text-white/40" />
        ) : statusText ? (
          <span className="shrink-0 text-[8px] font-black uppercase tracking-wide text-white/45">
            {statusText}
          </span>
        ) : null}
        {/* Screen-reader only: unpickable reason */}
        {!pickable && (
          <span data-testid={`world-cup-match-disabled-reason-${match.id}`} className="sr-only">
            {t("wc.matchup.unpickableTeams")}
          </span>
        )}
      </div>

      {/* ── Home team row ─────────────────────────────────────── */}
      <button
        type="button"
        data-testid={`world-cup-team-${match.id}-home`}
        onClick={() => handlePick("home")}
        disabled={locked || !pickable}
        aria-pressed={homeSelected ? true : undefined}
        aria-label={
          homeSelected
            ? t("wc.matchup.pickAriaSelected", { team: homeName })
            : pick && hasWorldCupPickSelection(pick)
              ? t("wc.matchup.pickAriaPicked", { team: homeName })
              : homeName
        }
        className={`flex h-9 w-full items-center gap-1.5 px-2 transition-colors
          ${locked || !pickable
            ? "cursor-default opacity-60"
            : "hover:bg-white/[0.06] active:bg-white/[0.09]"
          }
          ${homeSelected
            ? "bg-cyan-300/[0.12] text-white"
            : "text-white/75"
          }`}
      >
        {homeSelected && <Check className="h-2.5 w-2.5 shrink-0 text-cyan-300" aria-hidden />}
        <span className="min-w-0 flex-1 truncate text-left text-[11px] font-bold leading-none">
          {homeName}
        </span>
        {match.homeScore != null && match.awayScore != null && (
          <span className="shrink-0 text-[11px] font-black text-white/60">{match.homeScore}</span>
        )}
      </button>

      {/* ── Away team row ─────────────────────────────────────── */}
      <button
        type="button"
        data-testid={`world-cup-team-${match.id}-away`}
        onClick={() => handlePick("away")}
        disabled={locked || !pickable}
        aria-pressed={awaySelected ? true : undefined}
        aria-label={
          awaySelected
            ? t("wc.matchup.pickAriaSelected", { team: awayName })
            : pick && hasWorldCupPickSelection(pick)
              ? t("wc.matchup.pickAriaPicked", { team: awayName })
              : awayName
        }
        className={`flex h-9 w-full items-center gap-1.5 border-t border-white/[0.07] px-2 transition-colors
          ${locked || !pickable
            ? "cursor-default opacity-60"
            : "hover:bg-white/[0.06] active:bg-white/[0.09]"
          }
          ${awaySelected
            ? "bg-cyan-300/[0.12] text-white"
            : "text-white/75"
          }`}
      >
        {awaySelected && <Check className="h-2.5 w-2.5 shrink-0 text-cyan-300" aria-hidden />}
        <span className="min-w-0 flex-1 truncate text-left text-[11px] font-bold leading-none">
          {awayName}
        </span>
        {match.homeScore != null && match.awayScore != null && (
          <span className="shrink-0 text-[11px] font-black text-white/60">{match.awayScore}</span>
        )}
      </button>
    </div>
  )
}
