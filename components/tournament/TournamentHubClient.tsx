'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Trophy, BarChart3, MessageSquare, ChevronRight, Users, GitBranch, Download, Sparkles } from 'lucide-react'
import { useUserTimezone } from '@/hooks/useUserTimezone'
import { useLanguage } from '@/components/i18n/LanguageProviderClient'

interface Conference {
  id: string
  name: string
  theme: string
  leagues: Array<{
    id: string
    leagueId: string
    league: { id: string; name: string | null; leagueSize: number | null }
    roundIndex: number
    phase: string
    orderInConference: number
  }>
}

interface Round {
  id: string
  roundIndex: number
  phase: string
  name: string | null
  startWeek: number | null
  endWeek: number | null
  status: string
}

interface TournamentData {
  id: string
  name: string
  sport: string
  season: number
  status: string
  isCommissioner: boolean
  conferences: Conference[]
  rounds: Round[]
  _leagueCount: number
  settings?: { roundRedraftSchedule?: number[]; qualificationWeeks?: number }
}

interface StandingsRow {
  leagueId: string
  leagueName: string | null
  conferenceName: string
  rosterId: string
  userId: string | null
  teamName: string | null
  wins: number
  losses: number
  ties: number
  pointsFor: number
  pointsAgainst: number
  rankInLeague: number
  qualificationRank: number
  rankInConference?: number
  advancementStatus?: 'advanced' | 'bubble' | 'out'
  onBubble?: boolean
}

interface BracketData {
  tournamentName: string
  qualificationWeeks: number
  currentRound: number
  rounds: Array<{ roundIndex: number; phase: string; name: string | null; startWeek: number | null; endWeek: number | null; status: string }>
  cutLine: { advancementPerConference: number; description: string }
  bubble: { enabled: boolean; slotsPerConference: number; description: string }
  tiebreakers: string[]
  activeCount: number
  eliminatedCount: number
  leaguesByRound: Record<number, Array<{ leagueId: string; leagueName: string | null; conferenceName: string; phase: string; bracketLabel: string | null }>>
}

interface Announcement {
  id: string
  title: string | null
  body: string
  type: string
  pinned: boolean
  createdAt: string
}

