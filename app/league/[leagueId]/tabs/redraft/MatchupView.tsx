'use client'

export function MatchupView({
  matchup,
  userRosterName,
  sport,
}: {
  matchup: { homeScore: number; awayScore: number }
  userRosterName: string
  sport: string
}) {
  return (
    <div className="grid grid-cols-3 gap-3 rounded-2xl border border-white/[0.08] bg-[#0a1220] p-4">
      <div className="text-center">
        <p className="text-[11px] text-white/45">{userRosterName}</p>
        <p className="text-2xl font-bold text-white">{matchup.homeScore}</p>
      </div>
      <div className="flex flex-col items-center justify-center text-white/35">
        <span className="text-xs uppercase">vs</span>
        <span className="text-[10px]">{sport}</span>
      </div>
      <div className="text-center">
        <p className="text-[11px] text-white/45">Opponent</p>
        <p className="text-2xl font-bold text-white">{matchup.awayScore}</p>
      </div>
    </div>
  )
}
