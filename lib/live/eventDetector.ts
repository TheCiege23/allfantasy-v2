/**
 * Live game-day event detection — box-score diffing into domain events.
 *
 * Two poll snapshots go in, the events that happened between them come out. Pure
 * and synchronous so the whole state machine can be tested against replayed
 * historical games without a network, a clock, or a live Sunday.
 *
 * ⚠ THE HARD LIMIT OF BOX-SCORE DIFFING, STATED UP FRONT BECAUSE IT IS A PRODUCT
 * DECISION AND NOT AN IMPLEMENTATION DETAIL:
 *
 *   `rushing_long` is the player's LONGEST run SO FAR. It rises once and then
 *   stays put. A 25-yard run that follows an earlier 40-yarder moves nothing, so
 *   it is INVISIBLE to this detector.
 *
 * Box-score diffing therefore catches the FIRST big play per player per game, not
 * every one. Touchdowns and turnovers are counters and are detected exactly; only
 * long-gain alerts carry this limitation. Anyone promising users "every 20+ yard
 * play" from this input is promising something the data cannot support — the fix
 * is real play-by-play, not a cleverer diff.
 */

export type PlayerStatLine = {
  playerId: string
  playerName: string
  team: string | null
  stats: Record<string, number>
}

export type GameSnapshot = {
  gameId: string
  /** scheduled | in_progress | final — drives poll cadence, not detection. */
  status: string
  capturedAt: Date
  players: PlayerStatLine[]
}

export type LiveEventType =
  | 'TOUCHDOWN'
  | 'BIG_PLAY'
  | 'TURNOVER'
  | 'FIELD_GOAL'
  | 'DEFENSIVE_SCORE'
  | 'SPECIAL_TEAMS_SCORE'

export type LiveEvent = {
  gameId: string
  playerId: string
  playerName: string
  team: string | null
  type: LiveEventType
  /** The stat that moved, e.g. `rushing_touchdowns`. */
  stat: string
  delta: number
  /** New cumulative value after the change. */
  value: number
  detectedAt: Date
  /**
   * ⚠ Stable across retries — dedupe on this. Polling plus retries WILL re-emit
   * the same change, and a notification sent twice is worse than one sent late.
   */
  idempotencyKey: string
  detail: string
}

/** Counter stats where any increase is exactly one scoring event. */
const TOUCHDOWN_STATS: Record<string, { type: LiveEventType; label: string }> = {
  rushing_touchdowns: { type: 'TOUCHDOWN', label: 'rushing TD' },
  passing_touchdowns: { type: 'TOUCHDOWN', label: 'passing TD' },
  receiving_touchdowns: { type: 'TOUCHDOWN', label: 'receiving TD' },
  defense_touchdowns: { type: 'DEFENSIVE_SCORE', label: 'defensive TD' },
  interception_touchdowns: { type: 'DEFENSIVE_SCORE', label: 'pick six' },
  fumble_return_touchdowns: { type: 'DEFENSIVE_SCORE', label: 'fumble return TD' },
  kick_return_touchdowns: { type: 'SPECIAL_TEAMS_SCORE', label: 'kick return TD' },
  punt_return_touchdowns: { type: 'SPECIAL_TEAMS_SCORE', label: 'punt return TD' },
  blocked_kick_touchdowns: { type: 'SPECIAL_TEAMS_SCORE', label: 'blocked kick TD' },
  blocked_punt_touchdowns: { type: 'SPECIAL_TEAMS_SCORE', label: 'blocked punt TD' },
  field_goal_return_touchdowns: { type: 'SPECIAL_TEAMS_SCORE', label: 'FG return TD' },
}

const TURNOVER_STATS: Record<string, string> = {
  fumbles_lost: 'lost a fumble',
  passing_interceptions: 'threw an interception',
}

/** Longest-gain stats, subject to the first-only limitation above. */
const LONG_STATS: Record<string, string> = {
  rushing_long: 'rush',
  receiving_long: 'reception',
  passing_long: 'pass',
}

export type DetectOptions = {
  /** Yards at or above which a long gain is worth an alert. */
  bigPlayYards?: number
}

function statOf(line: PlayerStatLine | undefined, key: string): number {
  const v = line?.stats?.[key]
  return typeof v === 'number' && Number.isFinite(v) ? v : 0
}

/**
 * Diff two snapshots of the same game into events.
 *
 * ⚠ NEGATIVE DELTAS ARE IGNORED, NOT EMITTED. Providers issue in-game stat
 * corrections that revise a number DOWNWARD; treating that as an event would fire
 * "touchdown!" in reverse. A correction is a data update, not a play.
 */