export function TournamentHubClient({ tournamentId }: { tournamentId: string }) {
  const { t, tInterpolate } = useLanguage()
  const { formatInTimezone } = useUserTimezone()
  const [tab, setTab] = useState<'overview' | 'standings' | 'bracket' | 'announcements' | 'ai'>('overview')
  const [tournament, setTournament] = useState<TournamentData | null>(null)
  const [standings, setStandings] = useState<StandingsRow[]>([])
  const [bracket, setBracket] = useState<BracketData | null>(null)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<'loadTournament' | 'load' | null>(null)
  const [advancing, setAdvancing] = useState(false)
  const [aiType, setAiType] = useState<string>('standings_analysis')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState<string | null>(null)
  const [aiPosting, setAiPosting] = useState(false)

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const [tRes, sRes, aRes] = await Promise.all([
          fetch(`/api/tournament/${encodeURIComponent(tournamentId)}`, { cache: 'no-store' }),
          fetch(`/api/tournament/${encodeURIComponent(tournamentId)}/standings`, { cache: 'no-store' }),
          fetch(`/api/tournament/${encodeURIComponent(tournamentId)}/announcements`, { cache: 'no-store' }),
        ])
        if (!active) return
        if (!tRes.ok) {
          setError('loadTournament')
          return
        }
        const tData = await tRes.json()
        setTournament(tData)
        if (sRes.ok) {
          const sData = await sRes.json()
          setStandings(sData.standings ?? [])
        }
        if (aRes.ok) {
          const aData = await aRes.json()
          setAnnouncements(aData.announcements ?? [])
        }
      } catch {
        if (active) setError('load')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [tournamentId])

  useEffect(() => {
    if (tab !== 'bracket') return
    let active = true
    fetch(`/api/tournament/${encodeURIComponent(tournamentId)}/bracket`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (active) setBracket(data)
      })
      .catch(() => { if (active) setBracket(null) })
    return () => { active = false }
  }, [tab, tournamentId])

  async function runAdvancement() {
    setAdvancing(true)
    try {
      const res = await fetch(`/api/tournament/${encodeURIComponent(tournamentId)}/advance`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        window.location.reload()
      } else {
        alert(typeof data.error === 'string' ? data.error : t('tournament.publicHub.advancement.failed'))
      }
    } finally {
      setAdvancing(false)
    }
  }

  if (loading || !tournament) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-white/60">
        {error ? t(`tournament.publicHub.error.${error}`) : t('tournament.publicHub.loading')}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTab('overview')}
          className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
            tab === 'overview'
              ? 'border-amber-500/40 bg-amber-950/30 text-amber-200'
              : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
          }`}
        >
          <Trophy className="h-4 w-4" /> {t('tournament.publicHub.tab.overview')}
        </button>
        <button
          type="button"
          onClick={() => setTab('standings')}
          className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
            tab === 'standings'
              ? 'border-amber-500/40 bg-amber-950/30 text-amber-200'
              : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
          }`}
        >
          <BarChart3 className="h-4 w-4" /> {t('tournament.publicHub.tab.universalStandings')}
        </button>
        <button
          type="button"
          onClick={() => setTab('bracket')}
          className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
            tab === 'bracket'
              ? 'border-amber-500/40 bg-amber-950/30 text-amber-200'
              : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
          }`}
        >
          <GitBranch className="h-4 w-4" /> {t('tournament.publicHub.tab.bracket')}
        </button>
        <button
          type="button"
          onClick={() => setTab('announcements')}
          className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
            tab === 'announcements'
              ? 'border-amber-500/40 bg-amber-950/30 text-amber-200'
              : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
          }`}
        >
          <MessageSquare className="h-4 w-4" /> {t('tournament.publicHub.tab.announcements')}
        </button>
        {tournament?.isCommissioner && (
          <button
            type="button"
            onClick={() => setTab('ai')}
            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
              tab === 'ai'
                ? 'border-amber-500/40 bg-amber-950/30 text-amber-200'
                : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
            }`}
          >
            <Sparkles className="h-4 w-4" /> {t('tournament.publicHub.tab.ai')}
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <a
          href={`/api/tournament/${encodeURIComponent(tournamentId)}/export`}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
          download
        >
          <Download className="h-4 w-4" /> {t('tournament.publicHub.exportCsv')}
        </a>
        {tournament?.isCommissioner && tournament?.status === 'qualification' && (
          <button
            type="button"
            onClick={runAdvancement}
            disabled={advancing}
            className="inline-flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-600/30 px-4 py-2 text-sm font-medium text-amber-200 hover:bg-amber-600/50 disabled:opacity-50"
          >
            {advancing ? t('tournament.publicHub.running') : t('tournament.publicHub.runAdvancement')}
          </button>
        )}
      </div>

      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
            <h3 className="mb-3 text-lg font-semibold text-white">{t('tournament.publicHub.conferencesTitle')}</h3>
            <p className="mb-4 text-sm text-white/60">
              {tInterpolate('tournament.publicHub.leaguesAcrossConferences', {
                leagues: String(tournament._leagueCount),
                conferences: String(tournament.conferences.length),
              })}
            </p>
            <div className="space-y-4">
              {tournament.conferences.map((conf) => (
                <div key={conf.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                  <h4 className="mb-2 font-medium text-white/90">{conf.name}</h4>
                  <ul className="flex flex-wrap gap-2">
                    {conf.leagues.map((tl) => (
                      <li key={tl.id}>
                        <Link
                          href={`/league/${tl.leagueId}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/80 hover:bg-white/10"
                        >
                          {tl.league.name ??
                            tInterpolate('tournament.publicHub.leagueN', {
                              n: String(tl.orderInConference + 1),
                            })}
                          <ChevronRight className="h-3 w-3" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
            <h3 className="mb-3 text-lg font-semibold text-white">{t('tournament.publicHub.roundsTitle')}</h3>
            <ul className="space-y-2">
              {tournament.rounds.map((r) => (
                <li key={r.id} className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2 text-sm">
                  <span className="text-white/90">
                    {r.name ?? tInterpolate('tournament.hub.roundN', { n: String(r.roundIndex) })}
                  </span>
                  <span className="text-white/50">{r.status}</span>
                  {r.startWeek != null && r.endWeek != null && (
                    <span className="text-white/50">
                      {tInterpolate('tournament.publicHub.weeksRange', {
                        start: String(r.startWeek),
                        end: String(r.endWeek),
                      })}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
          {tournament.settings?.roundRedraftSchedule && tournament.settings.roundRedraftSchedule.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
              <h3 className="mb-2 text-lg font-semibold text-white">{t('tournament.publicHub.draftScheduleTitle')}</h3>
              <p className="text-sm text-white/70">
                {tInterpolate('tournament.publicHub.redraftWeeks', {
                  weeks: tournament.settings.roundRedraftSchedule.join(', '),
                })}
              </p>
            </div>
          )}
          {tournament.isCommissioner && (
            <Link
              href={`/tournament/${tournamentId}/control`}
              className="inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-950/20 px-4 py-2.5 text-sm font-medium text-amber-200 hover:bg-amber-950/40"
            >
              <Users className="h-4 w-4" /> {t('tournament.publicHub.commissionerControl')}
            </Link>
          )}
        </div>
      )}

      {tab === 'bracket' && bracket && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
            <h3 className="mb-3 text-lg font-semibold text-white">{t('tournament.publicHub.cutLineTitle')}</h3>
            <p className="mb-2 text-sm text-white/80">{bracket.cutLine.description}</p>
            <p className="mb-2 text-sm text-white/70">{bracket.bubble.description}</p>
            <p className="text-xs text-white/50">
              {tInterpolate('tournament.publicHub.tiebreakersLabel', {
                list: bracket.tiebreakers.join(' → '),
              })}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
            <h3 className="mb-3 text-lg font-semibold text-white">{t('tournament.publicHub.roundStatusTitle')}</h3>
            <p className="mb-2 text-sm text-white/70">
              {tInterpolate('tournament.publicHub.activeEliminated', {
                active: String(bracket.activeCount),
                eliminated: String(bracket.eliminatedCount),
              })}
            </p>
            <ul className="space-y-2">
              {bracket.rounds.map((r) => (
                <li key={r.roundIndex} className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm">
                  <span className="font-medium text-white/90">
                    {r.name ?? tInterpolate('tournament.hub.roundN', { n: String(r.roundIndex) })}
                  </span>
                  <span className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-white/70">{r.status}</span>
                  {r.startWeek != null && r.endWeek != null && (
                    <span className="text-white/50">
                      {tInterpolate('tournament.publicHub.weeksRange', {
                        start: String(r.startWeek),
                        end: String(r.endWeek),
                      })}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
          {Object.keys(bracket.leaguesByRound).length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
              <h3 className="mb-3 text-lg font-semibold text-white">{t('tournament.publicHub.leaguesByRoundTitle')}</h3>
              {Object.entries(bracket.leaguesByRound).map(([roundIdx, list]) => (
                <div key={roundIdx} className="mb-4 last:mb-0">
                  <h4 className="mb-2 text-sm font-medium text-white/70">
                    {tInterpolate('tournament.publicHub.roundIndex', { n: roundIdx })}
                  </h4>
                  <ul className="flex flex-wrap gap-2">
                    {list.map((l) => (
                      <li key={l.leagueId}>
                        <Link
                          href={`/league/${l.leagueId}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/80 hover:bg-white/10"
                        >
                          {l.leagueName ?? l.leagueId}
                          {l.bracketLabel && <span className="text-white/50">({l.bracketLabel})</span>}
                          <ChevronRight className="h-3 w-3" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'standings' && (
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-white/70">
                <th className="p-3">{t('tournament.publicHub.standings.col.rank')}</th>
                <th className="p-3">{t('tournament.publicHub.standings.col.confRank')}</th>
                <th className="p-3">{t('tournament.publicHub.standings.col.league')}</th>
                <th className="p-3">{t('tournament.publicHub.standings.col.conference')}</th>
                <th className="p-3">{t('tournament.publicHub.standings.col.status')}</th>
                <th className="p-3">{t('tournament.publicHub.standings.col.w')}</th>
                <th className="p-3">{t('tournament.publicHub.standings.col.l')}</th>
                <th className="p-3">{t('tournament.publicHub.standings.col.pf')}</th>
                <th className="p-3">{t('tournament.publicHub.standings.col.pa')}</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((row) => (
                <tr key={row.rosterId} className="border-b border-white/5">
                  <td className="p-3 text-white/90">{row.qualificationRank}</td>
                  <td className="p-3 text-white/80">{row.rankInConference ?? '—'}</td>
                  <td className="p-3 text-white/80">{row.leagueName ?? '—'}</td>
                  <td className="p-3 text-white/70">{row.conferenceName}</td>
                  <td className="p-3">
                    {row.advancementStatus === 'advanced' && (
                      <span className="text-amber-400">{t('tournament.publicHub.standings.status.advanced')}</span>
                    )}
                    {row.advancementStatus === 'bubble' && (
                      <span className="text-yellow-500">{t('tournament.publicHub.standings.status.bubble')}</span>
                    )}
                    {row.advancementStatus === 'out' && (
                      <span className="text-white/50">{t('tournament.publicHub.standings.status.out')}</span>
                    )}
                    {!row.advancementStatus && '—'}
                  </td>
                  <td className="p-3">{row.wins}</td>
                  <td className="p-3">{row.losses}</td>
                  <td className="p-3">{row.pointsFor.toFixed(1)}</td>
                  <td className="p-3">{row.pointsAgainst.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {standings.length === 0 && (
            <div className="p-8 text-center text-white/50">{t('tournament.publicHub.standings.empty')}</div>
          )}
        </div>
      )}

      {tab === 'announcements' && (
        <div className="space-y-3">
          {announcements.map((a) => (
            <div
              key={a.id}
              className={`rounded-2xl border p-4 ${a.pinned ? 'border-amber-500/20 bg-amber-950/10' : 'border-white/10 bg-white/[0.03]'}`}
            >
              {a.title && <h4 className="mb-1 font-medium text-white">{a.title}</h4>}
              <p className="text-sm text-white/80 whitespace-pre-wrap">{a.body}</p>
              <p className="mt-2 text-xs text-white/50">{formatInTimezone(a.createdAt)}</p>
            </div>
          ))}
          {announcements.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-white/50">
              {t('tournament.publicHub.announcements.empty')}
            </div>
          )}
        </div>
      )}

      {tab === 'ai' && tournament?.isCommissioner && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
          <h3 className="mb-3 text-lg font-semibold text-white">{t('tournament.publicHub.ai.title')}</h3>
          <p className="mb-4 text-sm text-white/60">{t('tournament.publicHub.ai.body')}</p>
          <div className="mb-4 flex flex-wrap gap-2">
            {[
              { type: 'weekly_recap', labelKey: 'tournament.publicHub.ai.weeklyRecap' },
              { type: 'standings_analysis', labelKey: 'tournament.publicHub.ai.standingsAnalysis' },
              { type: 'bubble_watch', labelKey: 'tournament.publicHub.ai.bubbleWatch' },
              { type: 'draft_prep', labelKey: 'tournament.publicHub.ai.draftPrep' },
              { type: 'commissioner_assistant', labelKey: 'tournament.publicHub.ai.commissionerAssistant' },
              { type: 'bracket_preview', labelKey: 'tournament.publicHub.ai.bracketPreview' },
            ].map(({ type, labelKey }) => (
              <button
                key={type}
                type="button"
                disabled={aiLoading}
                onClick={async () => {
                  setAiType(type)
                  setAiLoading(true)
                  setAiResult(null)
                  try {
                    const res = await fetch(`/api/tournament/${encodeURIComponent(tournamentId)}/ai`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ type }),
                    })
                    const json = await res.json()
                    if (res.ok && json.text) setAiResult(json.text)
                    else setAiResult(typeof json.error === 'string' ? json.error : t('tournament.publicHub.ai.errorGeneration'))
                  } catch {
                    setAiResult(t('tournament.publicHub.ai.errorRequest'))
                  } finally {
                    setAiLoading(false)
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-950/20 px-4 py-2.5 text-sm font-medium text-amber-200 hover:bg-amber-950/40 disabled:opacity-50"
              >
                {t(labelKey)}
              </button>
            ))}
          </div>
          {aiLoading && <p className="text-sm text-white/60">{t('tournament.publicHub.ai.generating')}</p>}
          {aiResult && !aiLoading && (
            <div className="space-y-2">
              <textarea
                readOnly
                value={aiResult}
                rows={8}
                className="w-full rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-white/90"
              />
              <button
                type="button"
                disabled={aiPosting}
                onClick={async () => {
                  setAiPosting(true)
                  try {
                    const res = await fetch(`/api/tournament/${encodeURIComponent(tournamentId)}/announcements`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ body: aiResult, type: 'general' }),
                    })
                    if (res.ok) setAiResult(null)
                  } finally {
                    setAiPosting(false)
                  }
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-600/30 px-4 py-2 text-sm text-amber-200 disabled:opacity-50"
              >
                {aiPosting ? t('tournament.publicHub.ai.posting') : t('tournament.publicHub.ai.postAnnouncement')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
