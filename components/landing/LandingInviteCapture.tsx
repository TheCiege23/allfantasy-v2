'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

/**
 * Records `/?invite=` tokens for signup attribution (cookie) and strips the param from the URL.
 */
export function LandingInviteCapture() {
  const searchParams = useSearchParams()
  const invite = searchParams.get('invite')?.trim() ?? ''

  useEffect(() => {
    if (!invite) return
    void fetch('/api/invite/landing-touch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: invite }),
    }).catch(() => {})
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    url.searchParams.delete('invite')
    const next = url.pathname + (url.search ? url.search : '') + url.hash
    window.history.replaceState({}, '', next)
  }, [invite])

  return null
}
