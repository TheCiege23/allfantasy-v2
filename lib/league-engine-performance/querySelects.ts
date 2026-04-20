/**
 * Narrow Prisma select shapes for hot paths (dashboards, polling). Use to avoid over-fetching JSON blobs.
 */

import type { Prisma } from '@prisma/client'

/** League row for shell / lifecycle checks without large settings payloads. */
export const leagueSummarySelect = {
  id: true,
  name: true,
  sport: true,
  season: true,
  status: true,
  lifecycleState: true,
  settingsSnapshotVersion: true,
  updatedAt: true,
} satisfies Prisma.LeagueSelect

/** Roster list for waiver / draft pick validation — omit heavy playerData when not needed. */
export const rosterMetaSelect = {
  id: true,
  leagueId: true,
  platformUserId: true,
  waiverPriority: true,
  faabRemaining: true,
  updatedAt: true,
} satisfies Prisma.RosterSelect

/** Draft session for board polling — extend locally if a route needs slotOrder JSON. */
export const draftSessionPollSelect = {
  id: true,
  leagueId: true,
  status: true,
  nextOverallPick: true,
  currentRoundNum: true,
  version: true,
  timerEndAt: true,
  updatedAt: true,
} satisfies Prisma.DraftSessionSelect
