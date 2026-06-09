"use client"

import { sendProductAnalyticsBeacon } from "@/lib/analytics/client"
import { WORLD_CUP_EDGE_REPORT } from "@/lib/analytics/eventNames"

export function trackEdgeReportViewed(params: {
  challengeId: string
  hasEntry: boolean
  coachingFromCache: boolean
  aiEntitled: boolean
}): void {
  sendProductAnalyticsBeacon(WORLD_CUP_EDGE_REPORT.VIEWED, {
    sport: "world_cup",
    ...params,
  })
}

export function trackEdgeReportUnlockClicked(params: {
  challengeId: string
}): void {
  sendProductAnalyticsBeacon(WORLD_CUP_EDGE_REPORT.UNLOCK_CLICKED, {
    sport: "world_cup",
    ...params,
  })
}

export function trackEdgeReportTokenConfirmed(params: {
  challengeId: string
  tokenCost: number
}): void {
  sendProductAnalyticsBeacon(WORLD_CUP_EDGE_REPORT.TOKEN_CONFIRMED, {
    sport: "world_cup",
    ...params,
  })
}

export function trackEdgeReportCacheHit(params: {
  challengeId: string
}): void {
  sendProductAnalyticsBeacon(WORLD_CUP_EDGE_REPORT.CACHE_HIT, {
    sport: "world_cup",
    ...params,
  })
}

export function trackEdgeReportError(params: {
  challengeId: string
  phase: "load" | "coaching"
  errorMessage: string
}): void {
  sendProductAnalyticsBeacon(WORLD_CUP_EDGE_REPORT.ERROR, {
    sport: "world_cup",
    challengeId: params.challengeId,
    phase: params.phase,
    errorMessage: params.errorMessage.slice(0, 200),
  })
}

export function trackEdgeReportPostToChatClicked(params: {
  challengeId: string
}): void {
  sendProductAnalyticsBeacon(WORLD_CUP_EDGE_REPORT.POST_TO_CHAT_CLICKED, {
    sport: "world_cup",
    ...params,
  })
}
