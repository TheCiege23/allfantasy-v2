'use client'

/**
 * DraftSeasonHQ — the seasonal draft command surface on the dashboard: every
 * draft across every league (the existing cross-league /api/draft/intel list),
 * as countdown tiles — LIVE drafts pulse straight into that league's Live
 * Intel cockpit, scheduled ones show their clock with one-tap prep (needs,
 * market values, and run detection pre-loaded), and freshly completed drafts
 * link to their instant report card in Legacy. Renders only while there's a
 * draft worth commanding (anything not complete, or completed in the last 21
 * days); the rest of the year it stays out of the way.
 */

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { DraftListItem } from '@/lib/draft-intel/sleeperDraftIntelService'
import type { UserLeague } from '../types'
import { WarRoomCard } from './warroom/WarRoomCard'
import { SectionHeading } from './warroom/SectionHeading'
import '@/components/decide/broadcast-deck.css'

type ListResponse =
  | { linked: false; drafts: null }
  | { linked: true; season?: string; drafts: DraftListItem[] | null; error?: string }

const RECENT_COMPLETE_DAYS = 21

function countdown(startTime: string): string {
  const ms = new Date(startTime).getTime() - Date.now()
  if (ms <= 0) return 'due now'
  const hours = ms / 3_600_000
  if (hours < 1) return `in ${Math.max(1, Math.round(ms / 60_000))}m`
  if (hours < 48) return `in ${Math.round(hours)}h`
  return `in ${Math.round(hours / 24)}d`
}

export function DraftSeasonHQ({ leagues }: { leagues: UserLeague[] }) {
  const [drafts, setDrafts] = useState<DraftListItem[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void fetch('/api/draft/intel', { credentials: 'same-origin', cache: 'no-store' })
      .then((res) => (res.ok ? (res.json() as Promise<ListResponse>) : null))
      .then((payload) => {
        if (!cancelled && payload?.linked && Array.isArray(payload.drafts)) setDrafts(payload.drafts)
      })
      .catch(() => {
        /* additive */
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const afLeagueFor = (sleeperLeagueId: string | null): UserLeague | null =>
    sleeperLeagueId ? leagues.find((l) => l.sleeperLeagueId === sleeperLeagueId) ?? null : null

  const relevant = (drafts ?? []).filter((d) => {
    if (d.status !== 'complete') return true
    if (!d.startTime) return false
    return Date.now() - new Date(d.startTime).getTime() < RECENT_COMPLETE_DAYS * 86_400_000
  })
  if (!loading && relevant.length === 0) return null

  const live = relevant.filter((d) => d.status === 'drafting' || d.status === 'paused')
  const upcoming = relevant
    .filter((d) => d.status === 'pre_draft')
    .sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? ''))
  const completed = relevant.filter((d) => d.status === 'complete')

  const Tile = ({ d }: { d: DraftListItem }) => {
    const af = afLeagueFor(d.leagueId)
    const isLive = d.status === 'drafting'
    // Un-imported league: deep-link import with the league PRE-FILLED (the
    // /import page's existing leagueId contract) — landing on a blank form and
    // re-finding the league by hand is where taps went to die.
    const href = af
      ? d.status === 'complete'
        ? `/league/${af.id}?view=legacy`
        : `/league/${af.id}?view=draft_intel`
      : d.leagueId
        ? `/import?provider=sleeper&leagueId=${encodeURIComponent(d.leagueId)}&returnTo=/dashboard`
        : '/import?returnTo=/dashboard'
    return (
      <Link
        href={href}
        className="min-w-[190px] shrink-0 rounded-xl border border-[#262c6a] bg-[#12163e]/70 p-3 transition hover:bg-[#12163e]"
        style={isLive ? { borderColor: '#3ddc97', boxShadow: '0 0 18px rgba(61,220,151,0.14)' } : undefined}
      >
        <div className="truncate text-[11px] font-extrabold text-[#f0f2ff]">{af?.name ?? d.name}</div>
        <div className="mt-1">
          {isLive ? (
            af ? (
              <span className="bdx-sev ok">● LIVE — open cockpit</span>
            ) : (
              <span className="bdx-sev warn">● LIVE — import to open</span>
            )
          ) : d.status === 'paused' ? (
            <span className="bdx-sev warn">⏸ paused</span>
          ) : d.status === 'complete' ? (
            <span className="bdx-sev info">done — report card →</span>
          ) : (
            <span className="text-[16px] font-black italic text-[#ff8a3d]">
              {d.startTime ? countdown(d.startTime) : 'scheduled'}
            </span>
          )}
        </div>
        <div className="mt-1 text-[9.5px] text-[#5d64a3]">
          {d.teams || '—'} teams · {d.rounds || '—'} rounds
          {d.startTime && d.status === 'pre_draft'
            ? ` · ${new Date(d.startTime).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`
            : ''}
          {!af ? ' · not imported — tap to import' : ''}
        </div>
      </Link>
    )
  }

  return (
    <WarRoomCard className="p-4 sm:p-5" data-testid="draft-season-hq">
      <SectionHeading
        trailing={
          <span className="text-[10px] font-bold uppercase tracking-wide text-white/30">
            {live.length} live · {upcoming.length} upcoming · {completed.length} recent
          </span>
        }
      >
        Draft season HQ
      </SectionHeading>
      {loading ? (
        <div className="bdx-skel" style={{ height: 56, marginTop: 12 }} />
      ) : (
        <div className="bdx" style={{ background: 'transparent', padding: 0 }}>
          <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
            {[...live, ...upcoming, ...completed].map((d) => (
              <Tile key={d.draftId} d={d} />
            ))}
          </div>
          <p className="mt-2 text-[10px] leading-snug text-[#5d64a3]">
            Live and scheduled drafts open the Live Intel cockpit (needs, market values, run
            detection pre-loaded from your league&apos;s exact format); completed drafts open their
            instant report card in Legacy.
          </p>
        </div>
      )}
    </WarRoomCard>
  )
}

export default DraftSeasonHQ
