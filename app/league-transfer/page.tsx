'use client'

import Link from 'next/link'
import { useCallback, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'

type Platform = 'sleeper' | 'yahoo' | 'mfl' | 'espn' | 'fleaflicker' | 'fantrax'
type Step = 1 | 2 | 3 | 4 | 5

type TransferOptions = {
  copyDraftHistory: boolean
  copyPlayoffHistory: boolean
  copyTradeHistory: boolean
  copyWaiverHistory: boolean
  copyRosters: boolean
  copySettings: boolean
}

type LeaguePreview = {
  name: string
  season: string
  sport: string
  teamCount: number
  format: string
  managers: Array<{ name: string; avatar?: string }>
  rosterPositions: string[]
  playoffTeams?: number
  hasDraft: boolean
}

type PreviewResponse = {
  available: boolean
  alreadyTransferred?: boolean
  existingLeagueId?: string
  message?: string
  league?: LeaguePreview
}

type ProgressEvent = {
  step: string
  progress: number
  message: string
  leagueId?: string
  error?: string
}

const PLATFORMS: Array<{
  id: Platform
  label: string
  emoji: string
  color: string
  available: boolean
  support: string
}> = [
  {
    id: 'sleeper',
    label: 'Sleeper',
    emoji: '🌙',
    color: '#818cf8',
    available: true,
    support: 'Full transfer: settings, rosters, draft history, playoffs, and trades.',
  },
  {
    id: 'yahoo',
    label: 'Yahoo',
    emoji: '🟣',
    color: '#7c3aed',
    available: false,
    support: 'Coming soon.',
  },
  {
    id: 'mfl',
    label: 'MFL',
    emoji: '🏆',
    color: '#fbbf24',
    available: false,
    support: 'Coming soon.',
  },
  {
    id: 'espn',
    label: 'ESPN',
    emoji: '🔴',
    color: '#f97316',
    available: false,
    support: 'Coming soon.',
  },
  {
    id: 'fleaflicker',
    label: 'Fleaflicker',
    emoji: '🦊',
    color: '#34d399',
    available: false,
    support: 'Coming soon.',
  },
  {
    id: 'fantrax',
    label: 'Fantrax',
    emoji: '📊',
    color: '#a78bfa',
    available: false,
    support: 'Coming soon.',
  },
]

const PLATFORM_HELP: Record<Platform, string> = {
  sleeper: 'Open your Sleeper league, then copy the league ID from the URL or settings page.',
  yahoo: 'Yahoo support is coming soon.',
  mfl: 'MFL support is coming soon.',
  espn: 'ESPN support is coming soon.',
  fleaflicker: 'Fleaflicker support is coming soon.',
  fantrax: 'Fantrax support is coming soon.',
}

const STREAM_STEPS = [
  { key: 'validating', label: 'Validating league' },
  { key: 'settings', label: 'Copying settings' },
  { key: 'rosters', label: 'Copying rosters' },
  { key: 'drafts', label: 'Copying draft history' },
  { key: 'playoffs', label: 'Copying playoff bracket' },
  { key: 'trades', label: 'Copying trade history' },
  { key: 'waivers', label: 'Copying waiver history' },
]

function StepIndicator({ current }: { current: Step }) {
  const labels = ['Platform', 'League ID', 'Preview', 'Transfer', 'Done']

  return (
    <div className="mb-8 flex items-center justify-center gap-0">
      {labels.map((label, index) => {
        const step = (index + 1) as Step
        const done = current > step
        const active = current === step
        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-black ${
                  done
                    ? 'bg-green-500 text-black'
                    : active
                      ? 'bg-gradient-to-br from-cyan-500 to-violet-500 text-white'
                      : 'bg-white/10 text-white/30'
                }`}
              >
                {done ? '✓' : step}
              </div>
              <span className={`text-[10px] font-semibold ${active ? 'text-white/80' : done ? 'text-green-300' : 'text-white/25'}`}>
                {label}
              </span>
            </div>
            {index < labels.length - 1 ? (
              <div className={`mx-1 mb-4 h-0.5 w-10 ${done ? 'bg-green-500' : 'bg-white/10'}`} />
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

function LoginRequiredState() {
  return (
    <div className="min-h-screen bg-[#07071a] text-white">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div className="rounded-3xl border border-white/8 bg-[#0c0c1e] p-8 text-center">
          <div className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-300">Commissioner Tool</div>
          <h1 className="mt-4 text-3xl font-black">Sign in to transfer a league</h1>
          <p className="mt-3 text-sm leading-6 text-white/55">
            League transfer reads source league data server-side and creates an AllFantasy league in your account.
          </p>
          <Link
            href="/login?callbackUrl=%2Fleague-transfer"
            className="mt-6 inline-flex rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-5 py-3 text-sm font-bold text-cyan-200 hover:bg-cyan-500/20"
          >
            Go to Login
          </Link>
        </div>
      </div>
    </div>
  )
}

function PlatformStep({ onSelect }: { onSelect: (platform: Platform) => void }) {
  const [hovered, setHovered] = useState<Platform | null>(null)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-white">Select Source Platform</h2>
        <p className="mt-1 text-sm text-white/45">
          Move your league into AllFantasy with exact manager names, settings, roster positions, draft history, and more.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {PLATFORMS.map((platform) => (
          <button
            key={platform.id}
            type="button"
            onClick={() => platform.available && onSelect(platform.id)}
            onMouseEnter={() => setHovered(platform.id)}
            onMouseLeave={() => setHovered(null)}
            disabled={!platform.available}
            className={`relative rounded-3xl border p-5 text-left transition-all ${
              platform.available ? 'hover:scale-[1.02]' : 'cursor-not-allowed opacity-55'
            }`}
            style={{
              borderColor:
                platform.available && hovered === platform.id ? `${platform.color}60` : 'rgba(255,255,255,0.08)',
              background: '#0c0c1e',
              boxShadow: platform.available && hovered === platform.id ? `0 0 24px ${platform.color}20` : 'none',
            }}
          >
            {!platform.available ? (
              <div className="absolute right-3 top-3 rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-black text-white/50">
                SOON
              </div>
            ) : null}
            <div className="text-3xl">{platform.emoji}</div>
            <div className="mt-3 font-black" style={{ color: platform.available ? platform.color : '#ffffff' }}>
              {platform.label}
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-white/45">{platform.support}</p>
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-sm text-white/45">
        All source API calls happen server-side. No credentials are posted from this page.
      </div>
    </div>
  )
}

function LeagueIdStep({
  platform,
  leagueId,
  options,
  loading,
  onBack,
  onLeagueIdChange,
  onOptionsChange,
  onPreview,
}: {
  platform: Platform
  leagueId: string
  options: TransferOptions
  loading: boolean
  onBack: () => void
  onLeagueIdChange: (value: string) => void
  onOptionsChange: (options: TransferOptions) => void
  onPreview: () => void
}) {
  const platformConfig = PLATFORMS.find((item) => item.id === platform) ?? PLATFORMS[0]

  const checkboxOptions: Array<{ key: keyof TransferOptions; label: string; required: boolean }> = [
    { key: 'copySettings', label: 'Scoring settings and roster positions', required: true },
    { key: 'copyRosters', label: 'Manager names and rosters', required: true },
    { key: 'copyDraftHistory', label: 'Draft history', required: false },
    { key: 'copyPlayoffHistory', label: 'Playoff bracket history', required: false },
    { key: 'copyTradeHistory', label: 'Trade history', required: false },
    { key: 'copyWaiverHistory', label: 'Waiver history', required: false },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onBack} className="text-sm text-white/45 hover:text-white">
          ← Back
        </button>
        <div>
          <h2 className="text-2xl font-black text-white">
            <span style={{ color: platformConfig.color }}>{platformConfig.emoji} {platformConfig.label}</span> League
          </h2>
          <p className="text-sm text-white/45">Enter the source league ID and select what to copy.</p>
        </div>
      </div>

      <div className="space-y-5 rounded-3xl border border-white/8 bg-[#0c0c1e] p-5">
        <div>
          <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.24em] text-white/35">
            League ID
          </label>
          <input
            value={leagueId}
            onChange={(event) => onLeagueIdChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && leagueId.trim()) onPreview()
            }}
            placeholder="e.g. 1048565026074173440"
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 font-mono text-sm text-white placeholder:text-white/20 focus:border-cyan-500/40 focus:outline-none"
          />
          <p className="mt-2 text-[11px] text-white/35">{PLATFORM_HELP[platform]}</p>
        </div>

        <div>
          <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.24em] text-white/35">Transfer Options</div>
          <div className="space-y-2.5">
            {checkboxOptions.map((option) => (
              <label key={option.key} className="flex cursor-pointer items-start gap-3">
                <button
                  type="button"
                  disabled={option.required}
                  onClick={() =>
                    !option.required &&
                    onOptionsChange({
                      ...options,
                      [option.key]: !options[option.key],
                    })
                  }
                  className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-md border ${
                    options[option.key]
                      ? 'border-cyan-400 bg-cyan-400 text-black'
                      : 'border-white/20 bg-white/[0.04] text-transparent'
                  }`}
                >
                  ✓
                </button>
                <div>
                  <div className="text-sm text-white/80">
                    {option.label}
                    {option.required ? <span className="ml-2 text-[9px] font-bold uppercase tracking-[0.2em] text-cyan-300">Required</span> : null}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onPreview}
        disabled={!leagueId.trim() || loading}
        className="w-full rounded-2xl py-4 text-sm font-black transition-all disabled:cursor-not-allowed disabled:opacity-35"
        style={{
          background: 'linear-gradient(135deg, #0891b2, #7c3aed)',
          boxShadow: leagueId.trim() ? '0 8px 32px rgba(8,145,178,0.3)' : 'none',
        }}
      >
        {loading ? 'Fetching league preview...' : 'Preview League →'}
      </button>
    </div>
  )
}

function PreviewStep({
  platform,
  preview,
  alreadyTransferred,
  existingLeagueId,
  loading,
  onBack,
  onConfirm,
}: {
  platform: Platform
  preview: LeaguePreview
  alreadyTransferred: boolean
  existingLeagueId: string | null
  loading: boolean
  onBack: () => void
  onConfirm: () => void
}) {
  const platformConfig = PLATFORMS.find((item) => item.id === platform) ?? PLATFORMS[0]

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-black text-white">League Preview</h2>
        <p className="mt-1 text-sm text-white/45">Review the source data before starting the transfer.</p>
      </div>

      {alreadyTransferred && existingLeagueId ? (
        <div className="rounded-2xl border border-green-500/25 bg-green-500/10 p-4 text-sm text-green-100">
          This league has already been transferred. Starting the transfer again will return the existing league.
          <Link href={`/app/league/${existingLeagueId}`} className="ml-2 font-bold text-green-300 hover:text-green-200">
            Open existing league →
          </Link>
        </div>
      ) : null}

      <div
        className="overflow-hidden rounded-3xl border"
        style={{
          borderColor: `${platformConfig.color}40`,
          background: `radial-gradient(circle at top left, ${platformConfig.color}18, #0c0c1e 45%)`,
        }}
      >
        <div className="p-6">
          <div className="flex items-center gap-2">
            <span className="text-xl">{platformConfig.emoji}</span>
            <span className="text-xs font-bold uppercase tracking-[0.24em]" style={{ color: platformConfig.color }}>
              {platformConfig.label}
            </span>
          </div>
          <h3 className="mt-3 text-3xl font-black text-white">{preview.name}</h3>
          <div className="mt-4 flex flex-wrap gap-2">
            {[preview.sport, preview.format, `${preview.teamCount} teams`, `${preview.season} season`].map((item) => (
              <span key={item} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/60">
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-white/8 bg-[#0c0c1e] p-5">
        <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-white/35">
          Managers ({preview.managers.length}) copied exactly
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {preview.managers.map((manager, index) => (
            <div key={`${manager.name}-${index}`} className="flex items-center gap-3 rounded-2xl bg-white/[0.04] px-3 py-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500/20 to-violet-500/20 text-xs font-black text-white/70">
                {manager.name.charAt(0).toUpperCase()}
              </div>
              <div className="truncate text-sm font-semibold text-white/85">{manager.name}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-white/8 bg-[#0c0c1e] p-5">
        <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-white/35">Transfer Snapshot</div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-white/[0.04] p-4">
            <div className="text-[11px] uppercase tracking-[0.2em] text-white/30">Roster Positions</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {preview.rosterPositions.map((position) => (
                <span key={position} className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/65">
                  {position}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-2xl bg-white/[0.04] p-4">
            <div className="text-[11px] uppercase tracking-[0.2em] text-white/30">Included</div>
            <div className="mt-3 space-y-2 text-sm text-white/65">
              <div>League name copied exactly</div>
              <div>Manager names copied exactly</div>
              <div>{preview.hasDraft ? 'Draft history available' : 'Draft history unavailable'}</div>
              <div>{preview.playoffTeams ? `${preview.playoffTeams} playoff teams` : 'Playoff field unknown'}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 rounded-2xl border border-white/15 py-3.5 text-sm font-bold text-white/60 hover:border-white/25 hover:text-white"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className="flex-[2] rounded-2xl py-3.5 text-sm font-black text-white transition-all disabled:opacity-35"
          style={{
            background: 'linear-gradient(135deg, #059669, #0891b2)',
            boxShadow: '0 8px 24px rgba(5,150,105,0.3)',
          }}
        >
          {alreadyTransferred ? 'Open Existing Transfer →' : 'Confirm & Transfer →'}
        </button>
      </div>
    </div>
  )
}

function ProgressStep({ events }: { events: ProgressEvent[] }) {
  const latest = events[events.length - 1]
  const currentKey = latest?.step ?? 'validating'
  const progress = latest?.progress ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-white">Transferring League</h2>
        <p className="mt-1 text-sm text-white/45">Server-side import is in progress.</p>
      </div>

      <div className="rounded-3xl border border-white/8 bg-[#0c0c1e] p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-bold text-white">{latest?.message ?? 'Starting transfer...'}</div>
          <div className="text-sm font-black text-cyan-300">{progress}%</div>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #0891b2, #7c3aed)',
            }}
          />
        </div>
      </div>

      <div className="space-y-2 rounded-3xl border border-white/8 bg-[#0c0c1e] p-5">
        {STREAM_STEPS.map((step) => {
          const currentIndex = STREAM_STEPS.findIndex((item) => item.key === currentKey)
          const rowIndex = STREAM_STEPS.findIndex((item) => item.key === step.key)
          const done = currentIndex > rowIndex
          const active = currentKey === step.key
          return (
            <div
              key={step.key}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${
                active ? 'border border-cyan-500/20 bg-cyan-500/10' : 'bg-white/[0.03]'
              }`}
            >
              <div
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black ${
                  done ? 'bg-green-500 text-black' : active ? 'border border-cyan-400 text-cyan-300' : 'bg-white/10 text-white/30'
                }`}
              >
                {done ? '✓' : active ? '•' : ''}
              </div>
              <div className={`text-sm ${done ? 'text-green-300' : active ? 'text-white' : 'text-white/35'}`}>{step.label}</div>
              {active ? <div className="ml-auto h-3 w-3 rounded-full border border-cyan-400 border-t-transparent animate-spin" /> : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SuccessStep({
  leagueName,
  leagueId,
  onReset,
}: {
  leagueName: string
  leagueId: string
  onReset: () => void
}) {
  return (
    <div className="space-y-6 text-center">
      <div className="text-7xl">🎉</div>
      <div>
        <h2 className="text-3xl font-black text-white">Transfer Complete</h2>
        <p className="mt-2 text-base text-white/55">
          <span className="font-bold text-white">{leagueName}</span> is now available on AllFantasy.
        </p>
      </div>

      <div className="rounded-3xl border border-green-500/25 bg-green-500/10 p-5 text-left">
        <div className="text-xs font-bold uppercase tracking-[0.24em] text-green-300">Copied</div>
        <div className="mt-3 space-y-2 text-sm text-white/75">
          <div>League name</div>
          <div>Manager names</div>
          <div>Settings and roster positions</div>
          <div>Draft history, playoff bracket, and trade history when available</div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href={`/app/league/${leagueId}`}
          className="flex-1 rounded-2xl py-3.5 text-sm font-black text-white"
          style={{
            background: 'linear-gradient(135deg, #059669, #0891b2)',
            boxShadow: '0 8px 24px rgba(5,150,105,0.3)',
          }}
        >
          View My League →
        </Link>
        <button
          type="button"
          onClick={onReset}
          className="flex-1 rounded-2xl border border-white/15 py-3.5 text-sm font-bold text-white/60 hover:border-white/25 hover:text-white"
        >
          Transfer Another League
        </button>
      </div>
    </div>
  )
}

export default function LeagueTransferPage() {
  const { status } = useSession()
  const [step, setStep] = useState<Step>(1)
  const [platform, setPlatform] = useState<Platform | null>(null)
  const [leagueId, setLeagueId] = useState('')
  const [preview, setPreview] = useState<LeaguePreview | null>(null)
  const [alreadyTransferred, setAlreadyTransferred] = useState(false)
  const [existingLeagueId, setExistingLeagueId] = useState<string | null>(null)
  const [events, setEvents] = useState<ProgressEvent[]>([])
  const [finalLeagueId, setFinalLeagueId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [options, setOptions] = useState<TransferOptions>({
    copyDraftHistory: true,
    copyPlayoffHistory: true,
    copyTradeHistory: true,
    copyWaiverHistory: false,
    copyRosters: true,
    copySettings: true,
  })

  const selectedPlatform = useMemo(() => platform ?? 'sleeper', [platform])

  const reset = useCallback(() => {
    setStep(1)
    setPlatform(null)
    setLeagueId('')
    setPreview(null)
    setAlreadyTransferred(false)
    setExistingLeagueId(null)
    setEvents([])
    setFinalLeagueId(null)
    setLoading(false)
    setError(null)
    setOptions({
      copyDraftHistory: true,
      copyPlayoffHistory: true,
      copyTradeHistory: true,
      copyWaiverHistory: false,
      copyRosters: true,
      copySettings: true,
    })
  }, [])

  const fetchPreview = useCallback(async () => {
    if (!platform || !leagueId.trim()) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/league/transfer?platform=${encodeURIComponent(platform)}&leagueId=${encodeURIComponent(leagueId.trim())}`)
      const payload = (await response.json().catch(() => ({}))) as PreviewResponse & { error?: string }

      if (!response.ok) {
        throw new Error(payload.error ?? payload.message ?? 'Failed to fetch preview.')
      }

      if (!payload.available || !payload.league) {
        throw new Error(payload.message ?? 'League not found.')
      }

      setPreview(payload.league)
      setAlreadyTransferred(Boolean(payload.alreadyTransferred && payload.existingLeagueId))
      setExistingLeagueId(payload.existingLeagueId ?? null)
      setStep(3)
    } catch (fetchError: unknown) {
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to fetch preview.')
    } finally {
      setLoading(false)
    }
  }, [leagueId, platform])

  const startTransfer = useCallback(async () => {
    if (!platform || !leagueId.trim()) return

    setLoading(true)
    setError(null)
    setEvents([])
    setFinalLeagueId(null)
    setStep(4)

    try {
      const response = await fetch('/api/league/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          leagueId: leagueId.trim(),
          options,
        }),
      })

      const contentType = response.headers.get('content-type') ?? ''
      if (!response.ok && !contentType.includes('text/event-stream')) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(payload.error ?? 'Transfer failed.')
      }

      if (!response.body) {
        throw new Error('Transfer stream unavailable.')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const chunks = buffer.split('\n\n')
        buffer = chunks.pop() ?? ''

        for (const chunk of chunks) {
          const line = chunk
            .split('\n')
            .find((entry) => entry.startsWith('data: '))

          if (!line) continue
          const payload = line.slice(6).trim()
          if (payload === '[DONE]') continue

          const event = JSON.parse(payload) as ProgressEvent
          setEvents((current) => [...current, event])

          if (event.step === 'error') {
            throw new Error(event.error ?? event.message ?? 'Transfer failed.')
          }

          if (event.step === 'complete' && event.leagueId) {
            setFinalLeagueId(event.leagueId)
            setStep(5)
          }
        }
      }
    } catch (transferError: unknown) {
      setError(transferError instanceof Error ? transferError.message : 'Transfer failed.')
      setStep(3)
    } finally {
      setLoading(false)
    }
  }, [leagueId, options, platform])

  if (status === 'loading') {
    return <div className="min-h-screen bg-[#07071a]" />
  }

  if (status === 'unauthenticated') {
    return <LoginRequiredState />
  }

  return (
    <div className="min-h-screen bg-[#07071a] text-white">
      <div className="sticky top-0 z-20 border-b border-white/6 bg-[#07071a]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-4 sm:px-6">
          <Link href="/tools-hub" className="text-sm text-white/40 hover:text-white">
            ← Tools Hub
          </Link>
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-300">Commissioner Tool</div>
            <h1 className="text-lg font-black">League Transfer</h1>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <StepIndicator current={step} />

        {error ? (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
            <span>⚠️</span>
            <p className="flex-1 text-sm text-red-200">{error}</p>
            <button type="button" onClick={() => setError(null)} className="text-red-300 hover:text-red-200">
              ✕
            </button>
          </div>
        ) : null}

        {step === 1 ? <PlatformStep onSelect={(nextPlatform) => { setPlatform(nextPlatform); setStep(2) }} /> : null}

        {step === 2 && platform ? (
          <LeagueIdStep
            platform={selectedPlatform}
            leagueId={leagueId}
            options={options}
            loading={loading}
            onBack={() => setStep(1)}
            onLeagueIdChange={setLeagueId}
            onOptionsChange={setOptions}
            onPreview={() => void fetchPreview()}
          />
        ) : null}

        {step === 3 && preview && platform ? (
          <PreviewStep
            platform={platform}
            preview={preview}
            alreadyTransferred={alreadyTransferred}
            existingLeagueId={existingLeagueId}
            loading={loading}
            onBack={() => setStep(2)}
            onConfirm={() => {
              if (alreadyTransferred && existingLeagueId) {
                setFinalLeagueId(existingLeagueId)
                setStep(5)
                return
              }
              void startTransfer()
            }}
          />
        ) : null}

        {step === 4 ? <ProgressStep events={events} /> : null}

        {step === 5 && finalLeagueId ? (
          <SuccessStep
            leagueName={preview?.name ?? 'Your League'}
            leagueId={finalLeagueId}
            onReset={reset}
          />
        ) : null}
      </div>
    </div>
  )
}
