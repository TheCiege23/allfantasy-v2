'use client'

/**
 * ManagerH2H — the Legacy deep-sync surface: manager-vs-manager records and
 * scoring profiles across every season, from /api/league/h2h.
 *
 * Replaces the "Head-to-head · not yet" honesty card with the real thing.
 * Everything shown is counted from played matchups; trends are last-3-weeks vs
 * season average in the newest season; nothing renders without games behind it.
 */

import { useEffect, useMemo, useState } from 'react'
import type { H2HManager, LeagueH2HPayload } from '@/lib/league-history/sleeperH2HService'
import { sleeperAvatarThumb } from '@/lib/sports-data/headshots'
import './broadcast-deck.css'

type ApiResponse =
  | { supported: false; platform: string }
  | { supported: true; viewerSleeperUserId: string | null; h2h: LeagueH2HPayload | null; error?: string }

function Ava({ id, size = 16 }: { id: string | null; size?: number }) {
  const src = sleeperAvatarThumb(id)
  if (!src) return null
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', verticalAlign: '-3px' }}
    />
  )
}

function TrendChip({ trend }: { trend: H2HManager['trend'] }) {
  if (trend === 'up') return <span className="bdx-sev ok">▲ up</span>
  if (trend === 'down') return <span className="bdx-sev crit">▼ down</span>
  if (trend === 'flat') return <span className="bdx-sev info">— flat</span>
  return <span className="k">—</span>
}

