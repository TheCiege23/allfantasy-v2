/**
 * VoicePlaybackController — calm TTS with stop support and optional pacing.
 * Use in ChimmyChat (or any Chimmy voice UI) for speak/stop behavior.
 */

import { getChimmyVoiceStyleProfile, selectChimmyVoice } from './ChimmyVoiceStyleProfile'
import type { ChimmyVoicePreset } from './types'

let activeUtterance: SpeechSynthesisUtterance | null = null

/**
 * Stop any current Chimmy TTS playback.
 */
export function stopChimmyVoice(): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  window.speechSynthesis.cancel()
  activeUtterance = null
}

export interface SpeakChimmyOptions {
  onEnd?: () => void
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

  window.speechSynthesis.cancel()
  activeUtterance = null

  const config = getChimmyVoiceStyleProfile(preset)
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.rate = config.rate
  utterance.pitch = config.pitch
  utterance.volume = config.volume

  const voices = window.speechSynthesis.getVoices()
  const chosen = selectChimmyVoice(voices, config)
  if (chosen) utterance.voice = chosen

  const onEnd = options?.onEnd

  activeUtterance = utterance
  window.speechSynthesis.speak(utterance)

  utterance.onend = () => {
    if (activeUtterance === utterance) activeUtterance = null
    onEnd?.()
  }
  utterance.onerror = () => {
    if (activeUtterance === utterance) activeUtterance = null
    onEnd?.()
  }

  return stopChimmyVoice
}

/**
 * Whether TTS is currently playing (best-effort).
 */
export function isChimmyVoicePlaying(): boolean {
  if (typeof window === 'undefined' || !window.speechSynthesis) return false
  return window.speechSynthesis.speaking
}
