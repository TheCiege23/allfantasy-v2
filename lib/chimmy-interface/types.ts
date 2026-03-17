/**
 * Chimmy interface types — shared across voice, prompt, and UI.
 */

export type ChimmyVoicePreset = 'calm' | 'analyst' | 'warm'

export interface ChimmyVoiceStyleConfig {
  rate: number
  pitch: number
  volume: number
  /** Optional pause (ms) after sentences for clarity. */
  pauseAfterSentenceMs?: number
  /** Preferred voice name hints (e.g. "Samantha", "Aria"). */
  preferredVoiceHints?: string[]
}

export interface ToolChimmyContext {
  toolId: string
  suggestedPrompt: string
  /** Optional short context string to send with the first message. */
  contextHint?: string
}

export interface ChimmySuggestedChip {
  id: string
  label: string
  prompt: string
  /** Optional category for grouping (e.g. 'trade', 'waiver'). */
  category?: string
}

export interface ChimmyConfidenceDisplay {
  /** 0–100 or undefined if not applicable. */
  confidencePct?: number
  /** Short label: "High", "Medium", "Low", or custom. */
  label?: string
  /** Optional explanation for the user. */
  explanation?: string
}
