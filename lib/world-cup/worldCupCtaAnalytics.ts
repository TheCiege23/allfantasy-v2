"use client"

/**
 * worldCupCtaAnalytics
 *
 * Fire-and-forget client-side analytics for WorldCupAiInsightsCTA interactions.
 * Uses sendProductAnalyticsBeacon (navigator.sendBeacon / fetch keepalive) so
 * events flush even on quick navigations.
 *
 * All helpers are thin wrappers — they normalise the event name and attach
 * standard World Cup CTA fields (sport, challengeId, action, tier, locked,
 * plan) so dashboards can slice by any dimension without per-callsite schema
 * changes.
 *
 * No PII is sent: challengeId is an internal DB id, not a user id.
 */

import { sendProductAnalyticsBeacon } from "@/lib/analytics/client"
import { WORLD_CUP_CTA } from "@/lib/analytics/eventNames"

type CtaTier = "ai" | "commissioner"
type CtaKind = "chimmy" | "tab" | "card" | "text"
type ResultKind = "card" | "lines"

type BaseCtaMeta = {
  sport: "world_cup"
  challengeId: string
  actionKey: string
  tier: CtaTier
  kind: CtaKind
  /** Whether the user had entitlement for this tier. */
  unlocked: boolean
}

/** Panel mounted — fires once per component mount. */
export function trackWcCtaViewed(params: {
  challengeId: string
  aiUnlocked: boolean
  commissionerUnlocked: boolean
}): void {
  sendProductAnalyticsBeacon(WORLD_CUP_CTA.VIEWED, {
    sport: "world_cup",
    challengeId: params.challengeId,
    aiUnlocked: params.aiUnlocked,
    commissionerUnlocked: params.commissionerUnlocked,
  })
}

/** User clicked an unlocked chip. */
export function trackWcCtaClicked(params: BaseCtaMeta): void {
  sendProductAnalyticsBeacon(WORLD_CUP_CTA.CLICKED, {
    sport: params.sport,
    challengeId: params.challengeId,
    actionKey: params.actionKey,
    tier: params.tier,
    kind: params.kind,
  })
}

/** User clicked a locked chip. */
export function trackWcCtaLockedClicked(params: {
  challengeId: string
  actionKey: string
  tier: CtaTier
}): void {
  sendProductAnalyticsBeacon(WORLD_CUP_CTA.LOCKED_CLICKED, {
    sport: "world_cup",
    challengeId: params.challengeId,
    actionKey: params.actionKey,
    tier: params.tier,
    locked: true,
  })
}

/** User clicked an upgrade link (tier-row or panel header). */
export function trackWcCtaUpgradeClicked(params: {
  challengeId: string
  tier: CtaTier
  source: "row_label" | "panel_header"
}): void {
  sendProductAnalyticsBeacon(WORLD_CUP_CTA.UPGRADE_CLICKED, {
    sport: "world_cup",
    challengeId: params.challengeId,
    tier: params.tier,
    source: params.source,
  })
}

/** API call returned a usable result. */
export function trackWcCtaSuccess(params: BaseCtaMeta & { resultKind: ResultKind }): void {
  sendProductAnalyticsBeacon(WORLD_CUP_CTA.SUCCESS, {
    sport: params.sport,
    challengeId: params.challengeId,
    actionKey: params.actionKey,
    tier: params.tier,
    kind: params.kind,
    resultKind: params.resultKind,
  })
}

/** API call failed or returned an error response. */
export function trackWcCtaError(params: BaseCtaMeta & { errorMessage: string }): void {
  sendProductAnalyticsBeacon(WORLD_CUP_CTA.ERROR, {
    sport: params.sport,
    challengeId: params.challengeId,
    actionKey: params.actionKey,
    tier: params.tier,
    kind: params.kind,
    // Truncate error message — must not contain PII or raw prompt text.
    errorMessage: params.errorMessage.slice(0, 200),
  })
}

/** Token-confirmation dialog was shown to the user (HTTP 409). */
export function trackWcTokenConfirmOpened(params: {
  challengeId: string
  actionKey: string
  tokenCost?: number
}): void {
  sendProductAnalyticsBeacon(WORLD_CUP_CTA.TOKEN_CONFIRM_OPENED, {
    sport: "world_cup",
    challengeId: params.challengeId,
    actionKey: params.actionKey,
    tokenCost: params.tokenCost ?? null,
  })
}

/** User confirmed token spend. */
export function trackWcTokenConfirmAccepted(params: {
  challengeId: string
  actionKey: string
  tokenCost?: number
}): void {
  sendProductAnalyticsBeacon(WORLD_CUP_CTA.TOKEN_CONFIRM_ACCEPTED, {
    sport: "world_cup",
    challengeId: params.challengeId,
    actionKey: params.actionKey,
    tokenCost: params.tokenCost ?? null,
  })
}
