'use client'

import { MessageCircle, Users, Bot, Skull, Scale, Trophy, Globe } from 'lucide-react'

export type ChatChannelType = 'league' | 'tribe' | 'exile' | 'jury' | 'finale' | 'private_ai' | 'alliance'

interface ChatChannel {
  id: string
  name: string
  channelType: ChatChannelType
  unreadCount?: number
  isArchived?: boolean
}

interface ChatChannelSwitcherProps {
  channels: ChatChannel[]
  activeChannelId: string
  onSelect: (channelId: string) => void
  playerState: string
}

const CHANNEL_CONFIG: Record<ChatChannelType, {
  icon: typeof MessageCircle
  color: string
  bgActive: string
  borderActive: string
  label: string
}> = {
  league: {
    icon: Globe,
    color: 'text-cyan-400',
    bgActive: 'bg-cyan-400/10',
    borderActive: 'border-cyan-400/40',
    label: 'Island',
  },
  tribe: {
    icon: Users,
    color: 'text-emerald-400',
    bgActive: 'bg-emerald-400/10',
    borderActive: 'border-emerald-400/40',
    label: 'Tribe',
  },
  private_ai: {
    icon: Bot,
    color: 'text-violet-400',
    bgActive: 'bg-violet-400/10',
    borderActive: 'border-violet-400/40',
    label: '@Chimmy',
  },
  exile: {
    icon: Skull,
    color: 'text-orange-400',
    bgActive: 'bg-orange-400/10',
    borderActive: 'border-orange-400/40',
    label: 'Exile',
  },
  jury: {
    icon: Scale,
    color: 'text-purple-400',
    bgActive: 'bg-purple-400/10',
    borderActive: 'border-purple-400/40',
    label: 'Jury',
  },
  finale: {
    icon: Trophy,
    color: 'text-amber-400',
    bgActive: 'bg-amber-400/10',
    borderActive: 'border-amber-400/40',
    label: 'Finale',
  },
  alliance: {
    icon: MessageCircle,
    color: 'text-pink-400',
    bgActive: 'bg-pink-400/10',
    borderActive: 'border-pink-400/40',
    label: 'Alliance',
  },
}

export function ChatChannelSwitcher({ channels, activeChannelId, onSelect, playerState }: ChatChannelSwitcherProps) {
  // Filter channels based on player state
  const visibleChannels = channels.filter((ch) => {
    if (ch.isArchived) return false
    if (ch.channelType === 'exile' && playerState !== 'eliminated' && playerState !== 'exile') return false
    if (ch.channelType === 'jury' && playerState !== 'jury' && playerState !== 'finalist') return false
    if (ch.channelType === 'finale' && playerState !== 'finalist' && playerState !== 'jury') return false
    if (ch.channelType === 'tribe' && (playerState === 'eliminated' || playerState === 'exile')) return false
    return true
  })

  // Always show @Chimmy
  const hasChimmy = visibleChannels.some((ch) => ch.channelType === 'private_ai')
  if (!hasChimmy) {
    visibleChannels.push({ id: '__chimmy__', name: '@Chimmy', channelType: 'private_ai' })
  }

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 px-1 scrollbar-none">
      {visibleChannels.map((ch) => {
        const config = CHANNEL_CONFIG[ch.channelType] ?? CHANNEL_CONFIG.league
        const Icon = config.icon
        const isActive = ch.id === activeChannelId

        return (
          <button
            key={ch.id}
            onClick={() => onSelect(ch.id)}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              isActive
                ? `${config.bgActive} ${config.borderActive} ${config.color}`
                : 'border-white/10 bg-white/[0.02] text-white/50 hover:border-white/20'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{ch.name}</span>
            {(ch.unreadCount ?? 0) > 0 && (
              <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {ch.unreadCount! > 9 ? '9+' : ch.unreadCount}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
