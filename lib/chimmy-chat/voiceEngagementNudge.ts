import { toast } from 'sonner'

const SESSION_KEY = 'chimmy_voice_listen_nudge_v1'

/**
 * One gentle prompt per browser tab session when the user gets a substantive reply
 * but has voice toggled off — does not block or nag repeatedly.
 */
export function triggerChimmyVoiceListenNudge(params: {
  ttsAvailable: boolean
  voiceEnabled: boolean
  replyText: string
  /** True for premium gate, error, or upgrade CTA responses */
  skipForContent: boolean
}): void {
  const { ttsAvailable, voiceEnabled, replyText, skipForContent } = params
  if (!ttsAvailable || voiceEnabled || skipForContent) return
  const len = replyText.trim().length
  if (len < 160) return
  try {
    if (typeof sessionStorage === 'undefined') return
    if (sessionStorage.getItem(SESSION_KEY) === '1') return
    sessionStorage.setItem(SESSION_KEY, '1')
    toast.message('Want to hear that reply?', {
      description: 'Turn on voice in the toolbar or tap Play on the message.',
      duration: 7000,
    })
  } catch {
    /* ignore */
  }
}
