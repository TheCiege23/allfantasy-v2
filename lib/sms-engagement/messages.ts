/**
 * SMS-optimized message builders (short, no links).
 * Target ~160 chars for single segment; max 320 for dispatcher.
 */

import type { DraftAlertPayload, TradeAlertPayload, MatchupReminderPayload } from "./types"

const PREFIX = "AllFantasy:"

function truncate(s: string, max: number): string {
  if (s.length <= max) return s
  return s.slice(0, max - 3) + "..."
}

export function buildDraftAlertMessage(payload: DraftAlertPayload): { title: string; body: string } {
  const { leagueName, type, pickLabel, minutesRemaining, playerName } = payload
  const league = leagueName ? ` (${leagueName})` : ""

  switch (type) {
    case "on_the_clock":
      return {
        title: `${PREFIX} You're on the clock${league}`,
        body: pickLabel ? `Pick ${pickLabel}. Make your selection.` : "Make your draft pick.",
      }
    case "timer_warning":
      return {
        title: `${PREFIX} Draft timer almost up${league}`,
        body: pickLabel ? `Pick ${pickLabel} — time running out.` : "Your pick is due soon.",
      }
    case "draft_starting_soon":
      return {
        title: `${PREFIX} Draft starting soon${league}`,
        body: "Your league draft is about to start.",
      }
    case "auto_pick":
      return {
        title: `${PREFIX} Auto-pick made${league}`,
        body: playerName ? `${playerName} was selected for you.` : "An auto-pick was used.",
      }
    case "queue_player_taken":
      return {
        title: `${PREFIX} Queue player taken${league}`,
        body: "A player in your queue was drafted. Choose a new pick.",
      }
    case "trade_offer":
      return {
        title: `${PREFIX} Draft trade offer${league}`,
        body: "You have a new draft pick trade proposal.",
      }
    case "paused":
      return {
        title: `${PREFIX} Draft paused${league}`,
        body: "The commissioner has paused the draft.",
      }
    case "resumed":
      return {
        title: `${PREFIX} Draft resumed${league}`,
        body: "The draft has resumed.",
      }
    default:
      return {
        title: `${PREFIX} Draft update${league}`,
        body: "Check your draft.",
      }
  }
}

export function buildTradeAlertMessage(payload: TradeAlertPayload): { title: string; body: string } {
  const { leagueName, type, detail } = payload
  const league = leagueName ? ` (${leagueName})` : ""

  switch (type) {
    case "proposal":
      return {
        title: `${PREFIX} New trade proposal${league}`,
        body: detail ? truncate(detail, 80) : "Open the app to review.",
      }
    case "accepted":
      return {
        title: `${PREFIX} Trade accepted${league}`,
        body: detail ? truncate(detail, 80) : "A trade was accepted.",
      }
    case "rejected":
      return {
        title: `${PREFIX} Trade declined${league}`,
        body: detail ? truncate(detail, 80) : "A trade was declined.",
      }
    default:
      return {
        title: `${PREFIX} Trade update${league}`,
        body: "Open the app to view.",
      }
  }
}

export function buildMatchupReminderMessage(
  payload: MatchupReminderPayload
): { title: string; body: string } {
  const { leagueName, type, week, minutesRemaining, resultSummary } = payload
  const league = leagueName ? ` (${leagueName})` : ""
  const weekStr = week != null ? ` Week ${week}.` : "."

  switch (type) {
    case "lineup_lock_soon":
      return {
        title: `${PREFIX} Lineup lock soon${league}`,
        body:
          minutesRemaining != null
            ? `Lock in ${minutesRemaining} min. Set your lineup.`
            : `Set your lineup before lock.${weekStr}`,
      }
    case "lineup_locked":
      return {
        title: `${PREFIX} Lineup locked${league}`,
        body: `Lineups are set for this period.${weekStr}`,
      }
    case "matchup_result":
      return {
        title: `${PREFIX} Matchup result${league}`,
        body: resultSummary ? truncate(resultSummary, 100) : `Check your matchup.${weekStr}`,
      }
    case "matchup_reminder":
      return {
        title: `${PREFIX} Matchup reminder${league}`,
        body: week != null ? `Week ${week} is in progress. Check your lineup.` : "Check your matchup.",
      }
    default:
      return {
        title: `${PREFIX} League update${league}`,
        body: "Open the app to view.",
      }
  }
}

/** Single string for SMS-only send (title + body, max 320 chars). */
export function buildDraftAlertSmsText(payload: DraftAlertPayload): string {
  const { title, body } = buildDraftAlertMessage(payload)
  return body ? `${title}\n${body}` : title
}

export function buildTradeAlertSmsText(payload: TradeAlertPayload): string {
  const { title, body } = buildTradeAlertMessage(payload)
  return body ? `${title}\n${body}` : title
}

export function buildMatchupReminderSmsText(payload: MatchupReminderPayload): string {
  const { title, body } = buildMatchupReminderMessage(payload)
  return body ? `${title}\n${body}` : title
}
