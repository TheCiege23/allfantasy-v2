'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  CHIMMY_VOICES,
  CHIMMY_VOICE_ID_STORAGE_KEY,
  DEFAULT_VOICE_ID,
  isPresetChimmyTtsVoiceId,
} from '@/lib/tts/voices'

function readLocalVoiceId(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const saved = localStorage.getItem(CHIMMY_VOICE_ID_STORAGE_KEY)
    if (saved && CHIMMY_VOICES.some((v) => v.id === saved)) return saved
  } catch {}
  return null
}

/**
 * Hydrates Chimmy ElevenLabs voice.
 * Priority: localStorage (last local selection) → server profile (cross-device sync) → default.
 * Local selection always wins on the current device so the picker never snaps back.
 */
export function useChimmyTtsVoiceSync() {
  // Initialize synchronously from localStorage to avoid any flash back to the old voice
  const [voiceId, setVoiceIdState] = useState<string>(() => readLocalVoiceId() ?? DEFAULT_VOICE_ID)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/api/user/profile', {
          credentials: 'include',
          cache: 'no-store',
        })
        if (!res.ok) throw new Error('profile')
        const data = (await res.json()) as { chimmyTtsVoiceId?: string | null }
        if (cancelled) return

        const sid = data.chimmyTtsVoiceId
        if (typeof sid === 'string' && sid.trim() && isPresetChimmyTtsVoiceId(sid.trim())) {
          const profileId = sid.trim()
          // Only apply the profile voice if the user has no local selection.
          // If they already have a local selection (localStorage set), that device's
          // most recent choice wins — prevents stale server state from overwriting it.
          const localId = readLocalVoiceId()
          if (!localId) {
            setVoiceIdState(profileId)
            try {
              localStorage.setItem(CHIMMY_VOICE_ID_STORAGE_KEY, profileId)
            } catch {}
          }
        }
      } catch {
        /* keep localStorage / default */
      }
      if (!cancelled) setHydrated(true)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const setVoiceId = useCallback((id: string) => {
    if (!CHIMMY_VOICES.some((v) => v.id === id)) return
    setVoiceIdState(id)
    try {
      localStorage.setItem(CHIMMY_VOICE_ID_STORAGE_KEY, id)
    } catch {}
    void fetch('/api/user/profile', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chimmyTtsVoiceId: id }),
    }).catch(() => {})
  }, [])

  return { voiceId, setVoiceId, hydrated }
}
