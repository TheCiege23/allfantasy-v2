import { Suspense } from 'react'
import { LeftChatOpenQueryHarnessClient } from './LeftChatOpenQueryHarnessClient'

export default function LeftChatOpenQueryHarnessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0a0a0f] p-4 text-white/60" data-testid="left-chat-open-harness-loading">
          Loading harness…
        </div>
      }
    >
      <LeftChatOpenQueryHarnessClient />
    </Suspense>
  )
}
