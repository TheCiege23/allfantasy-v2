'use client'

import { useMemo, useState } from 'react'
import { useTournamentUi } from '@/app/tournament/[tournamentId]/TournamentUiContext'

const TABS: { id: string; label: string; icon: string }[] = [
  { id: 'general', label: 'General', icon: '🏆' },
  { id: 'conferences', label: 'Conferences', icon: '🗺' },
  { id: 'leagues', label: 'Leagues', icon: '🎯' },
  { id: 'rounds', label: 'Rounds', icon: '📅' },
  { id: 'drafts', label: 'Drafts', icon: '🎲' },
  { id: 'standings', label: 'Standings', icon: '📊' },
  { id: 'forum', label: 'Forum', icon: '📣' },
  { id: 'branding', label: 'Branding', icon: '🎨' },
  { id: 'automation', label: 'Automation', icon: '⚡' },
  { id: 'advanced', label: 'Advanced', icon: '⚙️' },
]

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6 rounded-xl border border-[var(--tournament-border)] bg-black/20 p-4">
      <h3 className="mb-3 text-[12px] font-bold uppercase tracking-wide text-[var(--tournament-text-dim)]">
        {title}
      </h3>
      {children}
    </section>
  )
}

export function TournamentSettingsModal({
  open,
  onClose,
  tournamentId: _tournamentId,
  viewerUserId,
}: {
  open: boolean
  onClose: () => void
  tournamentId: string
  viewerUserId: string | null
}) {
  const ctx = useTournamentUi()
  const { shell, conferences, rounds, tournamentLeagues } = ctx
  const [tab, setTab] = useState('general')

  const leaguesByConf = useMemo(() => {
    const m = new Map<string, typeof tournamentLeagues>()
    for (const tl of tournamentLeagues) {
      const k = tl.conferenceId ?? '_'
      const arr = m.get(k) ?? []
      arr.push(tl)
      m.set(k, arr)
    }
    return m
  }, [tournamentLeagues])

  if (!open) return null

  if (!viewerUserId || !ctx.isCommissioner) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm md:items-center md:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tournament-settings-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex h-[100dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-[var(--tournament-border)] bg-[var(--tournament-panel)] shadow-2xl md:h-[90vh] md:rounded-2xl">
        <div className="flex items-center justify-between border-b border-[var(--tournament-border)] px-4 py-3">
          <h2 id="tournament-settings-title" className="text-[15px] font-bold text-white">
            Tournament settings
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-[13px] text-white/50 hover:bg-white/10 hover:text-white"
            data-testid="tournament-settings-close"
          >
            Close
          </button>
        </div>
        <p className="border-b border-[var(--tournament-border)] px-4 py-2 text-[11px] text-[var(--tournament-text-dim)]">
          Read-only overview. Server actions for edits ship in a follow-up; use existing commissioner API routes
          where available.
        </p>
        <div className="scrollbar-none flex gap-1 overflow-x-auto border-b border-[var(--tournament-border)] px-2 py-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`shrink-0 rounded-lg px-3 py-2 text-[12px] font-semibold whitespace-nowrap ${
                tab === t.id ? 'bg-cyan-500/20 text-cyan-200' : 'text-[var(--tournament-text-mid)] hover:bg-white/5'
              }`}
              data-testid={`tournament-settings-tab-${t.id}`}
            >
              <span className="mr-1">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {tab === 'general' ? (
            <>
              <Section title="Tournament structure">
                <dl className="grid gap-2 text-[13px]">
                  <div className="flex justify-between gap-4">
                    <dt className="text-[var(--tournament-text-dim)]">Name</dt>
                    <dd className="text-right font-medium text-white">{shell.name}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-[var(--tournament-text-dim)]">Sport</dt>
                    <dd className="text-right text-white">{shell.sport}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-[var(--tournament-text-dim)]">Max participants</dt>
                    <dd className="text-right text-white">{shell.maxParticipants}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-[var(--tournament-text-dim)]">Conferences × leagues × teams</dt>
                    <dd className="text-right text-white">
                      {shell.conferenceCount} × {shell.leaguesPerConference} × {shell.teamsPerLeague}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-[var(--tournament-text-dim)]">Naming mode</dt>
                    <dd className="text-right text-white">{shell.namingMode}</dd>
                  </div>
                </dl>
              </Section>
              <Section title="Scoring + roster">
                <dl className="grid gap-2 text-[13px] text-white">
                  <div className="flex justify-between">
                    <span className="text-[var(--tournament-text-dim)]">Scoring</span>
                    {shell.scoringSystem}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--tournament-text-dim)]">Draft</span>
                    {shell.draftType}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--tournament-text-dim)]">Waivers</span>
                    {shell.waiverType}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--tournament-text-dim)]">Roster sizes</span>
                    <span>
                      {shell.openingRosterSize} / {shell.tournamentRosterSize} / {shell.eliteRosterSize}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--tournament-text-dim)]">FAAB reset</span>
                    {shell.faabResetOnRedraft ? 'Yes' : 'No'}
                  </div>
                </dl>
              </Section>
            </>
          ) : null}

          {tab === 'conferences' ? (
            <Section title="Conferences">
              <ul className="space-y-3">
                {conferences.map((c) => (
                  <li
                    key={c.id}
                    className="rounded-lg border border-[var(--tournament-border)] bg-black/15 p-3 text-[13px]"
                  >
                    <p className="font-semibold text-white">{c.name}</p>
                    <p className="text-[11px] text-[var(--tournament-text-dim)]">{c.slug}</p>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          {tab === 'leagues' ? (
            <Section title="League names">
              {conferences.map((c) => (
                <div key={c.id} className="mb-4">
                  <p className="mb-2 text-[12px] font-bold text-cyan-200/90">{c.name}</p>
                  <ul className="space-y-1">
                    {(leaguesByConf.get(c.id) ?? []).map((l) => (
                      <li key={l.id} className="text-[13px] text-white/90">
                        {l.name}{' '}
                        <span className="text-[11px] text-[var(--tournament-text-dim)]">({l.status})</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </Section>
          ) : null}

          {tab === 'rounds' ? (
            <Section title="Rounds">
              <ul className="space-y-2">
                {rounds.map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--tournament-border)] bg-black/15 px-3 py-2 text-[12px]"
                  >
                    <span className="font-semibold text-white">
                      R{r.roundNumber}: {r.roundLabel}
                    </span>
                    <span className="text-[var(--tournament-text-dim)]">
                      Wk {r.weekStart}–{r.weekEnd} · {r.status}
                    </span>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          {tab === 'drafts' ? (
            <Section title="Draft configuration">
              <dl className="space-y-2 text-[13px] text-white">
                <div className="flex justify-between">
                  <span className="text-[var(--tournament-text-dim)]">Clock (s)</span>
                  {shell.draftClockSeconds}
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--tournament-text-dim)]">Simultaneous drafts</span>
                  {shell.simultaneousDrafts ? 'Yes' : 'No'}
                </div>
              </dl>
              <p className="mt-4 text-[11px] text-[var(--tournament-text-dim)]">
                Per-league scheduled times appear on the Drafts tab in the tournament hub.
              </p>
            </Section>
          ) : null}

          {tab === 'standings' ? (
            <Section title="Standings visibility">
              <p className="text-[13px] text-white">{shell.standingsVisibility}</p>
            </Section>
          ) : null}

          {tab === 'forum' ? (
            <Section title="Forum">
              <p className="text-[13px] text-[var(--tournament-text-mid)]">
                Announcements are posted to the shell feed. Participant posting toggles can be added when the
                forum API is extended.
              </p>
            </Section>
          ) : null}

          {tab === 'branding' ? (
            <Section title="Branding">
              <p className="text-[13px] text-[var(--tournament-text-mid)]">
                Uploads and theme preview — wire to storage when tournament branding API is available.
              </p>
            </Section>
          ) : null}

          {tab === 'automation' ? (
            <Section title="Automation">
              <p className="text-[12px] text-[var(--tournament-text-dim)]">
                Cron-driven flows use `/api/tournament/automation`. Manual triggers remain on commissioner API
                routes.
              </p>
            </Section>
          ) : null}

          {tab === 'advanced' ? (
            <Section title="Advancement rules">
              <dl className="space-y-2 text-[13px] text-white">
                <div className="flex justify-between">
                  <span className="text-[var(--tournament-text-dim)]">Advancers / league</span>
                  {shell.advancersPerLeague}
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--tournament-text-dim)]">Wildcards / conference</span>
                  {shell.wildcardCount}
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--tournament-text-dim)]">Bubble</span>
                  {shell.bubbleEnabled ? `On (${shell.bubbleSize})` : 'Off'}
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--tournament-text-dim)]">Bubble scoring</span>
                  {shell.bubbleScoringMode}
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--tournament-text-dim)]">Tiebreaker</span>
                  {shell.tiebreakerMode}
                </div>
              </dl>
            </Section>
          ) : null}
        </div>
      </div>
    </div>
  )
}
