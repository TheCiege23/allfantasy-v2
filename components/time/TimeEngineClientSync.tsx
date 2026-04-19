'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'

const SESSION_POST_THROTTLE_MS = 10 * 60_000
const STORAGE_KEY = 'af-time-engine-device-sync-at'

/**
 * Captures browser IANA timezone + local clock (ISO), POSTs to server on a throttle.
 * Server compares to UTC for skew; official logic always uses server time + account timezone.
 * Shows a single non-intrusive notice when the API reports a mismatch.
 */
export function TimeEngineClientSync() {
  const { status } = useSession()
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    if (status !== 'authenticated' || typeof window === 'undefined') return

    const run = async () => {
      try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
        const iso = new Date().toISOString()

        const lastRaw = sessionStorage.getItem(STORAGE_KEY)
        const last = lastRaw ? parseInt(lastRaw, 10) : 0
        const shouldPost = !last || Date.now() - last > SESSION_POST_THROTTLE_MS

        if (shouldPost && tz) {
          const post = await fetch('/api/user/time-context', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ deviceTimezone: tz, deviceLocalIso: iso }),
          })
          if (post.ok) {
            sessionStorage.setItem(STORAGE_KEY, String(Date.now()))
          }
        }

        const get = await fetch('/api/user/time-context', { credentials: 'same-origin', cache: 'no-store' })
        if (!get.ok) return
        const data = (await get.json()) as {
          context?: { warnings?: string[]; timeMismatchFlag?: boolean }
        }
        const w = data.context?.warnings
        if (Array.isArray(w) && w.length > 0) {
          setNotice(w.slice(0, 2).join(' '))
        } else {
          setNotice(null)
        }
      } catch {
        setNotice(null)
      }
    }

    void run()
  }, [status])

  if (!notice) return null

  return (
    <div
      role="status"
      className="pointer-events-none fixed bottom-16 left-1/2 z-[60] max-w-md -translate-x-1/2 rounded-lg border border-amber-500/25 bg-[#0a1228]/95 px-3 py-2 text-center text-[11px] leading-snug text-amber-100/95 shadow-lg backdrop-blur-sm md:bottom-6"
    >
      {notice}
    </div>
  )
}
