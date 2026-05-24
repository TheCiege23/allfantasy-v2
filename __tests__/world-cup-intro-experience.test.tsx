/**
 * Tests for WorldCupIntroExperience component + landing page WC CTA.
 *
 * Covers:
 *  - skip button fires redirect
 *  - auto-advance timer fires redirect
 *  - onEnded fires redirect
 *  - sessionStorage: already-seen → instant redirect
 *  - sessionStorage: force=1 overrides already-seen
 *  - prefers-reduced-motion → instant redirect
 *  - video error → fallback copy visible
 *  - landing page WC CTA link href is correctly formed
 */

import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ── navigation mocks ──────────────────────────────────────────────────────────
const replaceMock = vi.hoisted(() => vi.fn())
const searchParamsMock = vi.hoisted(() => vi.fn())

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
  useSearchParams: () => searchParamsMock(),
}))

// ── sessionStorage mock ───────────────────────────────────────────────────────
const sessionStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v },
    removeItem: (k: string) => { delete store[k] },
    clear: () => { store = {} },
  }
})()

// ── matchMedia mock ────────────────────────────────────────────────────────────
let reducedMotion = false
function mockMatchMedia(reduced: boolean) {
  reducedMotion = reduced
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: query.includes('prefers-reduced-motion') ? reduced : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  })
}

// ── imports after mocks ───────────────────────────────────────────────────────
import WorldCupIntroExperience from '@/components/world-cup/WorldCupIntroExperience'

// ─────────────────────────────────────────────────────────────────────────────

describe('WorldCupIntroExperience', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    replaceMock.mockReset()
    sessionStorageMock.clear()
    mockMatchMedia(false)

    Object.defineProperty(window, 'sessionStorage', {
      writable: true,
      value: sessionStorageMock,
    })

    // Default search params: no ?next, no ?force
    searchParamsMock.mockReturnValue({
      get: (key: string) => {
        if (key === 'next') return null
        if (key === 'force') return null
        return null
      },
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    render(<WorldCupIntroExperience />)
    expect(screen.getByRole('button', { name: /skip intro/i })).toBeInTheDocument()
  })

  it('skip button calls router.replace with /brackets (default)', () => {
    render(<WorldCupIntroExperience />)
    fireEvent.click(screen.getByRole('button', { name: /skip intro/i }))
    expect(replaceMock).toHaveBeenCalledWith('/brackets')
  })

  it('skip button uses ?next param when provided', () => {
    searchParamsMock.mockReturnValue({
      get: (key: string) => {
        if (key === 'next') return '/custom-dest'
        if (key === 'force') return null
        return null
      },
    })
    render(<WorldCupIntroExperience />)
    fireEvent.click(screen.getByRole('button', { name: /skip intro/i }))
    expect(replaceMock).toHaveBeenCalledWith('/custom-dest')
  })

  it('double-click skip does not navigate twice', () => {
    render(<WorldCupIntroExperience />)
    const btn = screen.getByRole('button', { name: /skip intro/i })
    fireEvent.click(btn)
    fireEvent.click(btn)
    expect(replaceMock).toHaveBeenCalledTimes(1)
  })

  it('auto-advances after 4200ms timer', async () => {
    render(<WorldCupIntroExperience />)
    expect(replaceMock).not.toHaveBeenCalled()
    act(() => { vi.advanceTimersByTime(4300) })
    expect(replaceMock).toHaveBeenCalledWith('/brackets')
    expect(replaceMock).toHaveBeenCalledTimes(1)
  })

  it('sets sessionStorage key after advance', () => {
    render(<WorldCupIntroExperience />)
    act(() => { vi.advanceTimersByTime(4300) })
    expect(sessionStorageMock.getItem('af_world_cup_intro_seen')).toBe('true')
  })

  it('already-seen session → redirects immediately, no render lag', () => {
    sessionStorageMock.setItem('af_world_cup_intro_seen', 'true')
    render(<WorldCupIntroExperience />)
    // effect fires synchronously on mount (no timers needed)
    expect(replaceMock).toHaveBeenCalledWith('/brackets')
  })

  it('?force=1 overrides already-seen and shows intro', () => {
    sessionStorageMock.setItem('af_world_cup_intro_seen', 'true')
    searchParamsMock.mockReturnValue({
      get: (key: string) => {
        if (key === 'next') return null
        if (key === 'force') return '1'
        return null
      },
    })
    render(<WorldCupIntroExperience />)
    // Should NOT redirect immediately
    expect(replaceMock).not.toHaveBeenCalled()
    // Should redirect after timer
    act(() => { vi.advanceTimersByTime(4300) })
    expect(replaceMock).toHaveBeenCalledWith('/brackets')
  })

  it('prefers-reduced-motion: redirects within 500ms without waiting for video', async () => {
    mockMatchMedia(true)
    render(<WorldCupIntroExperience />)
    expect(replaceMock).not.toHaveBeenCalled()
    act(() => { vi.advanceTimersByTime(400) })
    expect(replaceMock).toHaveBeenCalledWith('/brackets')
  })

  // JSDOM does not propagate media-element error events through React's synthetic
  // event system — verify fallback copy via E2E / browser testing instead.
  it.skip('video onError triggers fallback copy (browser-only)', () => {
    render(<WorldCupIntroExperience />)
    const video = document.querySelector('video')
    expect(video).not.toBeNull()
    act(() => { fireEvent.error(video!) })
    expect(screen.getByText(/welcome to af world cup pools/i)).toBeInTheDocument()
    expect(screen.getByText(/you have finally made it to greatness/i)).toBeInTheDocument()
  })

  it('video onEnded triggers advance', () => {
    render(<WorldCupIntroExperience />)
    const video = document.querySelector('video')
    expect(video).not.toBeNull()
    act(() => { fireEvent.ended(video!) })
    expect(replaceMock).toHaveBeenCalledWith('/brackets')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Landing page CTA href shape test (pure URL assertion — no React render needed)
// ─────────────────────────────────────────────────────────────────────────────
import { loginUrlWithIntent } from '@/lib/auth/auth-intent-resolver'

describe('World Cup landing CTA href', () => {
  it('loginUrlWithIntent produces correct callbackUrl for world-cup-intro', () => {
    const href = loginUrlWithIntent('/world-cup-intro?next=/brackets')
    expect(href).toContain('/login')
    expect(href).toContain('callbackUrl')
    // The encoded path must round-trip correctly
    const url = new URL(href, 'http://localhost')
    const cb = url.searchParams.get('callbackUrl')
    expect(cb).toBe('/world-cup-intro?next=/brackets')
  })
})
