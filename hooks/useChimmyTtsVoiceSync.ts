'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  CHIMMY_VOICES,
  CHIMMY_VOICE_ID_STORAGE_KEY,
  DEFAULT_VOICE_ID,
  isPresetChimmyTtsVoiceId,
} from '@/lib/tts/voices'

/**
 * Hydrates Chimmy ElevenLabs voice from the server profile (cross-device), then localStorage.
 * Persists selection via PATCH /api/user/profile + localStorage.
 */
export function useChimmyTtsVoiceSync() {
  const [voiceId, setVoiceIdState] = useState(DEFAULT_VOICE_ID)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/api/user/profile', { credentials: 'include' })
        if (!res.ok) throw new Error('profile')
        const data = (await res.json()) as { chimmyTtsVoiceId?: string | null }
        if (cancelled) return
        const sid = data.chimmyTtsVoiceId
        if (typeof sid === 'string' && sid.trim() && isPresetChimmyTtsVoiceId(sid.trim())) {
          const id = sid.trim()
          setVoiceIdState(id)
          try {
            localStorage.setItem(CHIMMY_VOICE_ID_STORAGE_KEY, id)
          } catch {
            /* ignore */
          }
          setHydrated(true)
          return
        }
      } catch {
        /* use local */
      }
      try {
        const saved = localStorage.getItem(CHIMMY_VOICE_ID_STORAGE_KEY)
        if (saved && CHIMMY_VOICES.some((v) => v.id === saved)) {
          setVoiceIdState(saved)
        }
      } catch {
        /* ignore */
      }
      setHydrated(true)
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
    } catch {
      /* ignore */
    }
    void fetch('/api/user/profile', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chimmyTtsVoiceId: id }),
    }).catch(() => {})
  }, [])

  return { voiceId, setVoiceId, hydrated }
}
