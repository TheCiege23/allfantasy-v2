export type ChimmyPromptSource = 'roster' | 'waivers' | 'trade' | 'matchup' | 'commissioner'

export type OpenChimmyWithPromptOptions = {
  leagueId: string
  source: ChimmyPromptSource
  prompt: string
  /** When true, matches dashboard shortcut behavior (send immediately). Default false = prefill only. */
  autoSend?: boolean
}

/**
 * Focuses the left Chimmy AI tab and injects a prompt. Uses the same events as the dashboard
 * (`af-dashboard-focus-left-chimmy`, `af-chimmy-shortcut`, `af-chimmy-prefill`).
 */
export function openChimmyWithPrompt(opts: OpenChimmyWithPromptOptions): void {
  if (typeof window === 'undefined') return
  const prompt = opts.prompt.trim()
  if (!prompt) return

  window.dispatchEvent(new CustomEvent('af-dashboard-focus-left-chimmy'))

  if (opts.autoSend) {
    window.dispatchEvent(new CustomEvent('af-chimmy-shortcut', { detail: { prompt } }))
  } else {
    window.dispatchEvent(new CustomEvent('af-chimmy-prefill', { detail: { prompt } }))
  }
}
