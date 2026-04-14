'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useTournamentUi } from '@/app/tournament/[tournamentId]/TournamentUiContext'

const TABS: { id: string; label: string; icon: string }[] = [
  { id: 'general', label: 'General', icon: '🏆' },
  { id: 'conferences', label: 'Conferences', icon: '🗺' },
  { id: 'leagues', label: 'Leagues', icon: '🎯' },
  { id: 'rounds', label: 'Rounds', icon: '📅' },
  { id: 'scoring', label: 'Scoring', icon: '📊' },
  { id: 'roster', label: 'Roster', icon: '👥' },
  { id: 'waivers', label: 'Waivers', icon: '🔄' },
  { id: 'trades', label: 'Trades', icon: '🤝' },
  { id: 'playoffs', label: 'Playoffs', icon: '🏅' },
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

function SettingRow({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  value: string | number | boolean
  onChange?: (value: any) => void
  type?: 'text' | 'number' | 'select' | 'checkbox'
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-black/10 px-3 py-2 mb-2">
      <label className="text-[13px] font-medium text-white">{label}</label>
      <div className="flex gap-2">
        {type === 'checkbox' ? (
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange?.(e.target.checked)}
            className="h-4 w-4 rounded border-white/20 bg-black/20 cursor-pointer"
          />
        ) : type === 'number' ? (
          <input
            type="number"
            value={value}
            onChange={(e) => onChange?.(parseInt(e.target.value, 10))}
            className="w-20 rounded border border-white/20 bg-black/30 px-2 py-1 text-[13px] text-white text-right"
          />
        ) : type === 'select' ? (
          <select
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            className="rounded border border-white/20 bg-black/30 px-2 py-1 text-[13px] text-white"
          >
            <option value="PPR">PPR</option>
            <option value="HALF_PPR">Half-PPR</option>
            <option value="STANDARD">Standard</option>
          </select>
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            className="rounded border border-white/20 bg-black/30 px-2 py-1 text-[13px] text-white w-40 text-right"
          />
        )}
      </div>
    </div>
  )
}

