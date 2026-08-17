'use client'

import Link from 'next/link'
import '@/components/core-app/af-player-finder.css'
import { playerRef } from '@/lib/core-app/playerRef'
import type { PlayerDetail, PlayerMatch } from '@/lib/core-app/playerFinder'
import type { SectionState } from '@/lib/core-app/leagueHome'

/**
 * Screen 3 — Player Finder.
 *
 * "One name in — every platform, league, slot, injury and the move to make."
 *
 * The handoff prints a line under the search box that is really a promise:
 * "Stats, injuries and news come from live sports data — never an invented
 * number." This screen keeps it literally — every figure shown is read from an
 * ingested row, and everything we cannot compute says so in words instead of
 * rendering a dash that looks like a measurement.
 */

export type PlayerFinderProps = {
  query: string
  matches: PlayerMatch[]
  detail: PlayerDetail | null
  leagueCount: number
}

function Unavailable({ reason }: { reason: string }) {
  return <p className="af-pf-unavailable">{reason}</p>
}

function StatTile({
  label,
  help,
  state,
  value,
}: {
  label: string
  help?: string
  state?: SectionState<unknown>
  value?: string | null
}) {
  const missing = state ? !state.available : value == null
  return (
    <div className="af-pf-tile" data-missing={missing}>
      <div className="af-pf-tile-value af-num">{missing ? '—' : value}</div>
      <div className="af-label">{label}</div>
      {missing && state && !state.available ? (
        <div className="af-pf-tile-why">{state.reason}</div>
      ) : help ? (
        <div className="af-pf-tile-why">{help}</div>
      ) : null}
    </div>
  )
}

