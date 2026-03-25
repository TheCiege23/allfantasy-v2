/**
 * Admin Dashboard types. All seven sports supported: NFL, NHL, NBA, MLB, NCAAF, NCAAB, SOCCER.
 */

import type { LeagueSport } from "@prisma/client"
import type { SportsAlertType } from "@/lib/sports-alerts"

export const ADMIN_SUPPORTED_SPORTS: LeagueSport[] = [
  "NFL",
  "NHL",
  "NBA",
  "MLB",
  "NCAAF",
  "NCAAB",
  "SOCCER",
]

export interface PlatformOverviewMetrics {
  totalUsers: number
  activeUsersToday: number
  activeLeagues: number
  bracketsCreated: number
  draftsActive: number
  tradesToday: number
}

export interface LeagueOverviewItem {
  id: string
  name: string | null
  sport: LeagueSport
  leagueSize: number | null
  userId: string
  createdAt: Date
  status: string | null
  syncError: string | null
}

export type LeagueOverviewKind = "by_sport" | "largest" | "recent" | "flagged"

export interface LeagueOverviewBySport {
  sport: LeagueSport
  count: number
}

export interface UserOverviewItem {
  id: string
  email: string
  username: string
  createdAt: Date
  emailVerified: boolean
  reportCount?: number
}

export interface ReportedContentItem {
  id: string
  messageId: string
  threadId: string
  reporterUserId: string
  reason: string
  status: string
  createdAt: Date
}

export interface ReportedUserItem {
  id: string
  reportedUserId: string
  reporterUserId: string
  reason: string
  status: string
  createdAt: Date
  reportedEmail?: string
  reportedUsername?: string
}

export interface BlockedUserItem {
  id: string
  blockerUserId: string
  blockedUserId: string
  createdAt: Date
  blockedEmail?: string
  blockedUsername?: string
}

export interface SystemHealthStatus {
  api: Record<string, { status: string; latency?: number; lastCheck: string }>
  database: "healthy" | "degraded" | "down"
  databaseLatencyMs?: number
  workerQueue: {
    status: "healthy" | "degraded" | "down"
    queued: number
    running: number
    failedLast24h: number
    lastCheck: string
  }
  sportsAlerts: SportsAlertLatencyStatus
}

export interface SportsAlertLatencyTypeMetrics {
  alertType: SportsAlertType
  totalAlerts: number
  sampledAlerts: number
  p50Ms: number | null
  p95Ms: number | null
  maxMs: number | null
}

export interface SportsAlertLatencyStatus {
  windowHours: number
  totalAlerts: number
  sampledAlerts: number
  p50Ms: number | null
  p95Ms: number | null
  p99Ms: number | null
  maxMs: number | null
  lastAlertAt: string | null
  byType: SportsAlertLatencyTypeMetrics[]
}
