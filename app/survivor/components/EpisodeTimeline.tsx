'use client'

import { Swords, Skull, Shield, Shuffle, Crown, Users } from 'lucide-react'

interface EpisodeSummary {
  week: number
  title?: string
  summary?: string
  challengeTitle?: string
  winningTribeOrPlayer?: string
  losingTribeOrPlayer?: string
  votedOutPlayer?: string
  idolsPlayed?: string[]
  twistDescription?: string
  aiRecap?: string
}

interface EpisodeTimelineProps {
  episodes: EpisodeSummary[]
  currentWeek: number
  mergeWeek?: number
}

function getEpisodeIcon(ep: EpisodeSummary, mergeWeek?: number) {
  if (ep.week === mergeWeek) return Crown
  if (ep.twistDescription) return Shuffle
  if (ep.votedOutPlayer) return Skull
  if (ep.idolsPlayed?.length) return Shield
  return Swords
}

export function EpisodeTimeline({ episodes, currentWeek, mergeWeek }: EpisodeTimelineProps) {
  if (!episodes.length) {
    return <div className="text-sm text-white/40 text-center py-8">No episodes yet. The game is just beginning.</div>
  }

  return (
    <div className="space-y-3">
      {episodes.map((ep) => {
        const Icon = getEpisodeIcon(ep, mergeWeek)
        const isCurrent = ep.week === currentWeek
        const isMerge = ep.week === mergeWeek

        return (
          <div
            key={ep.week}
            className={`rounded-2xl border p-4 transition-all ${
              isCurrent
                ? 'border-cyan-400/30 bg-cyan-400/5'
                : isMerge
                  ? 'border-amber-400/30 bg-amber-400/5'
                  : 'border-white/10 bg-white/[0.03]'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`rounded-full p-2 ${
                isMerge ? 'bg-amber-400/10' : isCurrent ? 'bg-cyan-400/10' : 'bg-white/5'
              }`}>
                <Icon className={`h-4 w-4 ${
                  isMerge ? 'text-amber-400' : isCurrent ? 'text-cyan-400' : 'text-white/40'
                }`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white/50">WEEK {ep.week}</span>
                  {isMerge && <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] text-amber-200">MERGE</span>}
                  {isCurrent && <span className="rounded-full bg-cyan-400/20 px-2 py-0.5 text-[10px] text-cyan-200">CURRENT</span>}
                </div>
                {ep.title && <div className="text-sm font-medium text-white mt-1">{ep.title}</div>}

                <div className="mt-2 space-y-1">
                  {ep.challengeTitle && (
                    <div className="text-xs text-white/60">
                      <Swords className="inline h-3 w-3 mr-1 text-cyan-400/60" />
                      Challenge: {ep.challengeTitle}
                      {ep.winningTribeOrPlayer && <span className="text-emerald-400/80"> — Won by {ep.winningTribeOrPlayer}</span>}
                    </div>
                  )}
                  {ep.losingTribeOrPlayer && (
                    <div className="text-xs text-red-400/60">
                      <Users className="inline h-3 w-3 mr-1" />
                      Tribal Council: {ep.losingTribeOrPlayer}
                    </div>
                  )}
                  {ep.votedOutPlayer && (
                    <div className="text-xs text-red-300/80">
                      <Skull className="inline h-3 w-3 mr-1" />
                      Voted Out: {ep.votedOutPlayer}
                    </div>
                  )}
                  {ep.idolsPlayed?.map((idol, i) => (
                    <div key={i} className="text-xs text-amber-300/70">
                      <Shield className="inline h-3 w-3 mr-1" />
                      Idol Played: {idol}
                    </div>
                  ))}
                  {ep.twistDescription && (
                    <div className="text-xs text-purple-300/70">
                      <Shuffle className="inline h-3 w-3 mr-1" />
                      Twist: {ep.twistDescription}
                    </div>
                  )}
                </div>

                {ep.aiRecap && (
                  <div className="mt-3 rounded-lg bg-white/[0.02] border border-white/5 px-3 py-2 text-xs text-white/50 italic">
                    {ep.aiRecap}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
