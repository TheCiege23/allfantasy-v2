'use client'

import { useEffect, useRef, useState } from 'react'
import {
  DEFAULT_VOICE_CONFIG,
  getVoiceConfig,
  saveVoiceConfig,
  type VoiceConfig,
} from '@/lib/chimmy-voice'

export default function ChimmyVoiceSettingsCard() {
  const [voiceConfig, setVoiceConfig] = useState<VoiceConfig>(() => getVoiceConfig())
  const [previewPlaying, setPreviewPlaying] = useState(false)
  const previewAudioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    return () => {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause()
        previewAudioRef.current = null
      }
    }
  }, [])

  const applyVoiceConfig = (patch: Partial<VoiceConfig>) => {
    setVoiceConfig((current) => {
      const next = saveVoiceConfig({ ...current, ...patch })
      return next
    })
  }

  const handlePreview = async () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause()
      previewAudioRef.current.currentTime = 0
    }

    const audio = new Audio('/chimmy-voice-sample.mp3')
    audio.volume = voiceConfig.volume
    previewAudioRef.current = audio
    setPreviewPlaying(true)

    audio.onended = () => {
      previewAudioRef.current = null
      setPreviewPlaying(false)
    }
    audio.onerror = () => {
      previewAudioRef.current = null
      setPreviewPlaying(false)
    }

    try {
      await audio.play()
    } catch {
      setPreviewPlaying(false)
    }
  }

  return (
    <div className="rounded-xl border p-4 space-y-4" style={{ borderColor: 'var(--border)', background: 'var(--panel2)' }}>
      <div>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Chimmy Voice</h3>
        <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>
          Chimmy can speak responses aloud using Allison&apos;s voice: energetic, clear, and bubbly.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void handlePreview()}
          className="rounded-lg border px-3 py-2 text-xs font-medium"
          style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
        >
          {previewPlaying ? 'Playing preview…' : "Preview Allison's voice"}
        </button>
        <button
          type="button"
          onClick={() => {
            setVoiceConfig(DEFAULT_VOICE_CONFIG)
            saveVoiceConfig(DEFAULT_VOICE_CONFIG)
          }}
          className="rounded-lg border px-3 py-2 text-xs font-medium"
          style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
        >
          Reset voice settings
        </button>
      </div>

      <label className="flex items-center justify-between gap-3 rounded-lg border px-3 py-3" style={{ borderColor: 'var(--border)' }}>
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>Enable voice playback</p>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            Keeps Allison play controls available in Chimmy chat.
          </p>
        </div>
        <input
          type="checkbox"
          checked={voiceConfig.enabled}
          onChange={(event) => applyVoiceConfig({ enabled: event.target.checked })}
          className="h-4 w-4 rounded"
          style={{ accentColor: 'var(--accent-cyan)' }}
        />
      </label>

      <label className="flex items-center justify-between gap-3 rounded-lg border px-3 py-3" style={{ borderColor: 'var(--border)' }}>
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>Auto-play new responses</p>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            Off by default. When enabled, new Chimmy replies start speaking automatically.
          </p>
        </div>
        <input
          type="checkbox"
          checked={voiceConfig.autoPlay}
          onChange={(event) => applyVoiceConfig({ autoPlay: event.target.checked })}
          className="h-4 w-4 rounded"
          style={{ accentColor: 'var(--accent-cyan)' }}
        />
      </label>

      <div>
        <label className="mb-2 block text-sm font-medium" style={{ color: 'var(--muted2)' }}>
          Volume: {Math.round(voiceConfig.volume * 100)}%
        </label>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(voiceConfig.volume * 100)}
          onChange={(event) => applyVoiceConfig({ volume: Number(event.target.value) / 100 })}
          className="w-full"
          style={{ accentColor: 'var(--accent-cyan)' }}
        />
      </div>
    </div>
  )
}