export function PlayerFinder({ query, matches, detail, leagueCount }: PlayerFinderProps) {
  return (
    <div className="af-pf">
      {/* ── Search ──────────────────────────────────────────────────── */}
      <form className="af-pf-search-wrap" method="get" action="/core/players">
        <label className="af-search af-pf-search">
          <span className="af-search-icon" aria-hidden>
            ○
          </span>
          <input
            className="af-search-input"
            name="q"
            defaultValue={query}
            placeholder="Search any player"
            aria-label="Search any player"
            autoComplete="off"
          />
          <button type="submit" className="af-btn af-pf-search-btn">
            Search
          </button>
        </label>
        <p className="af-pf-search-note">
          Searches every platform you have connected at once. Stats and injuries come from ingested
          sports data — never an invented number.
        </p>
      </form>

      <div className="af-pf-body">
        {/* ── Matches ───────────────────────────────────────────────── */}
        <section className="af-card af-pf-matches">
          <header className="af-pf-section-head">
            <h2 className="af-label">Matches · {matches.length}</h2>
          </header>

          {matches.length === 0 ? (
            <p className="af-pf-unavailable">
              {query.trim().length < 2
                ? 'Type at least two characters to search.'
                : `No player matching “${query}”.`}
            </p>
          ) : (
            <ul className="af-pf-match-list">
              {matches.map((m) => (
                <li key={m.externalId}>
                  <Link
                    // Sport-qualified: `externalId` alone is ambiguous across
                    // sports and opened whichever athlete came back first.
                    href={`/core/players?q=${encodeURIComponent(query)}&player=${encodeURIComponent(playerRef(m.sport, m.externalId))}`}
                    className="af-pf-match"
                    data-active={
                      detail?.player.externalId === m.externalId && detail?.player.sport === m.sport
                    }
                  >
                    <span className="af-pf-match-name">{m.name}</span>
                    <span className="af-pf-match-meta">
                      {[m.position, m.team].filter(Boolean).join(' · ') || 'no position on file'}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── Detail ────────────────────────────────────────────────── */}
        {detail ? (
          <section className="af-card af-pf-detail">
            <header className="af-pf-detail-head">
              {detail.player.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  className="af-pf-headshot"
                  src={detail.player.imageUrl}
                  alt=""
                  width={72}
                  height={72}
                />
              ) : (
                <div className="af-pf-headshot af-pf-headshot--none" aria-hidden>
                  {detail.player.name.charAt(0)}
                </div>
              )}

              <div className="af-pf-identity">
                <h1 className="af-display af-pf-name">{detail.player.name}</h1>
                <div className="af-pf-line">
                  {[
                    detail.player.position,
                    detail.player.team,
                    detail.player.number != null ? `#${detail.player.number}` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
                <div className="af-pf-line af-pf-rostered">
                  {detail.leagues.available
                    ? detail.leagues.data.length > 0
                      ? `on ${detail.leagues.data.length} of your ${leagueCount} ${leagueCount === 1 ? 'league' : 'leagues'}`
                      : `not on any of your ${leagueCount} ${leagueCount === 1 ? 'league' : 'leagues'}`
                    : 'cross-league lookup unavailable'}
                </div>
              </div>

              <span className="af-sync af-num" data-stale={detail.freshness.stale}>
                {detail.freshness.stale ? '⚠ ' : ''}
                {detail.freshness.label}
              </span>
            </header>

            {/* Stat tiles — a missing one says why rather than showing a bare dash */}
            <div className="af-pf-tiles">
              {/*
                ⚠ "STANDARD SCORING" IS SAID OUT LOUD BECAUSE THE FEED IS NOT
                LEAGUE-SPECIFIC. This screen spans every league the user is in, and
                the same player is worth different points in each. An unqualified
                "Proj this week" would read as a projection under whichever league
                the reader has in mind, which is a claim we cannot support.
              */}
              <StatTile
                label="Proj this week"
                state={detail.projection}
                value={detail.projection.available ? detail.projection.data.points.toFixed(1) : null}
                help={
                  detail.projection.available
                    ? `Standard scoring · ${detail.projection.data.season} week ${detail.projection.data.week}`
                    : undefined
                }
              />
              <StatTile label="Snap share" state={detail.snapShare} />
              <StatTile
                label="Pos rank"
                state={detail.positionRank}
                value={
                  detail.positionRank.available
                    ? `${detail.positionRank.data.position}${detail.positionRank.data.rank}`
                    : null
                }
                // The denominator lives here rather than in the value so the tile
                // reads "WR12 / of 143 projected" — a rank AND its universe.
                help={
                  detail.positionRank.available
                    ? `of ${detail.positionRank.data.outOf} projected ${detail.positionRank.data.position}s`
                    : undefined
                }
              />
              <StatTile
                label="Age"
                value={detail.bio.age != null ? String(detail.bio.age) : null}
                help={detail.bio.age == null ? 'no birth date on file' : undefined}
              />
            </div>

            {/* ── Injury ────────────────────────────────────────────── */}
            <section className="af-pf-block">
              <h3 className="af-label">Injury</h3>
              {detail.injury.available ? (
                <div className="af-pf-injury">
                  <span className="af-chip af-pf-injury-status">
                    {detail.injury.data.status ?? 'no designation'}
                  </span>
                  {detail.injury.data.description ? (
                    <p className="af-pf-injury-note">{detail.injury.data.description}</p>
                  ) : null}
                </div>
              ) : (
                <Unavailable reason={detail.injury.reason} />
              )}
            </section>

            {/*
              ── What this means for you ──────────────────────────────
              ⚠ THIS SITS ABOVE THE REFERENCE MATERIAL BECAUSE IT IS THE DECISION.
              On a Sunday the question is not "tell me about this player", it is
              "which of my leagues needs me right now, and who do I play instead".
              Bio, stats and cross-league presence are context for that answer,
              not a preamble to scroll past while a lineup locks.
            */}
            {detail.impact.available && detail.impact.data.length > 0 ? (
              <section className="af-pf-block af-pf-impact">
                <h3 className="af-label">What this means for your teams</h3>
                <ul className="af-pf-impact-list">
                  {detail.impact.data.map((im) => (
                    <li
                      key={im.leagueId}
                      className="af-pf-impact-row"
                      data-starting={im.isStarting}
                    >
                      <div className="af-pf-impact-head">
                        <span className="af-pf-league-name">{im.leagueName}</span>
                        <span className="af-pf-impact-slot" data-slot={im.slot}>
                          {im.slot}
                        </span>
                        {/*
                          The league-scored number, never the generic one. The
                          key coverage is shown because "10 of 52 scoring keys"
                          is normal for a QB in an IDP league and alarming-looking
                          without the explanation.
                        */}
                        {im.afPoints.available ? (
                          <span className="af-pf-impact-pts af-num">
                            {im.afPoints.data.points.toFixed(1)}
                            <em className="af-pf-impact-pts-note">
                              your league&rsquo;s scoring · {im.afPoints.data.matchedKeys}/
                              {im.afPoints.data.scoredKeys} keys
                            </em>
                          </span>
                        ) : (
                          <span className="af-pf-impact-pts af-pf-impact-pts--none">
                            <em className="af-pf-impact-pts-note">{im.afPoints.reason}</em>
                          </span>
                        )}
                      </div>

                      {im.replacements.available ? (
                        <ul className="af-pf-swap-list">
                          {im.replacements.data.slice(0, 4).map((r) => (
                            <li key={r.playerId} className="af-pf-swap">
                              <span className="af-pf-swap-name">{r.name}</span>
                              <span className="af-pf-swap-meta">
                                {[r.position, r.team].filter(Boolean).join(' · ')} · {r.from}
                              </span>
                              {/*
                                ⚠ AN UNPRICED OPTION SHOWS A DASH AND STAYS IN THE
                                LIST. He is unknown, not worthless — dropping him
                                or scoring him zero would hide a legitimate swap.
                              */}
                              {r.afPoints == null ? (
                                <span className="af-pf-swap-pts af-pf-swap-pts--none af-num">—</span>
                              ) : (
                                <span className="af-pf-swap-pts af-num">
                                  {r.afPoints.toFixed(1)}
                                  {r.delta != null ? (
                                    <em className="af-pf-swap-delta" data-up={r.delta > 0}>
                                      {r.delta > 0 ? '+' : ''}
                                      {r.delta.toFixed(1)}
                                    </em>
                                  ) : null}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="af-pf-swap-none">{im.replacements.reason}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ) : !detail.impact.available ? (
              <section className="af-pf-block">
                <h3 className="af-label">What this means for your teams</h3>
                <Unavailable reason={detail.impact.reason} />
              </section>
            ) : null}

            {/* ── Every platform, every league ──────────────────────── */}
            <section className="af-pf-block">
              <h3 className="af-label">Every platform, every league</h3>
              {detail.leagues.available ? (
                detail.leagues.data.length === 0 ? (
                  <p className="af-pf-unavailable">
                    He is not rostered in any league you have connected.
                  </p>
                ) : (
                  <table className="af-pf-table">
                    <thead>
                      <tr>
                        <th className="af-label">League</th>
                        <th className="af-label">Slot</th>
                        <th className="af-label" />
                      </tr>
                    </thead>
                    <tbody>
                      {detail.leagues.data.map((l) => (
                        <tr key={l.leagueId}>
                          <td>
                            <span className="af-pf-league-name">{l.leagueName}</span>
                            <span className="af-pf-league-meta">
                              <span className="af-platform af-pf-platform" data-platform={l.platform}>
                                {l.platform}
                              </span>
                              {l.format ? ` ${l.format}` : ''}
                            </span>
                          </td>
                          <td>
                            <span className="af-chip af-num">{l.slot}</span>
                          </td>
                          <td className="af-pf-table-action">
                            <Link href={`/core?league=${encodeURIComponent(l.leagueId)}`} className="af-pf-link">
                              Open league →
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              ) : (
                <Unavailable reason={detail.leagues.reason} />
              )}
            </section>

            {/* ── Season stats ──────────────────────────────────────── */}
            <section className="af-pf-block">
              <h3 className="af-label">Season statistics</h3>
              {detail.seasonStats.available ? (
                <ul className="af-pf-seasons">
                  {detail.seasonStats.data.map((s) => (
                    <li key={s.season} className="af-pf-season">
                      <span className="af-num af-pf-season-year">{s.season}</span>
                      <span className="af-pf-season-stats">
                        {Object.entries(s.stats)
                          .slice(0, 6)
                          .map(([k, v]) => `${k} ${v}`)
                          .join(' · ')}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <Unavailable reason={detail.seasonStats.reason} />
              )}
            </section>

            {/* ── Recommended moves ─────────────────────────────────── */}
            <section className="af-pf-block">
              <h3 className="af-label">Recommended moves</h3>
              <Unavailable reason={detail.recommendedMoves.reason} />
              <p className="af-pf-readonly-note">
                When these land they will name the platform and screen — you make the change there.
                AllFantasy only reads your leagues.
              </p>
            </section>
          </section>
        ) : (
          <section className="af-card af-pf-detail af-pf-detail--empty">
            <p className="af-pf-unavailable">Pick a match to see slots, injury and season history.</p>
          </section>
        )}
      </div>
    </div>
  )
}

export default PlayerFinder
