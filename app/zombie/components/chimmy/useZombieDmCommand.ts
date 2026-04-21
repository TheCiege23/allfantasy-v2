'use client'

import { useCallback, useState } from 'react'

type CommandFeedback = {
  kind: 'success' | 'error'
  text: string
}

type ChimmyDmResponse = {
  ok?: boolean
  privateMessage?: string | null
  error?: string
}

export function useZombieDmCommand(leagueId: string) {
  const [isSending, setIsSending] = useState(false)
  const [feedback, setFeedback] = useState<CommandFeedback | null>(null)

  const sendCommand = useCallback(
    async (message: string) => {
      setIsSending(true)
      setFeedback(null)
      try {
        const res = await fetch('/api/zombie/chimmy/dm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ leagueId, message }),
        })

        const payload = (await res.json().catch(() => ({}))) as ChimmyDmResponse
        if (!res.ok || !payload.ok) {
          setFeedback({
            kind: 'error',
            text: payload.error || payload.privateMessage || 'Command failed. Try again.',
          })
          return false
        }

        setFeedback({
          kind: 'success',
          text: payload.privateMessage || 'Command sent to @Chimmy in DM.',
        })
        return true
      } catch {
        setFeedback({ kind: 'error', text: 'Network error while sending command.' })
        return false
      } finally {
        setIsSending(false)
      }
    },
    [leagueId],
  )

  return { isSending, feedback, sendCommand }
}