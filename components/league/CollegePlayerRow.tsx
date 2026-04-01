import PlayerHeadshot from '@/components/league/PlayerHeadshot'
import CollegePositionPill from '@/components/league/CollegePositionPill'
import type { LeagueRosterSlot } from '@/components/league/types'

function metaLine(slot: LeagueRosterSlot) {
  const parts = [
    slot.player.position,
    slot.player.school,
    slot.player.conference,
    slot.player.classYearLabel,
  ].filter(Boolean)
  return parts.join(' • ')
}

export default function CollegePlayerRow({
  slot,
}: {
  slot: LeagueRosterSlot
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl py-2.5">
      <CollegePositionPill label={slot.player.position || slot.pill} />
      <PlayerHeadshot src={slot.player.headshotUrl} alt={slot.player.name} size={40} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-semibold text-white">{slot.player.name}</div>
        <div className="truncate text-[12px] text-[#8B9DB8]">{metaLine(slot)}</div>
        {slot.player.badges?.length ? (
          <div className="mt-1 flex flex-wrap gap-1">
            {slot.player.badges.map((badge) => (
              <span
                key={`${slot.id}-${badge}`}
                className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-white/75"
              >
                {badge}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <div className="text-right">
        <div className="text-[13px] font-semibold text-white">
          {slot.player.score != null ? slot.player.score.toFixed(2) : slot.player.draftGrade ?? '--'}
        </div>
        <div className="text-[11px] text-[#8B9DB8]">
          {slot.player.nextGameLabel ?? (slot.player.draftYear ? `Draft ${slot.player.draftYear}` : 'College asset')}
        </div>
      </div>
    </div>
  )
}
