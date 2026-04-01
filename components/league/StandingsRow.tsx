import PlayerHeadshot from '@/components/league/PlayerHeadshot'
import type { LeagueTeamRow } from '@/components/league/types'

export default function StandingsRow({
  row,
  showDraftPosition = false,
}: {
  row: LeagueTeamRow
  showDraftPosition?: boolean
}) {
  return (
    <div
      className={`grid grid-cols-[24px_1fr_auto] items-center gap-3 px-4 py-3 ${row.isCurrentUser ? 'bg-[#0F3D35]' : 'bg-transparent'} border-b border-white/5 last:border-b-0`}
    >
      <div className="text-[20px] font-semibold text-[#8B9DB8]">{row.rank}</div>
      <div className="flex min-w-0 items-center gap-3">
        <PlayerHeadshot src={row.avatarUrl} alt={row.name} size={40} />
        <div className="min-w-0">
          <div className="truncate text-[17px] font-semibold text-white">{row.name || 'Free'}</div>
          <div className="truncate text-[13px] text-[#8B9DB8]">
            {row.handle ? `@${row.handle}` : '@manager'} • {row.record.wins}-{row.record.losses}
            {row.record.ties ? `-${row.record.ties}` : ''}
          </div>
          {showDraftPosition ? (
            <div className="truncate text-[12px] text-[#8B9DB8]">
              ${row.faab ?? 0} FAAB{row.draftPosition ? ` • Draft position #${row.draftPosition}` : ''}
            </div>
          ) : null}
        </div>
      </div>
      <div className="text-right text-[13px] text-[#8B9DB8]">
        {showDraftPosition ? (
          <span className="text-white/70">→</span>
        ) : (
          <>
            <div>${row.faab ?? 0}{row.waiverPriority != null ? ` (${row.waiverPriority})` : ''}</div>
            <div>PF {row.pointsFor.toFixed(1)}</div>
            <div>PA {row.pointsAgainst.toFixed(1)}</div>
          </>
        )}
      </div>
    </div>
  )
}
