'use client'

/**
 * Nocturne import/preview form — the no-signup "preview your leagues" entry point.
 *
 * Honesty model (per product decision): only **Sleeper** has a real public,
 * no-auth username→leagues lookup, so Sleeper does a REAL guest import via the
 * existing `/api/legacy/guest-import` pipeline (reusing `useLegacySleeperImport`)
 * and lands the visitor on the real guest board `/dashboard/universal`. The other
 * platforms have no anonymous league lookup, so they route to signup with an
 * honest "create a free account to finish connecting {platform}" — never fake data.
 *
 * Rendered in two spots on the landing page: `variant="mini"` (compact one-row
 * form under the hero) and `variant="full"` (platform chips + input in the
 * dedicated import section). Each instance is self-contained.
 */

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Lock } from 'lucide-react'
import { useLegacySleeperImport } from '@/hooks/useLegacySleeperImport'
import { signupUrlWithIntent } from '@/lib/auth/auth-intent-resolver'
import { trackLandingCtaClick } from '@/lib/landing-analytics'
import { NOCTURNE_COPY as C } from './copy'

type PlatformId = 'sleeper' | 'espn' | 'yahoo' | 'mfl' | 'fantrax'

type PlatformMeta = {
  id: PlatformId
  label: string
  initial: string
  color: string
  /** Word used in the trust line ("Public {label} {inputKind} only…"). */
  inputKind: 'username' | 'league ID'
  placeholder: string
  /** True only for platforms with a real no-auth lookup today (Sleeper). */
  real: boolean
}

const PLATFORMS: readonly PlatformMeta[] = [
  { id: 'sleeper', label: 'Sleeper', initial: 'S', color: '#1f2a4d', inputKind: 'username', placeholder: 'e.g. gridiron_gary', real: true },
  { id: 'espn', label: 'ESPN', initial: 'E', color: '#4a1414', inputKind: 'league ID', placeholder: 'e.g. 1948204', real: false },
  { id: 'yahoo', label: 'Yahoo', initial: 'Y', color: '#3a1d55', inputKind: 'league ID', placeholder: 'e.g. 428931', real: false },
  { id: 'mfl', label: 'MFL', initial: 'M', color: '#143a2e', inputKind: 'league ID', placeholder: 'e.g. 60184', real: false },
  { id: 'fantrax', label: 'Fantrax', initial: 'F', color: '#5a3a14', inputKind: 'league ID', placeholder: 'e.g. abc123xy', real: false },
] as const

// After signup, non-Sleeper visitors land on the dashboard to finish connecting.
const NON_SLEEPER_DEST = '/dashboard'
// Real Sleeper guest import lands here (existing guest board, reads af_guest_session).
const SLEEPER_PREVIEW_DEST = '/dashboard/universal'

