'use client'

import { useState } from 'react'
import { Bot, MessageCircle, Users } from 'lucide-react'
import ChimmyChat from '@/app/components/ChimmyChat'

type AfSubTab = 'chimmy' | 'direct' | 'groups'

const AF_SUB_TABS: Array<{
  id: AfSubTab
  label: string
  title: string
  Icon: typeof MessageCircle
}> = [
  { id: 'direct', label: 'Direct', title: 'Direct messages', Icon: MessageCircle },
  { id: 'chimmy', label: 'Chimmy', title: 'Chimmy — full view in left panel', Icon: Bot },
  { id: 'groups', label: 'Groups', title: 'Group chats', Icon: Users },
]

type AFChatDMPanelProps = {
  userId: string
}

/**
 * Right column top (~55%): AF Chat DMs / Chimmy shortcut — not league chat.
 */
export function AFChatDMPanel({ userId }: AFChatDMPanelProps) {
  const [afTab, setAfTab] = useState<AfSubTab>('direct')

  const openFullChimmy = () => {
    if (typeof window === 'undefined') return
    window.dispatchEvent(new CustomEvent('af-dashboard-focus-left-chimmy'))
    window.dispatchEvent(new CustomEvent('af-dashboard-open-mobile-left'))
    const el = document.getElementById('dashboard-left-chat')
    if (el && el.offsetParent !== null) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col" data-af-chat-user-id={userId}>
      <p className="flex-shrink-0 px-3 pt-2.5 text-[10px] font-semibold uppercase tracking-widest text-white/30">AF Chat</p>

      <div className="flex flex-shrink-0 justify-center gap-0 border-b border-white/[0.07] px-0.5">
        {AF_SUB_TABS.map((tab) => {
          const isActive = afTab === tab.id
          const Icon = tab.Icon
          return (
            <button
              key={tab.id}
              type="button"
              title={tab.title}
              onClick={() => setAfTab(tab.id)}
              className={`flex flex-1 items-center justify-center py-2 transition-colors ${
                isActive ? 'border-b-2 border-cyan-500 bg-white/[0.04] text-cyan-300' : 'text-white/40 hover:text-white/70'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              <span className="sr-only">{tab.label}</span>
            </button>
          )
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {afTab === 'chimmy' ? (
          <div className="flex h-full min-h-0 flex-col gap-1 p-2">
            <button
              type="button"
              onClick={openFullChimmy}
              className="flex-shrink-0 self-end text-[10px] font-semibold text-cyan-400/90 transition hover:text-cyan-300"
            >
              Open full Chimmy →
            </button>
            <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-white/[0.06] bg-[#07071a]/80">
              <ChimmyChat embedded />
            </div>
          </div>
        ) : null}

        {afTab === 'direct' ? (
          <div className="flex h-full min-h-0 items-center justify-center px-4 text-center">
            <p className="text-[12px] text-white/35">No direct messages yet</p>
          </div>
        ) : null}

        {afTab === 'groups' ? (
          <div className="flex h-full min-h-0 items-center justify-center px-4 text-center">
            <p className="text-[12px] text-white/35">No group chats yet</p>
          </div>
        ) : null}
      </div>
    </div>
  )
}
