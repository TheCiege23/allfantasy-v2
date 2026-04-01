import PlayerHeadshot from '@/components/league/PlayerHeadshot'
import type { LeaguePlayoffBracketData } from '@/components/league/types'

function BracketCard({
  seed,
  name,
  avatarUrl,
  score,
  highlighted,
}: {
  seed: number | null
  name: string
  avatarUrl: string | null
  score: number | null
  highlighted: boolean
}) {
  return (
    <div className={`rounded-xl border border-[#1E2A42] px-3 py-3 ${highlighted ? 'bg-[#0F3D35]' : 'bg-[#131929]'}`}>
      <div className="flex items-center gap-2">
        <div className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[#1C2539] text-[11px] font-semibold text-[#8B9DB8]">
          {seed ?? '-'}
        </div>
        <PlayerHeadshot src={avatarUrl} alt={name} size={28} />
        <div className="min-w-0 flex-1 truncate text-[13px] font-semibold text-white">{name}</div>
        <div className="text-[12px] font-semibold text-white">{score != null ? score.toFixed(2) : '0.00'}</div>
      </div>
    </div>
  )
}

export default function PlayoffBracket({
  bracket,
}: {
  bracket: LeaguePlayoffBracketData
}) {
  if (!bracket.rounds.length) return null

  return (
    <section className="space-y-3">
      <div className="text-[24px] font-semibold text-white">Playoffs</div>
      <div className="overflow-x-auto">
        <div className="grid min-w-[860px] grid-cols-3 gap-4">
          {bracket.rounds.map((round) => (
            <div key={round.id}>
              <div className="mb-2">
                <div className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#8B9DB8]">
                  {round.title}
                </div>
                <div className="text-[13px] text-[#8B9DB8]">{round.subtitle}</div>
              </div>
              <div className="space-y-4">
                {round.matchups.map((matchup) => (
                  <div key={matchup.id} className="space-y-2">
                    {matchup.teamA ? (
                      <BracketCard
                        seed={matchup.teamA.seed}
                        name={matchup.teamA.name}
                        avatarUrl={matchup.teamA.avatarUrl}
                        score={matchup.teamA.score}
                        highlighted={matchup.teamA.isCurrentUser}
                      />
                    ) : (
                      <div className="h-[54px] rounded-xl border border-dashed border-[#1E2A42] bg-[#131929]" />
                    )}
                    {matchup.teamB ? (
                      <BracketCard
                        seed={matchup.teamB.seed}
                        name={matchup.teamB.name}
                        avatarUrl={matchup.teamB.avatarUrl}
                        score={matchup.teamB.score}
                        highlighted={matchup.teamB.isCurrentUser}
                      />
                    ) : (
                      <div className="h-[54px] rounded-xl border border-dashed border-[#1E2A42] bg-[#131929]" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
