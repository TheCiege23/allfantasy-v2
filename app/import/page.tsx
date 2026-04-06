"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import {
  refreshLegacyImportStatus,
  LEGACY_PROVIDER_IDS,
  getLegacyProviderName,
  getImportStatusLabel,
  getProviderStatus,
  getLegacyProviderHelpHref,
} from '@/lib/legacy-import-settings'
import { StepHelp } from '@/components/league-creation-wizard/StepHelp'

const SLEEPER_LAUNCH_YEAR = 2017;

type ImportResult = {
  imported: number;
  seasons: number;
  sports: Record<string, number>;
  years: number[];
  displayName: string;
  commissionerLeagues?: number;
  historicalLeagues?: number;
  skippedNotCommissioner?: number;
  status?: string;
  jobId?: string;
  leagueKeys?: Array<{ platformLeagueId: string; season: number }>;
};

function getImportErrorMessage(data: { error?: string } | null | undefined, fallback: string) {
  if (data?.error === "VERIFICATION_REQUIRED") {
    return "Verify your email or phone before importing leagues.";
    // Unified import panel from dashboard/rankings
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] to-[#0f0f1a] py-20">
        <div className="container mx-auto max-w-3xl px-4">
          <div className="mb-8 flex justify-center sm:justify-start">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/70 transition hover:border-cyan-400/30 hover:bg-white/[0.08] hover:text-white"
            >
              <span aria-hidden>&larr;</span>
              <span>Back to Home</span>
            </Link>
          </div>
          <h1 className="mb-4 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-center text-5xl font-bold text-transparent">
            Import Your League
          </h1>
          <p className="mb-12 text-center text-gray-400">
            Import from any supported platform below. Results will appear on your Rankings page.
          </p>
          {/* Unified import panel from dashboard/rankings */}
          <UnifiedImportPanel />
        </div>
      </div>
    );
                  // Unified import panel component (copy from dashboard/rankings)
                  import { useState, useEffect } from 'react'
                  import { useState, useEffect } from 'react'
                  // Provider-specific help text for import setup
                  const PROVIDER_INPUT_CONFIG: Record<string, { label: string; placeholder: string; help?: string }> = {
                    sleeper: {
                      label: 'Sleeper League ID',
                      placeholder: 'e.g. 123456789',
                      help: (
                        <ol className="list-decimal pl-4 space-y-1">
                          <li>Open your Sleeper league in a browser or app.</li>
                          <li>Find the league ID in the URL (e.g. <span className="text-cyan-300">sleeper.com/leagues/<b>123456789</b></span>).</li>
                          <li>Paste the league ID above.</li>
                          <li>Make sure your Sleeper account is linked in League Sync for best results.</li>
                        </ol>
                      ),
                    },
                    espn: {
                      label: 'ESPN League ID',
                      placeholder: 'e.g. 12345678, 2025:12345678, or a full ESPN league URL',
                      help: (
                        <ol className="list-decimal pl-4 space-y-1">
                          <li>Go to your ESPN league homepage.</li>
                          <li>Copy the league ID from the URL (e.g. <span className="text-cyan-300">fantasy.espn.com/football/league?leagueId=<b>12345678</b></span>).</li>
                          <li>For private leagues, save your SWID and ESPN_S2 cookies in League Sync first.</li>
                          <li>Paste the league ID or full URL above.</li>
                        </ol>
                      ),
                    },
                    yahoo: {
                      label: 'Yahoo League Key',
                      placeholder: 'e.g. 461.l.12345 or 12345',
                      help: (
                        <ol className="list-decimal pl-4 space-y-1">
                          <li>Connect your Yahoo account in League Sync.</li>
                          <li>Find your league key in the Yahoo league URL (e.g. <span className="text-cyan-300">sports.yahoo.com/fantasy/football/league/<b>461.l.12345</b></span>).</li>
                          <li>Paste the league key or numeric ID above.</li>
                        </ol>
                      ),
                    },
                    fantrax: {
                      label: 'Fantrax Source',
                      placeholder: 'e.g. id:<legacy-uuid> or username|2025|League Name',
                      help: (
                        <ol className="list-decimal pl-4 space-y-1">
                          <li>Obtain your Fantrax legacy league UUID or username.</li>
                          <li>Optionally include season and league name (e.g. <span className="text-cyan-300">username|2025|League Name</span>).</li>
                          <li>Paste the source string above.</li>
                        </ol>
                      ),
                    },
                    mfl: {
                      label: 'MFL League ID',
                      placeholder: 'e.g. 12345, 2026:12345, or a full MFL league URL',
                      help: (
                        <ol className="list-decimal pl-4 space-y-1">
                          <li>Save your MFL API key in League Sync.</li>
                          <li>Find your league ID in the URL (e.g. <span className="text-cyan-300">myfantasyleague.com/2026/options?L=<b>12345</b></span>).</li>
                          <li>Paste the league ID, season-prefixed ID, or full URL above.</li>
                        </ol>
                      ),
                    },
                    fleaflicker: {
                      label: 'Fleaflicker League ID',
                      placeholder: 'e.g. 123456',
                      help: (
                        <ol className="list-decimal pl-4 space-y-1">
                          <li>Connect your Fleaflicker account in League Sync if required.</li>
                          <li>Find your league ID in the URL (e.g. <span className="text-cyan-300">fleaflicker.com/nhl/leagues/<b>123456</b></span>).</li>
                          <li>Paste the league ID above.</li>
                        </ol>
                      ),
                    },
                  };

                  function UnifiedImportPanel() {
                    const [legacyStatus, setLegacyStatus] = useState(null)
                    const [loading, setLoading] = useState(true)
                    const [importInputs, setImportInputs] = useState<Record<string, string>>({})
                    const [importing, setImporting] = useState(false)
                    const [importError, setImportError] = useState<Record<string, string | null>>({})
                    const [selectedProviders, setSelectedProviders] = useState<string[]>([])

                    useEffect(() => {
                      void (async () => {
                        setLoading(true)
                        setLegacyStatus(await refreshLegacyImportStatus())
                        setLoading(false)
                      })()
                    }, [])

                    // Helper: API endpoint and payload for each provider
                    const getImportConfig = (providerId: string, input: string) => {
                      switch (providerId) {
                        case 'sleeper':
                          return async () => {
                            const username = input.trim()
                            if (!username) throw new Error('Sleeper username required')
                            const userRes = await fetch(`https://api.sleeper.app/v1/user/${username}`)
                            if (!userRes.ok) throw new Error('Sleeper username not found')
                            const userData = await userRes.json()
                            await fetch('/api/import-sleeper', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ sleeperUserId: userData.user_id, sport: 'nfl', isLegacy: true }),
                            })
                          }
                        case 'espn':
                          return async () => {
                            if (!input.trim()) throw new Error('ESPN League ID required')
                            await fetch('/api/league/import/espn/preview', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ leagueId: input.trim() }),
                            })
                          }
                        case 'yahoo':
                          return async () => {
                            if (!input.trim()) throw new Error('Yahoo League Key required')
                            await fetch('/api/league/import/yahoo/preview', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ leagueKey: input.trim() }),
                            })
                          }
                        case 'fantrax':
                          return async () => {
                            if (!input.trim()) throw new Error('Fantrax Source required')
                            await fetch('/api/league/import/fantrax/preview', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ source: input.trim() }),
                            })
                          }
                        case 'mfl':
                          return async () => {
                            if (!input.trim()) throw new Error('MFL League ID required')
                            await fetch('/api/league/import/mfl/preview', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ leagueId: input.trim() }),
                            })
                          }
                        case 'fleaflicker':
                          return async () => {
                            if (!input.trim()) throw new Error('Fleaflicker League ID required')
                            await fetch('/api/league/import/fleaflicker/preview', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ leagueId: input.trim() }),
                            })
                          }
                        default:
                          return async () => { throw new Error('Import for this provider coming soon') }
                      }
                    }

                    // Sequential import for selected providers
                    const handleSequentialImport = async () => {
                      setImporting(true)
                      let anyError = false
                      for (const providerId of selectedProviders) {
                        setImportError((prev) => ({ ...prev, [providerId]: null }))
                        try {
                          await getImportConfig(providerId, importInputs[providerId] || '')()
                          setLegacyStatus(await refreshLegacyImportStatus())
                        } catch (e: any) {
                          setImportError((prev) => ({ ...prev, [providerId]: e.message || 'Import failed' }))
                          anyError = true
                        }
                      }
                      setImporting(false)
                      if (!anyError) setSelectedProviders([])
                    }

                    return (
                      <div>
                        <div className="mb-4 text-sm text-white/80">Select one or more platforms to import from. Imports will run one at a time in the order selected.</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                          {LEGACY_PROVIDER_IDS.map((providerId) => {
                            const status = legacyStatus ? getProviderStatus(legacyStatus, providerId) : null
                            const name = getLegacyProviderName(providerId)
                            const importStatusLabel = status?.importStatus ? getImportStatusLabel(status.importStatus) : '—'
                            const imported = status?.importStatus === 'completed'
                            const isDisabled = importing || imported
                            const isSelected = selectedProviders.includes(providerId)
                            return (
                              <div key={providerId} className={`rounded-xl border border-white/10 bg-white/5 p-4 flex flex-col gap-2 relative ${isSelected ? 'ring-2 ring-cyan-400' : ''}`}>
                                <div className="flex items-center gap-2 mb-1">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={e => {
                                      if (e.target.checked) setSelectedProviders(prev => [...prev, providerId])
                                      else setSelectedProviders(prev => prev.filter(id => id !== providerId))
                                    }}
                                    disabled={isDisabled}
                                    className="accent-cyan-500 mr-2"
                                    aria-label={`Select ${name} for import`}
                                  />
                                  <span className="font-bold text-white text-base">{name}</span>
                                  <StepHelp title={`How to import from ${name}`}>{PROVIDER_INPUT_CONFIG[providerId]?.help || `Import instructions for ${name} will appear here.`}</StepHelp>
                                </div>
                                <div className="text-xs text-white/50 mb-1">Status: {importStatusLabel}</div>
                                {imported ? (
                                  <div className="text-green-400 text-xs font-semibold">Imported</div>
                                ) : (
                                  <>
                                    <input
                                      type="text"
                                      value={importInputs[providerId] || ''}
                                      onChange={e => setImportInputs(inputs => ({ ...inputs, [providerId]: e.target.value }))}
                                      placeholder={
                                        providerId === 'sleeper' ? 'Sleeper username'
                                          : providerId === 'espn' ? 'ESPN League ID'
                                          : providerId === 'yahoo' ? 'Yahoo League Key'
                                          : providerId === 'fantrax' ? 'Fantrax Source'
                                          : providerId === 'mfl' ? 'MFL League ID'
                                          : providerId === 'fleaflicker' ? 'Fleaflicker League ID'
                                          : 'Account/League ID'
                                      }
                                      className="w-full rounded border border-white/10 bg-white/10 px-2 py-1 text-sm text-white placeholder:text-white/30 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
                                      disabled={isDisabled}
                                    />
                                    {importError[providerId] && <div className="text-xs text-red-400 mt-1">{importError[providerId]}</div>}
                                  </>
                                )}
                              </div>
                            )
                          })}
                        </div>
                        <button
                          type="button"
                          onClick={handleSequentialImport}
                          disabled={importing || selectedProviders.length === 0 || selectedProviders.some(pid => !(importInputs[pid] || '').trim())}
                          className="w-full rounded-xl py-3 text-[14px] font-bold bg-gradient-to-r from-cyan-600 to-purple-600 text-white disabled:opacity-40"
                        >
                          {importing ? 'Importing…' : 'Import Selected Platforms'}
                        </button>
                      </div>
                    )
                  }
                  </p>
                  <p className="mb-1 text-[13px] text-white/70">
                    {result.imported} leagues queued across {result.seasons} seasons
                    {result.status === "processing"
                      ? ". Rank and stats update in the background on your Rankings page."
                      : ""}
                  </p>
                  {Object.keys(result.sports).length > 0 ? (
                    <p className="mb-3 text-[11px] text-white/40">
                      {Object.entries(result.sports)
                        .map(([s, n]) => `${s}: ${n} league${n !== 1 ? "s" : ""}`)
                        .join(" · ")}
                    </p>
                  ) : null}
                  {result.commissionerLeagues != null && result.historicalLeagues != null ? (
                    <p className="mt-1 text-[12px] text-white/40">
                      Commissioner leagues: {result.commissionerLeagues} current season ·{" "}
                      {result.historicalLeagues} historical seasons included
                    </p>
                  ) : null}
                  {result.skippedNotCommissioner != null && result.skippedNotCommissioner > 0 ? (
                    <p className="mt-1 text-[11px] text-amber-400/80">
                      ⚠ {result.skippedNotCommissioner} current-season league
                      {result.skippedNotCommissioner !== 1 ? "s" : ""} skipped — you are not the commissioner
                    </p>
                  ) : null}
                  <Link
                    href={
                      result.jobId
                        ? `/dashboard/rankings?jobId=${encodeURIComponent(result.jobId)}`
                        : "/dashboard/rankings"
                    }
                    className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-500 px-4 py-2 text-[13px] font-bold text-black transition-colors hover:bg-cyan-400"
                  >
                    View rank &amp; legacy profile →
                  </Link>
                </div>
              ) : null}
            </div>
          </div>

          <EspnImportForm />
        </div>
      </div>
    </div>
  );
}
