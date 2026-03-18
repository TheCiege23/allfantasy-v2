/**
 * League update email flow — matchup results, trade alerts, waiver processed, draft reminder.
 */

import { getResendClient } from "@/lib/resend-client"
import { buildLeagueUpdateHtml } from "../templates"
import type { LeagueUpdatePayload, EmailFlowSendResult } from "../types"

function defaultCtaLabel(updateType: string): string {
  switch (updateType) {
    case "matchup_result":
      return "View matchup"
    case "trade_alert":
      return "View trade"
    case "waiver_processed":
      return "View waivers"
    case "draft_reminder":
      return "Open draft"
    default:
      return "View league"
  }
}

/**
 * Send a single league update email.
 */
export async function sendLeagueUpdateEmail(
  payload: LeagueUpdatePayload
): Promise<EmailFlowSendResult> {
  const { client, fromEmail } = getResendClient()
  const ctaLabel = payload.ctaLabel ?? defaultCtaLabel(payload.updateType)
  const html = buildLeagueUpdateHtml({
    userName: payload.userName,
    leagueName: payload.leagueName,
    title: payload.title,
    body: payload.body,
    ctaHref: payload.ctaHref,
    ctaLabel,
  })

  try {
    const result = await client.emails.send({
      from: fromEmail,
      to: payload.to,
      subject: `${payload.leagueName}: ${payload.title}`,
      html,
    })
    if (result.error) {
      return { ok: false, to: payload.to, error: result.error.message ?? "Send failed" }
    }
    return { ok: true, to: payload.to }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error"
    return { ok: false, to: payload.to, error: message }
  }
}
