import ChatThreadList from '@/components/chat/ChatThreadList'
import ChatWindow from '@/components/chat/ChatWindow'
import PinnedMessagesPanel from '@/components/chat/PinnedMessagesPanel'
import PollComposer from '@/components/chat/PollComposer'
import MediaComposer from '@/components/chat/MediaComposer'
import AIChatTab from '@/components/chat/AIChatTab'
import BroadcastPanel from '@/components/chat/BroadcastPanel'
import type { LeagueTabProps } from '@/components/app/tabs/types'

export default function LeagueChatTab({ leagueId }: LeagueTabProps) {
  return (
    <section className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)_320px]">
      <ChatThreadList />
      <div className="space-y-3">
        <ChatWindow
          title="League Chat"
          seedMessages={[
            `Connected to league: ${leagueId}`,
            'Commissioner: Welcome to Week 1.',
            'Trade deadline is active.',
          ]}
        />
        <div className="flex flex-wrap gap-2">
          <PollComposer />
          <MediaComposer />
        </div>
      </div>
      <div className="space-y-3">
        <PinnedMessagesPanel />
        <AIChatTab />
        <BroadcastPanel />
      </div>
    </section>
  )
}
