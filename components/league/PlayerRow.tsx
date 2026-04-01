import { MessageSquareMore } from 'lucide-react'
import PlayerHeadshot from '@/components/league/PlayerHeadshot'
import PositionPill from '@/components/league/PositionPill'
import type { LeagueRosterSlot, ResolvedLeaguePlayer } from '@/components/league/types'

function metaLine(player: ResolvedLeaguePlayer) {
  const pieces = [`${player.position}`]
  if (player.team) pieces.push(player.team)
  return pieces.join(' • ')
}

export default function PlayerRow({
  slot,
  compact = false,
  showChatIcon = false,
  rightLabel,
}: {
  slot: LeagueRosterSlot
  compact?: boolean
  showChatIcon?: boolean
  rightLabel?: string | null
}) {
  return (
    <div className={`flex items-center gap-3 rounded-xl ${compact ? 'py-2' : 'py-2.5'}`}>
      <PositionPill label={slot.pill} />
      <PlayerHeadshot src={slot.player.headshotUrl} alt={slot.player.name} size={compact ? 36 : 40} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-semibold text-white">{slot.player.name}</div>
        <div className="truncate text-[12px] text-[#8B9DB8]">{metaLine(slot.player)}</div>
        {(slot.player.rosterPercent != null || slot.player.startPercent != null) && (
          <div className="truncate text-[11px] text-[#8B9DB8]">
            {slot.player.rosterPercent != null ? `${slot.player.rosterPercent}% Rostered` : 'Rostered'}
            {slot.player.startPercent != null ? ` | ${slot.player.startPercent}% Start` : ''}
          </div>
        )}
      </div>
      {showChatIcon ? (
        <MessageSquareMore className="h-4.5 w-4.5 shrink-0 text-[#8B9DB8]" />
      ) : (
        <div className="text-right">
          <div className="text-[13px] font-semibold text-white">{rightLabel ?? (slot.player.score != null ? slot.player.score.toFixed(2) : '0.00')}</div>
          {slot.player.trendValue != null && (
            <div className="text-[11px] font-semibold text-[#00D4AA]">
              {slot.player.trendValue > 0 ? '+' : ''}
              {slot.player.trendValue.toFixed(1)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
