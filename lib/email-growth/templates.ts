/**
 * Email Growth — HTML templates for weekly summary, AI insight, league update.
 */

import { getBaseUrl } from "@/lib/get-base-url"

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function ensureAbsoluteHref(href: string): string {
  if (href.startsWith("http")) return href
  const base = getBaseUrl().replace(/\/$/, "")
  return href.startsWith("/") ? `${base}${href}` : `${base}/${href}`
}

export interface WeeklySummaryTemplateArgs {
  userName?: string | null
  leagueViews: number
  bracketViews: number
  aiUses: number
  ctaHref: string
  ctaLabel: string
}

export function buildWeeklySummaryHtml(args: WeeklySummaryTemplateArgs): string {
  const { userName, leagueViews, bracketViews, aiUses, ctaHref, ctaLabel } = args
  const name = userName ? escapeHtml(userName) : "there"
  const total = leagueViews + bracketViews + aiUses
  const parts: string[] = []
  if (leagueViews > 0) parts.push(`${leagueViews} league visit${leagueViews !== 1 ? "s" : ""}`)
  if (bracketViews > 0) parts.push(`${bracketViews} bracket view${bracketViews !== 1 ? "s" : ""}`)
  if (aiUses > 0) parts.push(`${aiUses} AI tool use${aiUses !== 1 ? "s" : ""}`)
  const summary = total > 0 ? parts.join(", ") : "no activity yet"
  const bodyCopy =
    total > 0
      ? `This week: ${summary}. Keep it up!`
      : "You haven't been active this week. Open a league or try the trade analyzer to get started."
  const url = ensureAbsoluteHref(ctaHref)
  const label = escapeHtml(ctaLabel)

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:sans-serif;margin:0;padding:20px;background:#f5f5f5;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
    <h1 style="margin:0 0 16px;font-size:22px;color:#111;">Your weekly summary</h1>
    <p style="margin:0 0 16px;color:#333;line-height:1.5;">Hi ${name},</p>
    <p style="margin:0 0 24px;color:#333;line-height:1.5;">${escapeHtml(bodyCopy)}</p>
    <p style="margin:0 0 8px;">
      <a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">${label}</a>
    </p>
    <p style="margin:24px 0 0;font-size:12px;color:#888;">AllFantasy.ai — your fantasy command center</p>
  </div>
</body>
</html>`
}

export interface AIInsightTemplateArgs {
  userName?: string | null
  title: string
  body: string
  ctaHref?: string
  ctaLabel?: string
}

export function buildAIInsightHtml(args: AIInsightTemplateArgs): string {
  const { userName, title, body, ctaHref, ctaLabel } = args
  const name = userName ? escapeHtml(userName) : "there"
  const ctaHtml =
    ctaHref && ctaLabel
      ? `<p style="margin:16px 0 0;"><a href="${escapeHtml(ensureAbsoluteHref(ctaHref))}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">${escapeHtml(ctaLabel)}</a></p>`
      : ""

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:sans-serif;margin:0;padding:20px;background:#f5f5f5;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
    <h1 style="margin:0 0 16px;font-size:22px;color:#111;">${escapeHtml(title)}</h1>
    <p style="margin:0 0 16px;color:#333;line-height:1.5;">Hi ${name},</p>
    <div style="margin:0 0 16px;color:#333;line-height:1.6;">${body.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>")}</div>
    ${ctaHtml}
    <p style="margin:24px 0 0;font-size:12px;color:#888;">AllFantasy.ai</p>
  </div>
</body>
</html>`
}

export interface LeagueUpdateTemplateArgs {
  userName?: string | null
  leagueName: string
  title: string
  body: string
  ctaHref: string
  ctaLabel?: string
}

export function buildLeagueUpdateHtml(args: LeagueUpdateTemplateArgs): string {
  const { userName, leagueName, title, body, ctaHref, ctaLabel } = args
  const name = userName ? escapeHtml(userName) : "there"
  const url = ensureAbsoluteHref(ctaHref)
  const label = escapeHtml(ctaLabel ?? "View league")

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:sans-serif;margin:0;padding:20px;background:#f5f5f5;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
    <p style="margin:0 0 8px;font-size:12px;color:#666;text-transform:uppercase;">${escapeHtml(leagueName)}</p>
    <h1 style="margin:0 0 16px;font-size:22px;color:#111;">${escapeHtml(title)}</h1>
    <p style="margin:0 0 16px;color:#333;line-height:1.5;">Hi ${name},</p>
    <div style="margin:0 0 24px;color:#333;line-height:1.6;">${body.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>")}</div>
    <p style="margin:0;"><a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">${label}</a></p>
    <p style="margin:24px 0 0;font-size:12px;color:#888;">AllFantasy.ai</p>
  </div>
</body>
</html>`
}
