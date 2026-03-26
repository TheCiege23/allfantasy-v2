/**
 * VoicePlaybackController — calm TTS with stop support and optional pacing.
 * Use in ChimmyChat (or any Chimmy voice UI) for speak/stop behavior.
 */

import { getChimmyVoiceStyleProfile, selectChimmyVoice } from './ChimmyVoiceStyleProfile'
import type { ChimmyVoicePreset } from './types'

let activeUtterance: SpeechSynthesisUtterance | null = null
let activeSessionId = 0
let pauseTimer: ReturnType<typeof setTimeout> | null = null

function clearPauseTimer() {
  if (pauseTimer) {
    clearTimeout(pauseTimer)
    pauseTimer = null
  }
}

function sanitizeForSpeech(raw: string): string {
  return raw
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
    .replace(/[_*`>#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function splitIntoSpeechSegments(text: string): string[] {
  const sanitized = sanitizeForSpeech(text)
  if (!sanitized) return []

  const roughSentences = sanitized
    .split(/(?<=[.!?])\s+/)
    .map((segment) => segment.trim())
    .filter(Boolean)

  const segments: string[] = []
  for (const sentence of roughSentences) {
    if (sentence.length <= 240) {
      segments.push(sentence)
      continue
    }

    const clauseParts = sentence
      .split(/,\s+/)
      .map((part) => part.trim())
      .filter(Boolean)
    let current = ''
    for (const clause of clauseParts) {
      const next = current ? `${current}, ${clause}` : clause
      if (next.length > 240 && current) {
        segments.push(current)
        current = clause
      } else {
        current = next
      }
    }
    if (current) segments.push(current)
  }

  return segments.length > 0 ? segments : [sanitized]
}

/**
 * Stop any current Chimmy TTS playback.
 */
export function stopChimmyVoice(): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  activeSessionId += 1
  clearPauseTimer()
  window.speechSynthesis.cancel()
  activeUtterance = null
}

export interface SpeakChimmyOptions {
  onStart?: () => void
  onEnd?: () => void
  onError?: () => void
}

/**
 * Speak text with Chimmy's calm voice profile. Cancels any current playback first.
 * Returns a function to stop playback (e.g. for a "Stop" button).
 */
export function speakChimmy(
  text: string,
  preset: ChimmyVoicePreset = 'calm',
  options?: SpeakChimmyOptions
): () => void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text?.trim()) {
    return stopChimmyVoice
  }

  const sessionId = activeSessionId + 1
  activeSessionId = sessionId
  clearPauseTimer()
  window.speechSynthesis.cancel()
  activeUtterance = null

  const config = getChimmyVoiceStyleProfile(preset)
  const segments = splitIntoSpeechSegments(text)
  if (segments.length === 0) {
    options?.onEnd?.()
    return stopChimmyVoice
  }
  const voices = window.speechSynthesis.getVoices()
  const chosen = selectChimmyVoice(voices, config)
  const pauseAfterSentenceMs = config.pauseAfterSentenceMs ?? 160
  let completed = false

  const finish = (triggerError?: boolean) => {
    if (completed) return
    completed = true
    if (activeSessionId === sessionId) {
      activeUtterance = null
      clearPauseTimer()
    }
    if (triggerError) options?.onError?.()
    options?.onEnd?.()
  }

  const speakSegment = (index: number) => {
    if (activeSessionId !== sessionId) return
    if (index >= segments.length) {
      finish()
      return
    }

    const utterance = new SpeechSynthesisUtterance(segments[index]!)
    utterance.rate = config.rate
    utterance.pitch = config.pitch
    utterance.volume = config.volume
    if (chosen) utterance.voice = chosen

    utterance.onend = () => {
      if (activeSessionId !== sessionId) return
      activeUtterance = null
      if (index >= segments.length - 1) {
        finish()
        return
      }
      pauseTimer = setTimeout(() => {
        speakSegment(index + 1)
      }, pauseAfterSentenceMs)
    }
    utterance.onerror = () => {
      if (activeSessionId !== sessionId) return
      finish(true)
    }

    activeUtterance = utterance
    window.speechSynthesis.speak(utterance)
  }

  options?.onStart?.()
  speakSegment(0)

  return stopChimmyVoice
}

/**
 * Whether TTS is currently playing (best-effort).
 */
export function isChimmyVoicePlaying(): boolean {
  if (typeof window === 'undefined' || !window.speechSynthesis) return false
  return window.speechSynthesis.speaking || window.speechSynthesis.pending
}
