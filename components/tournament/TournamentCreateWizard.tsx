'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Trophy } from 'lucide-react'
import { SUPPORTED_SPORTS } from '@/lib/sport-scope'
import {
  TOURNAMENT_PARTICIPANT_POOL_SIZES,
  TOURNAMENT_LEAGUE_SIZES,
  DEFAULT_TOURNAMENT_SETTINGS,
} from '@/lib/tournament-mode/constants'
import type { TournamentSettings, ConferenceMode, LeagueNamingMode } from '@/lib/tournament-mode/types'
import { computeLeagueCount } from '@/lib/tournament-mode/TournamentCreationService'

export function TournamentCreateWizard() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [sport, setSport] = useState('NFL')
  const [settings, setSettings] = useState<Partial<TournamentSettings>>({
    ...DEFAULT_TOURNAMENT_SETTINGS,
  })
  const [conferenceNames, setConferenceNames] = useState<[string, string]>(['Black', 'Gold'])
  const [leagueNamesMode, setLeagueNamesMode] = useState<LeagueNamingMode>('app_generated')
  const [leagueNamesPaste, setLeagueNamesPaste] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const participantPool = settings.participantPoolSize ?? 120
  const leagueSize = settings.initialLeagueSize ?? 12
  const leagueCount = computeLeagueCount(participantPool, leagueSize)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!name.trim()) {
      setError('Tournament name is required')
      return
    }
    setCreating(true)
    try {
      const leagueNames =
        leagueNamesMode === 'commissioner_custom' && leagueNamesPaste.trim()
          ? leagueNamesPaste
              .split(/[\n,;]+/)
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined
      const res = await fetch('/api/tournament/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          sport,
          season: new Date().getFullYear(),
          variant: 'black_vs_gold',
          settings: {
            draftType: settings.draftType ?? 'snake',
            participantPoolSize: participantPool,
            conferenceMode: settings.conferenceMode ?? 'black_vs_gold',
            leagueNamingMode: leagueNamesMode,
            initialLeagueSize: leagueSize,
            qualificationWeeks: settings.qualificationWeeks ?? 9,
            qualificationTiebreakers: settings.qualificationTiebreakers ?? ['wins', 'points_for'],
            bubbleWeekEnabled: settings.bubbleWeekEnabled ?? false,
            roundRedraftSchedule: settings.roundRedraftSchedule ?? [10],
            finalsRedraftEnabled: settings.finalsRedraftEnabled ?? true,
            faabBudgetDefault: settings.faabBudgetDefault ?? 100,
            faabResetByRound: settings.faabResetByRound ?? true,
            benchSpotsQualification: settings.benchSpotsQualification ?? 7,
            benchSpotsElimination: settings.benchSpotsElimination ?? 2,
            universalPageVisibility: settings.universalPageVisibility ?? 'unlisted',
            forumAnnouncementsEnabled: settings.forumAnnouncementsEnabled ?? true,
          },
          hubSettings: {
            visibility: settings.universalPageVisibility ?? 'unlisted',
            forumAnnouncements: settings.forumAnnouncementsEnabled ?? true,
          },
          conferenceNames:
            (settings.conferenceMode === 'commissioner_custom' && conferenceNames) || undefined,
          leagueNames: leagueNames && leagueNames.length >= leagueCount ? leagueNames.slice(0, leagueCount) : undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? 'Failed to create tournament')
        return
      }
      router.push(`/app/tournament/${data.tournamentId}/control`)
    } catch (err) {
      setError('Something went wrong')
    } finally {
      setCreating(false)
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <Link
          href="/app/tournament"
          className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" /> Tournaments
        </Link>
      </div>

      <header className="mb-8 flex flex-wrap items-center gap-4 rounded-2xl border border-amber-500/20 bg-amber-950/20 p-4 sm:p-6">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-950/30">
          <Trophy className="h-7 w-7 text-amber-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white sm:text-2xl">Create Tournament</h1>
          <p className="text-sm text-white/60">Multi-league elimination: feeder leagues, conferences, universal standings</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basics */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Basics</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-white/70">Tournament name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-white/40"
                placeholder="e.g. Spring Championship"
                maxLength={120}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-white/70">Sport</label>
              <select
                value={sport}
                onChange={(e) => setSport(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white"
              >
                {SUPPORTED_SPORTS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Draft & pool */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Draft &amp; participant pool</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-white/70">Draft type</label>
              <select
                value={settings.draftType ?? 'snake'}
                onChange={(e) => setSettings((s) => ({ ...s, draftType: e.target.value as 'snake' | 'linear' | 'auction' }))}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white"
              >
                <option value="snake">Snake</option>
                <option value="linear">Linear</option>
                <option value="auction">Auction</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-white/70">Participant pool size</label>
              <select
                value={participantPool}
                onChange={(e) => setSettings((s) => ({ ...s, participantPoolSize: Number(e.target.value) }))}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white"
              >
                {TOURNAMENT_PARTICIPANT_POOL_SIZES.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-white/70">Initial league size</label>
              <select
                value={leagueSize === 'auto' ? 'auto' : leagueSize}
                onChange={(e) => {
                  const v = e.target.value
                  setSettings((s) => ({ ...s, initialLeagueSize: v === 'auto' ? 'auto' : Number(v) }))
                }}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white"
              >
                <option value="auto">Auto-balance by pool</option>
                {TOURNAMENT_LEAGUE_SIZES.map((n) => (
                  <option key={n} value={n}>{n} teams</option>
                ))}
              </select>
            </div>
            <div className="flex items-end text-sm text-white/50">
              → {leagueCount} feeder leagues will be created
            </div>
          </div>
        </section>

        {/* Conference & naming */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Conference &amp; league naming</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-white/70">Conference mode</label>
              <select
                value={settings.conferenceMode ?? 'black_vs_gold'}
                onChange={(e) => setSettings((s) => ({ ...s, conferenceMode: e.target.value as ConferenceMode }))}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white"
              >
                <option value="black_vs_gold">Black vs Gold (fixed)</option>
                <option value="random_themed">Random themed 2-conference</option>
                <option value="commissioner_custom">Commissioner custom names</option>
              </select>
            </div>
            {(settings.conferenceMode ?? '') === 'commissioner_custom' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-white/70">Conference A name</label>
                  <input
                    type="text"
                    value={conferenceNames[0]}
                    onChange={(e) => setConferenceNames(([_, b]) => [e.target.value, b])}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-white/70">Conference B name</label>
                  <input
                    type="text"
                    value={conferenceNames[1]}
                    onChange={(e) => setConferenceNames(([a]) => [a, e.target.value])}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white"
                  />
                </div>
              </div>
            )}
            <div>
              <label className="mb-1 block text-sm text-white/70">League naming</label>
              <select
                value={leagueNamesMode}
                onChange={(e) => setLeagueNamesMode(e.target.value as LeagueNamingMode)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white"
              >
                <option value="app_generated">App-generated (BEAST, GOAT, … / NORTH, SOUTH, …)</option>
                <option value="commissioner_custom">Commissioner custom (paste names)</option>
                <option value="ai_themed">AI-themed (future)</option>
              </select>
            </div>
            {leagueNamesMode === 'commissioner_custom' && (
              <div>
                <label className="mb-1 block text-sm text-white/70">League names (one per line or comma-separated)</label>
                <textarea
                  value={leagueNamesPaste}
                  onChange={(e) => setLeagueNamesPaste(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-white/40 min-h-[120px]"
                  placeholder="League 1&#10;League 2&#10;..."
                />
                <p className="mt-1 text-xs text-white/50">Need at least {leagueCount} unique names.</p>
              </div>
            )}
          </div>
        </section>

        {/* Qualification & rounds */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Qualification &amp; rounds</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-white/70">Qualification weeks</label>
              <input
                type="number"
                min={1}
                max={18}
                value={settings.qualificationWeeks ?? 9}
                onChange={(e) => setSettings((s) => ({ ...s, qualificationWeeks: Number(e.target.value) || 9 }))}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="bubble"
                checked={settings.bubbleWeekEnabled ?? false}
                onChange={(e) => setSettings((s) => ({ ...s, bubbleWeekEnabled: e.target.checked }))}
                className="rounded border-white/20"
              />
              <label htmlFor="bubble" className="text-sm text-white/80">Bubble week ON</label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="finalsRedraft"
                checked={settings.finalsRedraftEnabled ?? true}
                onChange={(e) => setSettings((s) => ({ ...s, finalsRedraftEnabled: e.target.checked }))}
                className="rounded border-white/20"
              />
              <label htmlFor="finalsRedraft" className="text-sm text-white/80">Finals redraft ON</label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="faabReset"
                checked={settings.faabResetByRound ?? true}
                onChange={(e) => setSettings((s) => ({ ...s, faabResetByRound: e.target.checked }))}
                className="rounded border-white/20"
              />
              <label htmlFor="faabReset" className="text-sm text-white/80">FAAB reset by round</label>
            </div>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-white/70">Bench spots (qualification)</label>
              <input
                type="number"
                min={0}
                max={20}
                value={settings.benchSpotsQualification ?? 7}
                onChange={(e) => setSettings((s) => ({ ...s, benchSpotsQualification: Number(e.target.value) || 0 }))}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-white/70">Bench spots (elimination)</label>
              <input
                type="number"
                min={0}
                max={10}
                value={settings.benchSpotsElimination ?? 2}
                onChange={(e) => setSettings((s) => ({ ...s, benchSpotsElimination: Number(e.target.value) || 0 }))}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white"
              />
            </div>
          </div>
        </section>

        {/* Hub & visibility */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Hub &amp; visibility</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-white/70">Universal page visibility</label>
              <select
                value={settings.universalPageVisibility ?? 'unlisted'}
                onChange={(e) => setSettings((s) => ({ ...s, universalPageVisibility: e.target.value as 'public' | 'unlisted' | 'private' }))}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white"
              >
                <option value="public">Public</option>
                <option value="unlisted">Unlisted (link-only)</option>
                <option value="private">Private (commissioner only)</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="forumAnnouncements"
                checked={settings.forumAnnouncementsEnabled ?? true}
                onChange={(e) => setSettings((s) => ({ ...s, forumAnnouncementsEnabled: e.target.checked }))}
                className="rounded border-white/20"
              />
              <label htmlFor="forumAnnouncements" className="text-sm text-white/80">Forum / chat announcements</label>
            </div>
          </div>
        </section>

        {/* Tournament preview card */}
        <section className="rounded-2xl border border-amber-500/20 bg-amber-950/10 p-4 sm:p-6">
          <h2 className="mb-3 text-lg font-semibold text-amber-200">Tournament preview</h2>
          <div className="grid gap-2 text-sm text-white/80">
            <p><strong className="text-white/90">Name:</strong> {name || '—'}</p>
            <p><strong className="text-white/90">Sport:</strong> {sport}</p>
            <p><strong className="text-white/90">Pool / leagues:</strong> {participantPool} participants → {leagueCount} feeder leagues ({Math.ceil(leagueCount / 2)} per conference)</p>
            <p><strong className="text-white/90">Conferences:</strong> {settings.conferenceMode === 'commissioner_custom' ? `${conferenceNames[0]} vs ${conferenceNames[1]}` : 'Black vs Gold (or themed)'}</p>
            <p><strong className="text-white/90">Qualification:</strong> Weeks 1–{settings.qualificationWeeks ?? 9} · Bubble {settings.bubbleWeekEnabled ? 'ON' : 'OFF'}</p>
            <p><strong className="text-white/90">Roster rules:</strong> {settings.benchSpotsQualification ?? 7} bench (qualification) → {settings.benchSpotsElimination ?? 2} bench (elimination)</p>
            <p><strong className="text-white/90">FAAB:</strong> {settings.faabBudgetDefault ?? 100} default · Reset by round: {settings.faabResetByRound ? 'Yes' : 'No'}</p>
          </div>
        </section>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-950/20 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={creating}
            className="rounded-xl border border-amber-500/40 bg-amber-600/30 px-6 py-3 font-medium text-white hover:bg-amber-600/50 disabled:opacity-50"
          >
            {creating ? 'Creating…' : 'Create tournament'}
          </button>
          <Link
            href="/app/tournament"
            className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 font-medium text-white/80 hover:bg-white/10"
          >
            Cancel
          </Link>
        </div>
      </form>
    </main>
  )
}