export function NocturneImport({ variant }: { variant: 'mini' | 'full' }) {
  const router = useRouter()
  const renderedAtRef = useRef<number>(Date.now())
  const [platformId, setPlatformId] = useState<PlatformId>('sleeper')
  const [value, setValue] = useState('')
  const [honeypot, setHoneypot] = useState('')

  // Always defined: platformId is a valid PlatformId and PLATFORMS is non-empty.
  const platform = PLATFORMS.find((p) => p.id === platformId) ?? PLATFORMS[0]!

  const { phase, error, bootLoading, statusMessage, startImport, reset } = useLegacySleeperImport({
    importEndpoint: '/api/legacy/guest-import',
    extraBody: { website: honeypot, form_rendered_at: renderedAtRef.current },
  })

  const busy = phase === 'importing' || bootLoading
  const complete = phase === 'complete'

  // Real Sleeper import finished → hand off to the guest board.
  useEffect(() => {
    if (phase !== 'complete') return
    const t = setTimeout(() => router.push(SLEEPER_PREVIEW_DEST), 500)
    return () => clearTimeout(t)
  }, [phase, router])

  // Switching platform clears any Sleeper import in flight.
  function selectPlatform(id: PlatformId) {
    if (id === platformId) return
    setPlatformId(id)
    if (phase !== 'idle') reset()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const clean = value.trim()
    if (!clean || busy || complete) return

    if (platform.real) {
      trackLandingCtaClick({
        cta_label: C.importFlow.submitFull,
        cta_destination: SLEEPER_PREVIEW_DEST,
        cta_type: 'primary',
        source: `nocturne-import-${variant}-sleeper`,
      })
      void startImport(clean)
      return
    }

    // Non-Sleeper: no honest anonymous lookup — route to signup to finish connecting.
    const dest = signupUrlWithIntent(NON_SLEEPER_DEST)
    trackLandingCtaClick({
      cta_label: C.importFlow.submitFull,
      cta_destination: dest,
      cta_type: 'primary',
      source: `nocturne-import-${variant}-${platform.id}`,
    })
    router.push(dest)
  }

  const submitLabel = variant === 'mini' ? C.importFlow.submitMini : C.importFlow.submitFull
  const buttonText = complete ? 'Ready' : busy ? C.importFlow.importing : submitLabel

  // ── Mini variant: compact one-row form (platform <select> + input + button) ──
  if (variant === 'mini') {
    return (
      <form className="n-import-mini" onSubmit={handleSubmit} aria-label={C.importFlow.miniLabel}>
        <label className="n-visually-hidden" htmlFor="n-import-mini-platform">Platform</label>
        <select
          id="n-import-mini-platform"
          className="n-select"
          value={platformId}
          onChange={(e) => selectPlatform(e.target.value as PlatformId)}
          disabled={busy || complete}
        >
          {PLATFORMS.map((p) => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </select>
        <input
          className="n-input"
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder={platform.placeholder}
          aria-label={`${platform.label} ${platform.inputKind}`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={busy || complete}
          data-testid="nocturne-import-mini-input"
        />
        <Honeypot value={honeypot} onChange={setHoneypot} />
        <button
          type="submit"
          className="btn btn-primary"
          style={{ minHeight: 46, padding: '0 20px', fontSize: 14, flex: 'none' }}
          disabled={busy || complete || !value.trim()}
          data-testid="nocturne-import-mini-submit"
        >
          {buttonText}
        </button>
        <StatusLine phase={phase} error={error} statusMessage={statusMessage} platform={platform} compact />
      </form>
    )
  }

  // ── Full variant: platform chips + input + trust line ──
  return (
    <form onSubmit={handleSubmit} aria-label={C.importFlow.miniLabel}>
      <div className="n-plat-chips">
        {PLATFORMS.map((p) => {
          const selected = p.id === platformId
          return (
            <button
              key={p.id}
              type="button"
              className={`n-plat-chip${selected ? ' is-selected' : ''}`}
              aria-pressed={selected}
              onClick={() => selectPlatform(p.id)}
            >
              <span className="n-plat-sq" style={{ background: p.color }}>{p.initial}</span>
              {p.label}
            </button>
          )
        })}
      </div>
      <div className="n-import-row">
        <input
          className="n-input"
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder={platform.placeholder}
          aria-label={`${platform.label} ${platform.inputKind}`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={busy || complete}
          data-testid="nocturne-import-full-input"
          style={{ flex: 1, minWidth: 220, minHeight: 48, fontSize: 15 }}
        />
        <Honeypot value={honeypot} onChange={setHoneypot} />
        <button
          type="submit"
          className="btn btn-primary"
          style={{ minHeight: 48, padding: '0 24px', fontSize: 15, flex: 'none' }}
          disabled={busy || complete || !value.trim()}
          data-testid="nocturne-import-full-submit"
        >
          {buttonText} <ArrowRight size={16} style={{ marginLeft: 2 }} />
        </button>
      </div>
      <StatusLine phase={phase} error={error} statusMessage={statusMessage} platform={platform} />
    </form>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function Honeypot({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  // Real users never see or fill this — bot trap (mirrors GuestLegacyImportForm).
  return (
    <input
      type="text"
      tabIndex={-1}
      autoComplete="off"
      aria-hidden="true"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="n-visually-hidden"
      style={{ position: 'absolute', height: 0, width: 0, opacity: 0, pointerEvents: 'none' }}
    />
  )
}

function StatusLine({
  phase,
  error,
  statusMessage,
  platform,
  compact = false,
}: {
  phase: string
  error: string
  statusMessage: string | null
  platform: PlatformMeta
  compact?: boolean
}) {
  const base: React.CSSProperties = { fontSize: 12.5, margin: compact ? '4px 0 0' : '12px 0 0', display: 'flex', alignItems: 'center', gap: 6 }

  if (phase === 'importing') {
    return <p className="n-import-status" style={{ ...base, color: 'var(--color-neutral-400)' }}>{statusMessage || C.importFlow.importing}</p>
  }
  if (phase === 'complete') {
    return <p className="n-import-status" style={{ ...base, color: '#7ee081' }}>Taking you to your preview…</p>
  }
  if (phase === 'failed' && error) {
    return <p className="n-import-status" style={{ ...base, color: '#f4a3a3' }} role="alert">{error}</p>
  }
  // Idle: trust microcopy. Sleeper = real; others get the honest "finish after signup" note.
  const text = platform.real
    ? `Public ${platform.label} ${platform.inputKind} only — we never ask for a password.`
    : C.importFlow.nonSleeperNote.replace('{label}', platform.label)
  return (
    <p className="n-import-status" style={{ ...base, color: 'var(--color-neutral-600)' }}>
      <Lock size={13} style={{ flex: 'none' }} />
      {text}
    </p>
  )
}
