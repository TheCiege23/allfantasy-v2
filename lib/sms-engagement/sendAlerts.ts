/**
 * Send critical alerts (draft, trade, matchup) via unified dispatcher.
 * In-app + email + SMS per user preferences (SMS when phone verified and category SMS enabled).
 */

import { dispatchNotification } from "@/lib/notifications/NotificationDispatcher"
import {
  buildDraftAlertMessage,
  buildTradeAlertMessage,
  buildMatchupReminderMessage,
} from "./messages"
import type { DraftAlertPayload, TradeAlertPayload, MatchupReminderPayload } from "./types"
import type { NotificationCategoryId } from "@/lib/notification-settings/types"

const DRAFT_ROOM_PATH = (leagueId: string) => `/app/league/${leagueId}/draft`
const LEAGUE_PATH = (leagueId: string) => `/league/${leagueId}`
const LEAGUE_LINEUP_PATH = (leagueId: string) => `/league/${leagueId}?tab=Lineup`

export interface SendDraftAlertOptions {
  leagueId: string
  actionHref?: string
}

/**
 * Send draft alert to user(s). Uses draft_alerts category; SMS sent when user has SMS enabled and phone verified.
 */
export async function sendDraftAlert(
  userIds: string[],
  payload: DraftAlertPayload,
  options: SendDraftAlertOptions
): Promise<void> {
  if (userIds.length === 0) return
  const { title, body } = buildDraftAlertMessage(payload)
  const actionHref = options.actionHref ?? DRAFT_ROOM_PATH(options.leagueId)
  await dispatchNotification({
    userIds,
    category: "draft_alerts" as NotificationCategoryId,
    productType: "app",
    type: "draft_alert",
    title,
    body,
    actionHref,
    actionLabel: "Open draft",
    meta: { leagueId: options.leagueId, ...payload },
    severity: payload.type === "on_the_clock" || payload.type === "timer_warning" ? "high" : "medium",
  })
}

export interface SendTradeAlertOptions {
  leagueId: string
  actionHref?: string
  /** Use trade_accept_reject for accepted/rejected; trade_proposals for proposal */
  category?: "trade_proposals" | "trade_accept_reject"
}

/**
 * Send trade alert to user(s). Uses trade_proposals or trade_accept_reject; SMS when enabled.
 */
export async function sendTradeAlert(
  userIds: string[],
  payload: TradeAlertPayload,
  options: SendTradeAlertOptions
): Promise<void> {
  if (userIds.length === 0) return
  const { title, body } = buildTradeAlertMessage(payload)
  const category: NotificationCategoryId =
    options.category ??
    (payload.type === "proposal" ? "trade_proposals" : "trade_accept_reject")
  const actionHref = options.actionHref ?? `${LEAGUE_PATH(options.leagueId)}?tab=Trades`
  await dispatchNotification({
    userIds,
    category,
    productType: "app",
    type: "trade_alert",
    title,
    body,
    actionHref,
    actionLabel: "View trade",
    meta: { leagueId: options.leagueId, ...payload },
    severity: "medium",
  })
}

export interface SendMatchupReminderOptions {
  leagueId: string
  actionHref?: string
}

/**
 * Send matchup reminder to user(s). Uses lineup_reminders or matchup_results; SMS when enabled.
 */
export async function sendMatchupReminder(
  userIds: string[],
  payload: MatchupReminderPayload,
  options: SendMatchupReminderOptions
): Promise<void> {
  if (userIds.length === 0) return
  const { title, body } = buildMatchupReminderMessage(payload)
  const category: NotificationCategoryId =
    payload.type === "matchup_result" ? "matchup_results" : "lineup_reminders"
  const actionHref = options.actionHref ?? LEAGUE_LINEUP_PATH(options.leagueId)
  await dispatchNotification({
    userIds,
    category,
    productType: "app",
    type: "matchup_reminder",
    title,
    body,
    actionHref,
    actionLabel: "View league",
    meta: { leagueId: options.leagueId, ...payload },
    severity: payload.type === "lineup_lock_soon" ? "high" : "medium",
  })
}