export function TournamentSettingsModalEditable({
  open,
  onClose,
  tournamentId,
  viewerUserId,
}: {
  open: boolean
  onClose: () => void
  tournamentId: string
  viewerUserId: string | null
}) {
  const ctx = useTournamentUi()
  const { shell, conferences, rounds, tournamentLeagues, legacyFeederLeagues } = ctx
  const [tab, setTab] = useState('general')
  const [saving, setSaving] = useState(false)
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null)
  const [leagueSettings, setLeagueSettings] = useState<Record<string, any>>({})

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

  const handleLoadLeagueSettings = (leagueId: string) => {
    const feederLeague = legacyFeederLeagues?.find((l) => l.leagueId === leagueId)
    if (feederLeague) {
      setSelectedLeagueId(leagueId)
      // Load current settings (you'd fetch these from the league data)
      setLeagueSettings({
        scoring: 'PPR',
        rosterSize: 15,
        benchSize: 7,
        waiverType: 'FAAB',
        faabBudget: 100,
        faabResetByRound: true,
        tradeDeadlineWeek: 12,
        tradeLockHours: 0,
      })
    }
  }

  const handleSaveLeagueSettings = async () => {
    if (!selectedLeagueId) return

    setSaving(true)
    try {
      const res = await fetch(
        `/api/tournament/${tournamentId}/feeder-league/settings`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            leagueId: selectedLeagueId,
            changes: leagueSettings,
          }),
        }
      )

      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error || 'Failed to update settings')
        return
      }

      const data = await res.json()
      toast.success(
        `Settings updated! Notifications sent to ${data.notificationsSent} league members.`
      )
      onClose()
    } catch (err) {
      console.error('[settings-save]', err)
      toast.error('Something went wrong')
    } finally {
      setSaving(false)
    }
  }

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
                  <div className="flex justify-between gap-4 p-2 rounded-lg border border-white/10 bg-black/10">
                    <dt className="text-[var(--tournament-text-dim)]">Name</dt>
                    <dd className="text-right font-medium text-white">{shell.name}</dd>
                  </div>
                  <div className="flex justify-between gap-4 p-2 rounded-lg border border-white/10 bg-black/10">
                    <dt className="text-[var(--tournament-text-dim)]">Sport</dt>
                    <dd className="text-right text-white">{shell.sport}</dd>
                  </div>
                  <div className="flex justify-between gap-4 p-2 rounded-lg border border-white/10 bg-black/10">
                    <dt className="text-[var(--tournament-text-dim)]">Max participants</dt>
                    <dd className="text-right text-white">{shell.maxParticipants}</dd>
                  </div>
                  <div className="flex justify-between gap-4 p-2 rounded-lg border border-white/10 bg-black/10">
                    <dt className="text-[var(--tournament-text-dim)]">Conferences × leagues × teams</dt>
                    <dd className="text-right text-white">
                      {shell.conferenceCount} × {shell.leaguesPerConference} × {shell.teamsPerLeague}
                    </dd>
                  </div>
                </dl>
              </Section>
            </>
          ) : null}

          {tab === 'scoring' ? (
            <>
              <Section title="Select league to edit">
                <div className="flex flex-wrap gap-2 mb-4">
                  {legacyFeederLeagues?.map((league) => (
                    <button
                      key={league.leagueId}
                      onClick={() => handleLoadLeagueSettings(league.leagueId)}
                      className={`px-3 py-2 rounded-lg text-[12px] font-medium transition ${
                        selectedLeagueId === league.leagueId
                          ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400'
                          : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {league.name}
                    </button>
                  ))}
                </div>
              </Section>

              {selectedLeagueId && (
                <>
                  <Section title="Scoring settings">
                    <SettingRow
                      label="Scoring format"
                      value={leagueSettings.scoring}
                      onChange={(v) => setLeagueSettings({ ...leagueSettings, scoring: v })}
                      type="select"
                    />
                  </Section>

                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveLeagueSettings}
                      disabled={saving}
                      className="flex-1 rounded-lg bg-cyan-600 px-4 py-2 text-[13px] font-bold text-white hover:bg-cyan-700 disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save & Notify All'}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedLeagueId(null)
                        setLeagueSettings({})
                      }}
                      className="flex-1 rounded-lg border border-white/20 px-4 py-2 text-[13px] font-bold text-white hover:bg-white/10"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </>
          ) : null}

          {tab === 'roster' ? (
            <>
              <Section title="Select league to edit">
                <div className="flex flex-wrap gap-2">
                  {legacyFeederLeagues?.map((league) => (
                    <button
                      key={league.leagueId}
                      onClick={() => handleLoadLeagueSettings(league.leagueId)}
                      className={`px-3 py-2 rounded-lg text-[12px] font-medium transition ${
                        selectedLeagueId === league.leagueId
                          ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400'
                          : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {league.name}
                    </button>
                  ))}
                </div>
              </Section>

              {selectedLeagueId && (
                <>
                  <Section title="Roster settings">
                    <SettingRow
                      label="Roster size"
                      value={leagueSettings.rosterSize}
                      onChange={(v) => setLeagueSettings({ ...leagueSettings, rosterSize: v })}
                      type="number"
                    />
                    <SettingRow
                      label="Bench spots"
                      value={leagueSettings.benchSize}
                      onChange={(v) => setLeagueSettings({ ...leagueSettings, benchSize: v })}
                      type="number"
                    />
                  </Section>

                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveLeagueSettings}
                      disabled={saving}
                      className="flex-1 rounded-lg bg-cyan-600 px-4 py-2 text-[13px] font-bold text-white hover:bg-cyan-700 disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save & Notify All'}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedLeagueId(null)
                        setLeagueSettings({})
                      }}
                      className="flex-1 rounded-lg border border-white/20 px-4 py-2 text-[13px] font-bold text-white hover:bg-white/10"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </>
          ) : null}

          {tab === 'waivers' ? (
            <>
              <Section title="Select league to edit">
                <div className="flex flex-wrap gap-2">
                  {legacyFeederLeagues?.map((league) => (
                    <button
                      key={league.leagueId}
                      onClick={() => handleLoadLeagueSettings(league.leagueId)}
                      className={`px-3 py-2 rounded-lg text-[12px] font-medium transition ${
                        selectedLeagueId === league.leagueId
                          ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400'
                          : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {league.name}
                    </button>
                  ))}
                </div>
              </Section>

              {selectedLeagueId && (
                <>
                  <Section title="Waiver settings">
                    <SettingRow
                      label="Waiver type"
                      value={leagueSettings.waiverType}
                      onChange={(v) => setLeagueSettings({ ...leagueSettings, waiverType: v })}
                    />
                    <SettingRow
                      label="FAAB budget"
                      value={leagueSettings.faabBudget}
                      onChange={(v) => setLeagueSettings({ ...leagueSettings, faabBudget: v })}
                      type="number"
                    />
                    <SettingRow
                      label="Reset FAAB per round"
                      value={leagueSettings.faabResetByRound}
                      onChange={(v) => setLeagueSettings({ ...leagueSettings, faabResetByRound: v })}
                      type="checkbox"
                    />
                  </Section>

                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveLeagueSettings}
                      disabled={saving}
                      className="flex-1 rounded-lg bg-cyan-600 px-4 py-2 text-[13px] font-bold text-white hover:bg-cyan-700 disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save & Notify All'}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedLeagueId(null)
                        setLeagueSettings({})
                      }}
                      className="flex-1 rounded-lg border border-white/20 px-4 py-2 text-[13px] font-bold text-white hover:bg-white/10"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </>
          ) : null}

          {tab === 'trades' ? (
            <>
              <Section title="Select league to edit">
                <div className="flex flex-wrap gap-2">
                  {legacyFeederLeagues?.map((league) => (
                    <button
                      key={league.leagueId}
                      onClick={() => handleLoadLeagueSettings(league.leagueId)}
                      className={`px-3 py-2 rounded-lg text-[12px] font-medium transition ${
                        selectedLeagueId === league.leagueId
                          ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400'
                          : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {league.name}
                    </button>
                  ))}
                </div>
              </Section>

              {selectedLeagueId && (
                <>
                  <Section title="Trade settings">
                    <SettingRow
                      label="Trade deadline week"
                      value={leagueSettings.tradeDeadlineWeek}
                      onChange={(v) => setLeagueSettings({ ...leagueSettings, tradeDeadlineWeek: v })}
                      type="number"
                    />
                    <SettingRow
                      label="Trade lock hours before game"
                      value={leagueSettings.tradeLockHours}
                      onChange={(v) => setLeagueSettings({ ...leagueSettings, tradeLockHours: v })}
                      type="number"
                    />
                  </Section>

                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveLeagueSettings}
                      disabled={saving}
                      className="flex-1 rounded-lg bg-cyan-600 px-4 py-2 text-[13px] font-bold text-white hover:bg-cyan-700 disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save & Notify All'}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedLeagueId(null)
                        setLeagueSettings({})
                      }}
                      className="flex-1 rounded-lg border border-white/20 px-4 py-2 text-[13px] font-bold text-white hover:bg-white/10"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
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

          {tab === 'playoffs' ? (
            <Section title="Playoff settings">
              <p className="text-[13px] text-[var(--tournament-text-mid)]">
                Playoff format, advancement rules, and bracket settings can be customized here.
              </p>
            </Section>
          ) : null}

          {tab === 'advanced' ? (
            <Section title="Advanced settings">
              <p className="text-[12px] text-[var(--tournament-text-dim)]">
                Advanced tournament configuration and automation options.
              </p>
            </Section>
          ) : null}
        </div>
      </div>
    </div>
  )
}
