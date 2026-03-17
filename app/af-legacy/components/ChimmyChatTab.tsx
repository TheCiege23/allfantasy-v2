'use client'

import { ChimmyChatShell } from '@/components/chimmy'
import { toast } from 'sonner'

export default function ChimmyChatTab({
  promptParam,
  leagueName,
}: {
  promptParam: string | null
  leagueName: string | null
}) {
  const initialPrompt = (() => {
    if (!promptParam) return ''
    try {
      return decodeURIComponent(promptParam).slice(0, 500)
    } catch {
      return String(promptParam).slice(0, 500)
    }
  })()

  return (
    <ChimmyChatShell
      initialPrompt={initialPrompt}
      clearUrlPromptAfterUse={true}
      leagueName={leagueName}
      onSaveConversation={() => toast.info('Save conversation coming soon')}
      onOpenCompare={() => toast.info('Provider comparison available from AI Hub.')}
    />
  )
}
