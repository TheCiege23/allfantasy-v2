'use client'

/**
 * WorldCupIntroGate
 *
 * Client-side gate that ensures the World Cup intro video plays before any
 * bracket page is shown, for every entry path (direct URL, dashboard button,
 * brackets hub card, etc.).
 *
 * States
 * ──────
 * checking  First client frame after hydration. A dark screen covers the page
 *           while sessionStorage is read (prevents flash of bracket content).
 * intro     First visit (or ?force=1). Renders WorldCupIntroExperience inline;
 *           when the experience calls onComplete the gate transitions to pass.
 * pass      Intro already seen this session. Children are rendered immediately.
 *
 * Force-replay
 * ────────────
 * Append ?force=1 to any /brackets/world-cup URL to clear the session key and
 * replay the intro (useful for testing/demo).
 */

import { useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'

// Dynamic import keeps the video + animation code out of the initial bundle.
// ssr:false avoids running intro logic during server render.
const WorldCupIntroExperience = dynamic(
  () => import('./WorldCupIntroExperience'),
  { ssr: false }
)

const SESSION_KEY = 'af_world_cup_intro_seen'

type GateStatus = 'checking' | 'intro' | 'pass'

export function WorldCupIntroGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<GateStatus>('checking')
  const resolvedRef = useRef(false)

  useEffect(() => {
    // Run only once per mount; the layout persists across same-segment navigations.
    if (resolvedRef.current) return
    resolvedRef.current = true

    const force = searchParams?.get('force') === '1'
    if (force) {
      // Clear the session key so the intro replays even for returning visitors.
      try { sessionStorage.removeItem(SESSION_KEY) } catch {}
    }

    let seen = false
    try { seen = sessionStorage.getItem(SESSION_KEY) === 'true' } catch {}
    setStatus(seen ? 'pass' : 'intro')
  }, [searchParams])

  // ── Render ─────────────────────────────────────────────────────────────────

  if (status === 'pass') {
    // Returning visitor — bracket content shows with no delay.
    return <>{children}</>
  }

  if (status === 'intro') {
    // First visit: show the intro inline. onComplete reveals bracket content
    // without any router navigation (the gate transitions in place).
    return (
      <WorldCupIntroExperience
        nextDest={pathname ?? '/brackets/world-cup'}
        onComplete={() => setStatus('pass')}
      />
    )
  }

  // 'checking': dark screen while sessionStorage is read (< 1 frame).
  // Matches the intro background so there is no colour flash either way.
  return (
    <div
      data-testid="wc-intro-gate-checking"
      aria-hidden
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#030712' }}
    />
  )
}
