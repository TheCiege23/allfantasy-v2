/**
 * AI insight email flow — send one-off AI insights (trade grade, waiver tip, Chimmy, etc.).
 */

import { getResendClient } from "@/lib/resend-client"
import { buildAIInsightHtml } from "../templates"
import type { AIInsightPayload, EmailFlowSendResult } from "../types"

/**
 * Send a single AI insight email.
 */
export async function sendAIInsightEmail(payload: AIInsightPayload): Promise<EmailFlowSendResult> {
  const { client, fromEmail } = getResendClient()
  const html = buildAIInsightHtml({
    userName: payload.userName,
    title: payload.title,
    body: payload.body,
    ctaHref: payload.ctaHref,
    ctaLabel: payload.ctaLabel ?? "View",
  })

  try {
    const result = await client.emails.send({
      from: fromEmail,
      to: payload.to,
      subject: payload.title,
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
