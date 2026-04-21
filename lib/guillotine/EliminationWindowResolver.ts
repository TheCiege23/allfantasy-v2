/**
 * Guillotine elimination window: derives the 2–3 day "dead period" between
 * scoring final and the start of the next elimination cycle for each sport.
 *
 * The window opens at the sport's chop time (when the lowest scorer is
 * removed) and closes after waivers run + a grace buffer so managers can
 * claim released players before the next scoring window begins. Derived
 * from existing sportConfig — no new Prisma fields required.
 */

import { getGuillotineSportConfig } from './sportConfig'

export interface EliminationWindow {
  sport: string
  /** Elimination window opens (chop runs). */
  opensAt: Date
  /** Waivers process. */
  waiversAt: Date
  /** Window closes — next elimination cycle may begin. */
  closesAt: Date
  /** Whether the given `now` is inside the window. */
  isOpen: boolean
  /** Total window length in hours. */
  durationHours: number
}

function nextDow(from: Date, dow: number, hourUtc: number): Date {
  const d = new Date(from)
  const currentDow = d.getUTCDay()
  let delta = dow - currentDow
  if (delta < 0) delta += 7
  d.setUTCDate(d.getUTCDate() + delta)
  d.setUTCHours(hourUtc, 0, 0, 0)
  if (d <= from) d.setUTCDate(d.getUTCDate() + 7)
  return d
}

/**
 * Resolve the current or next elimination window for a sport. `graceHours`
 * extends the window past waiver processing so claims can settle (default
 * 24h — produces a 2–3 day total dead period for every sport profile).
 */
export function resolveEliminationWindow(
  sport: string,
  now: Date = new Date(),
  graceHours = 24,
): EliminationWindow | null {
  const config = getGuillotineSportConfig(sport)
  if (!config) return null
  const opensAt = nextDow(now, config.chopDay, config.chopHourUtc)
  // Step back to the most recent chop if it already happened this cycle.
  const mostRecentOpen = new Date(opensAt)
  mostRecentOpen.setUTCDate(mostRecentOpen.getUTCDate() - 7)
  const usedOpen = mostRecentOpen <= now && now < opensAt ? mostRecentOpen : opensAt
  const waiversAt = nextDow(usedOpen, config.waiverDay, config.waiverHourUtc)
  const closesAt = new Date(waiversAt.getTime() + graceHours * 60 * 60 * 1000)
  return {
    sport: String(sport).toUpperCase(),
    opensAt: usedOpen,
    waiversAt,
    closesAt,
    isOpen: now >= usedOpen && now < closesAt,
    durationHours: (closesAt.getTime() - usedOpen.getTime()) / (60 * 60 * 1000),
  }
}
