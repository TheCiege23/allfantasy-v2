/**
 * VoicePlaybackController — server-backed TTS with stop support.
 * Use in ChimmyChat (or any Chimmy voice UI) for speak/stop behavior.
 */

import type { ChimmyTtsVoice, ChimmyVoicePreset } from './types'
import { getChimmyVoiceStyleProfile, selectChimmyVoice } from './ChimmyVoiceStyleProfile'

let activeAudio: HTMLAudioElement | null = null
let activeObjectUrl: string | null = null
let activeFetchController: AbortController | null = null
let activeUtterance: SpeechSynthesisUtterance | null = null
let activeSessionId = 0
let activeLoading = false

function canUseServerAudioPlayback() {
  return (
    typeof window !== 'undefined' &&
    typeof Audio !== 'undefined' &&
    typeof window.URL?.createObjectURL === 'function'
  )
}

function canUseBrowserSpeechFallback() {
  return (
    typeof window !== 'undefined' &&
    typeof window.speechSynthesis !== 'undefined' &&
    typeof window.SpeechSynthesisUtterance !== 'undefined'
  )
}

function sanitizeForSpeech(raw: string): string {
  return raw
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
    .replace(/[_*`>#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function cleanupAudioResources() {
  if (activeAudio) {
    activeAudio.pause()
    activeAudio.src = ''
    activeAudio = null
  }
  if (activeObjectUrl) {
    URL.revokeObjectURL(activeObjectUrl)
    activeObjectUrl = null
  }
  if (activeFetchController) {
    activeFetchController.abort()
    activeFetchController = null
  }
  activeLoading = false
}

function cleanupSpeechResources() {
  if (typeof window === 'undefined' || typeof window.speechSynthesis === 'undefined') return
  window.speechSynthesis.cancel()
  activeUtterance = null
}

function speakWithBrowserFallback(
  text: string,
  preset: ChimmyVoicePreset,
  sessionId: number,
  options?: SpeakChimmyOptions
) {
  if (!canUseBrowserSpeechFallback()) return false

  const sanitizedText = sanitizeForSpeech(text)
  if (!sanitizedText) {
    options?.onEnd?.()
    return true
  }

  const synth = window.speechSynthesis
  const config = getChimmyVoiceStyleProfile(preset)
  const utterance = new window.SpeechSynthesisUtterance(sanitizedText)
  utterance.rate = config.rate
  utterance.pitch = config.pitch
  utterance.volume = config.volume

  const chosenVoice = selectChimmyVoice(synth.getVoices(), config)
  if (chosenVoice) {
    utterance.voice = chosenVoice
  }

  utterance.onend = () => {
    if (activeSessionId !== sessionId) return
    activeUtterance = null
    activeLoading = false
    options?.onEnd?.()
  }

  utterance.onerror = () => {
    if (activeSessionId !== sessionId) return
    activeUtterance = null
    activeLoading = false
    options?.onError?.()
    options?.onEnd?.()
  }

  cleanupSpeechResources()
  activeUtterance = utterance
  activeLoading = false
  synth.speak(utterance)
  return true
}

/**
 * Stop any current Chimmy TTS playback.
 */
export function stopChimmyVoice(): void {
  activeSessionId += 1
  if (typeof window === 'undefined') return
  cleanupAudioResources()
  cleanupSpeechResources()
}

export interface SpeakChimmyOptions {
  voice?: ChimmyTtsVoice
  /** 0–1, applied to HTMLAudioElement when using server audio */
  volume?: number
  onStart?: () => void
  onEnd?: () => void
  onError?: () => void
  onUnavailable?: (message: string) => void
}

/**
 * Speak text with Chimmy's server-backed TTS route. Cancels any current playback first.
 * Returns a function to stop playback (e.g. for a "Stop" button).
 */
export function speakChimmy(
  text: string,
  preset: ChimmyVoicePreset = 'calm',
  options?: SpeakChimmyOptions
): () => void {
  if (typeof window === 'undefined' || !text?.trim()) {
    return stopChimmyVoice
  }

  const sessionId = activeSessionId + 1
  activeSessionId = sessionId
  cleanupAudioResources()
  cleanupSpeechResources()
  options?.onStart?.()
  activeLoading = true

  const hasServerAudioPlayback = canUseServerAudioPlayback()
  const hasBrowserSpeechFallback = canUseBrowserSpeechFallback()

  if (!hasServerAudioPlayback) {
    const didFallback = speakWithBrowserFallback(text, preset, sessionId, options)
    if (!didFallback) {
      activeLoading = false
      options?.onUnavailable?.('Voice playback is unavailable right now.')
      options?.onEnd?.()
    }
    return stopChimmyVoice
  }

  const controller = new AbortController()
  activeFetchController = controller

  void (async () => {
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, preset, voice: options?.voice }),
        signal: controller.signal,
      })

      if (activeSessionId !== sessionId) return

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        const message =
          typeof data?.error === 'string'
            ? data.error
            : 'Voice playback is unavailable right now.'
        const shouldBrowserFallback =
          hasBrowserSpeechFallback &&
          (response.headers.get('X-Chimmy-TTS-Fallback') === 'browser' || response.status >= 500)

        if (shouldBrowserFallback) {
          const didFallback = speakWithBrowserFallback(text, preset, sessionId, options)
          if (!didFallback) {
            options?.onUnavailable?.(message)
            options?.onEnd?.()
          }
        } else if (response.status === 503 || response.status === 501) {
          options?.onUnavailable?.(message)
          options?.onEnd?.()
        } else {
          options?.onError?.()
          options?.onEnd?.()
        }
        cleanupAudioResources()
        return
      }

      const buffer = await response.arrayBuffer()
      if (activeSessionId !== sessionId) return

      const blob = new Blob([buffer], {
        type: response.headers.get('content-type') || 'audio/mpeg',
      })
      const objectUrl = URL.createObjectURL(blob)
      const audio = new Audio(objectUrl)
      const vol =
        typeof options?.volume === "number" && Number.isFinite(options.volume)
          ? Math.min(1, Math.max(0, options.volume))
          : 0.85
      audio.volume = vol

      activeObjectUrl = objectUrl
      activeAudio = audio
      activeLoading = false

      audio.onended = () => {
        if (activeSessionId !== sessionId) return
        cleanupAudioResources()
        options?.onEnd?.()
      }
      audio.onerror = () => {
        if (activeSessionId !== sessionId) return
        cleanupAudioResources()
        const didFallback = hasBrowserSpeechFallback
          ? speakWithBrowserFallback(text, preset, sessionId, options)
          : false
        if (!didFallback) {
          options?.onError?.()
          options?.onEnd?.()
        }
      }

      await audio.play().catch(() => {
        cleanupAudioResources()
        const didFallback = hasBrowserSpeechFallback
          ? speakWithBrowserFallback(text, preset, sessionId, options)
          : false
        if (!didFallback) {
          options?.onError?.()
          options?.onEnd?.()
        }
      })
    } catch (error) {
      if (activeSessionId !== sessionId) return
      const aborted = error instanceof DOMException && error.name === 'AbortError'
      if (!aborted) {
        const didFallback = hasBrowserSpeechFallback
          ? speakWithBrowserFallback(text, preset, sessionId, options)
          : false
        if (!didFallback) {
          options?.onError?.()
          options?.onEnd?.()
        }
      }
      cleanupAudioResources()
    }
  })()

  return stopChimmyVoice
}

/**
 * Whether TTS is currently playing (best-effort).
 */
export function isChimmyVoicePlaying(): boolean {
  if (typeof window === 'undefined') return false
  return (
    activeLoading ||
    Boolean(activeAudio && !activeAudio.paused && !activeAudio.ended) ||
    Boolean(activeUtterance)
  )
}