export function ManagerH2H({ leagueId }: { leagueId: string }) {
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [aId, setAId] = useState<string | null>(null)
  const [bId, setBId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void fetch(`/api/league/h2h?leagueId=${encodeURIComponent(leagueId)}`, {
      credentials: 'same-origin',
      cache: 'no-store',
    })
      .then((res) => res.json() as Promise<ApiResponse>)
      .then((payload) => {
        if (cancelled) return
        setData(payload)
        if (payload.supported && payload.h2h) {
          const viewer = payload.viewerSleeperUserId
          const managers = payload.h2h.managers
          const me = viewer ? managers.find((m) => m.ownerId === viewer) : null
          const first = me ?? managers[0] ?? null
          const second = managers.find((m) => m.ownerId !== first?.ownerId) ?? null
          setAId(first?.ownerId ?? null)
          setBId(second?.ownerId ?? null)
        }
      })
      .catch(() => {
        if (!cancelled) setData({ supported: true, viewerSleeperUserId: null, h2h: null, error: 'Request failed' })
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [leagueId])

  const h2h = data && data.supported ? data.h2h : null
  const viewerId = data && data.supported ? data.viewerSleeperUserId : null

  const a = useMemo(() => h2h?.managers.find((m) => m.ownerId === aId) ?? null, [h2h, aId])
  const rivalry = useMemo(
    () => (a && bId ? a.byOpponent.find((o) => o.opponentOwnerId === bId) ?? null : null),
    [a, bId],
  )
  const b = useMemo(() => h2h?.managers.find((m) => m.ownerId === bId) ?? null, [h2h, bId])

  return (
    <div data-testid="manager-h2h">
      <div className="bdx-kick" style={{ marginTop: 22 }}>
        <h2 className="bdx-disp">Manager vs manager</h2>
        <span className="bdx-sub">
          {h2h
            ? `${h2h.totalGames} matchups synced across ${h2h.seasons.length} season${h2h.seasons.length === 1 ? '' : 's'}`
            : 'deep sync of every week ever played'}
        </span>
      </div>

      {loading ? (
        <div className="bdx-skel" />
      ) : !h2h ? (
        <div className="bdx-empty">
          <div className="t">Head-to-head sync temporarily unavailable</div>
          <div className="m">
            The first sync reads every week of every season and can take a moment — try again
            shortly.
          </div>
        </div>
      ) : (
        <>
          {/* ── Rivalry picker ── */}
          <div className="bdx-panelbox" style={{ marginBottom: 12 }}>
            <h3>Pick a rivalry</h3>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
              {h2h.managers.map((m) => {
                const active = m.ownerId === aId
                return (
                  <button
                    key={m.ownerId}
                    type="button"
                    className={`bdx-btn ${active ? 'pri' : 'sec'}`}
                    onClick={() => {
                      setAId(m.ownerId)
                      if (m.ownerId === bId) setBId(aId)
                    }}
                  >
                    <Ava id={m.avatar} /> {m.name}
                  </button>
                )
              })}
            </div>
            <div className="bdx-sub" style={{ marginBottom: 6 }}>versus</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {h2h.managers
                .filter((m) => m.ownerId !== aId)
                .map((m) => {
                  const active = m.ownerId === bId
                  return (
                    <button
                      key={m.ownerId}
                      type="button"
                      className={`bdx-btn ${active ? 'pri' : 'sec'}`}
                      onClick={() => setBId(m.ownerId)}
                    >
                      <Ava id={m.avatar} /> {m.name}
                    </button>
                  )
                })}
            </div>

            {a && b ? (
              rivalry ? (
                <div className="bdx-rows" style={{ marginTop: 12 }}>
                  <div className="bdx-row">
                    <span className="k">All-time record</span>
                    <span className="x">
                      {a.name} {rivalry.wins}–{rivalry.losses}
                      {rivalry.ties > 0 ? `–${rivalry.ties}` : ''} {b.name}
                    </span>
                  </div>
                  <div className="bdx-row">
                    <span className="k">Avg margin ({a.name})</span>
                    <span className="x">
                      {rivalry.avgMargin > 0 ? '+' : ''}
                      {rivalry.avgMargin.toFixed(1)}
                    </span>
                  </div>
                  {rivalry.closest ? (
                    <div className="bdx-row">
                      <span className="k">Closest game</span>
                      <span className="x">
                        {rivalry.closest.season} wk {rivalry.closest.week} ·{' '}
                        {rivalry.closest.margin > 0 ? '+' : ''}
                        {rivalry.closest.margin.toFixed(1)}
                      </span>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="bdx-rail-empty" style={{ marginTop: 12 }}>
                  These two managers have never met in a synced matchup.
                </div>
              )
            ) : null}
          </div>

          {/* ── Scoring profiles ── */}
          <div className="bdx-panelbox">
            <h3>Scoring profiles · all synced seasons</h3>
            <table className="bdx-stand">
              <thead>
                <tr>
                  <th>Manager</th>
                  <th style={{ textAlign: 'right' }}>GP</th>
                  <th style={{ textAlign: 'right' }}>Avg</th>
                  <th style={{ textAlign: 'right' }}>High</th>
                  <th style={{ textAlign: 'right' }}>Low</th>
                  <th style={{ textAlign: 'right' }} title="Standard deviation — lower = steadier week to week">
                    ±SD
                  </th>
                  <th style={{ textAlign: 'right' }} title="Share of weeks scoring above the league median">
                    Top-half
                  </th>
                  <th style={{ textAlign: 'right' }}>Trend</th>
                </tr>
              </thead>
              <tbody>
                {h2h.managers.map((m) => (
                  <tr key={m.ownerId} className={viewerId && m.ownerId === viewerId ? 'me' : undefined}>
                    <td>
                      <Ava id={m.avatar} /> {m.name}
                    </td>
                    <td className="rec">{m.games}</td>
                    <td className="rec">{m.avgPoints.toFixed(1)}</td>
                    <td className="rec">{m.high.toFixed(1)}</td>
                    <td className="rec">{m.low.toFixed(1)}</td>
                    <td className="rec">{m.stdev.toFixed(1)}</td>
                    <td className="rec">{m.topHalfPct}%</td>
                    <td className="rec">
                      <TrendChip trend={m.trend} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {h2h.missing.length > 0 ? (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              {h2h.missing.map((m) => (
                <span key={m} className="bdx-sev warn">
                  ⚠ couldn&apos;t sync: {m}
                </span>
              ))}
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}

export default ManagerH2H