export function detectEvents(
  prev: GameSnapshot | null,
  next: GameSnapshot,
  opts: DetectOptions = {}
): LiveEvent[] {
  const bigPlayYards = opts.bigPlayYards ?? 20
  const events: LiveEvent[] = []

  /*
   * ⚠ NO PREVIOUS SNAPSHOT MEANS NO EVENTS — NEVER "EVERYTHING AT ONCE".
   * On first poll every counter looks like it just went from nothing to its
   * current value. Emitting from that would fire a notification for every
   * touchdown already scored, which for a game joined at half-time is a burst of
   * stale alerts. The first snapshot establishes the baseline and nothing more.
   */
  if (!prev) return events

  const prevById = new Map(prev.players.map((p) => [p.playerId, p]))

  for (const cur of next.players) {
    const before = prevById.get(cur.playerId)

    const push = (type: LiveEventType, stat: string, delta: number, value: number, detail: string) => {
      events.push({
        gameId: next.gameId,
        playerId: cur.playerId,
        playerName: cur.playerName,
        team: cur.team,
        type,
        stat,
        delta,
        value,
        detectedAt: next.capturedAt,
        // Keyed on the resulting VALUE, not the timestamp — a retry that sees the
        // same state produces the same key and dedupes cleanly.
        idempotencyKey: `${next.gameId}|${cur.playerId}|${stat}|${value}`,
        detail,
      })
    }

    // ── Scoring counters: exact, one event per increment.
    for (const [stat, meta] of Object.entries(TOUCHDOWN_STATS)) {
      const d = statOf(cur, stat) - statOf(before, stat)
      if (d > 0) {
        push(meta.type, stat, d, statOf(cur, stat),
          d === 1 ? `${cur.playerName} — ${meta.label}` : `${cur.playerName} — ${d} ${meta.label}s`)
      }
    }

    // ── Turnovers.
    for (const [stat, label] of Object.entries(TURNOVER_STATS)) {
      const d = statOf(cur, stat) - statOf(before, stat)
      if (d > 0) push('TURNOVER', stat, d, statOf(cur, stat), `${cur.playerName} ${label}`)
    }

    // ── Field goals.
    const fgDelta = statOf(cur, 'field_goals_made') - statOf(before, 'field_goals_made')
    if (fgDelta > 0) {
      push('FIELD_GOAL', 'field_goals_made', fgDelta, statOf(cur, 'field_goals_made'),
        `${cur.playerName} — field goal`)
    }

    /*
     * ── Long gains, with the limitation in force.
     * Fires only when the player's longest gain INCREASES past the threshold, so
     * a second long play behind an existing longer one is genuinely undetectable.
     */
    for (const [stat, noun] of Object.entries(LONG_STATS)) {
      const wasLong = statOf(before, stat)
      const nowLong = statOf(cur, stat)
      if (nowLong > wasLong && nowLong >= bigPlayYards) {
        push('BIG_PLAY', stat, nowLong - wasLong, nowLong,
          `${cur.playerName} — ${nowLong} yard ${noun}`)
      }
    }
  }

  return events
}

/**
 * Poll cadence for a game, in seconds.
 *
 * ⚠ COST SCALES WITH CHANGE, NOT FREQUENCY, BECAUSE THE PROVIDER RETURNS 304 WHEN
 * NOTHING HAS MOVED. That is the property that makes a 10-second cadence
 * affordable — but only if the caller actually honours 304 and skips the parse and
 * the diff. A poller that re-parses an unchanged body every 10 seconds throws the
 * entire advantage away.
 */
export function pollIntervalSeconds(status: string): number {
  const s = status.toLowerCase()
  if (s.includes('progress') || s.includes('live') || s.includes('halftime')) return 12
  if (s.includes('final') || s.includes('complete') || s.includes('closed')) return 0 // stop
  return 60 // scheduled / pre-game
}

/**
 * Cap and prioritise events before they become notifications.
 *
 * ⚠ THE CONSTRAINT IS ATTENTION, NOT THROUGHPUT. A Sunday with 13 games produces
 * hundreds of qualifying plays. An uncapped feed is indistinguishable from spam,
 * and a user who mutes notifications once has muted them permanently — so the cap
 * protects the feature's existence, not the server.
 *
 * Scoring plays outrank long gains: a touchdown always matters, a 21-yard gain
 * usually does not.
 */
const TYPE_PRIORITY: Record<LiveEventType, number> = {
  TOUCHDOWN: 0,
  DEFENSIVE_SCORE: 1,
  SPECIAL_TEAMS_SCORE: 1,
  TURNOVER: 2,
  FIELD_GOAL: 3,
  BIG_PLAY: 4,
}

export function selectNotifiable(
  events: LiveEvent[],
  opts: { rosteredPlayerIds: Set<string>; maxPerWindow: number }
): LiveEvent[] {
  return events
    // Default scope is the user's own players. League-wide is opt-in, because
    // "someone, somewhere scored" is not news to most people.
    .filter((e) => opts.rosteredPlayerIds.has(e.playerId))
    .sort((a, b) => TYPE_PRIORITY[a.type] - TYPE_PRIORITY[b.type])
    .slice(0, Math.max(0, opts.maxPerWindow))
}
