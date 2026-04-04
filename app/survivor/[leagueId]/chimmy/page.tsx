'use client'

import { useParams } from 'next/navigation'
import { useMemo } from 'react'
import { useSurvivorUi } from '@/lib/survivor/SurvivorUiContext'
import { VoteSubmissionCard } from '@/app/survivor/components/chimmy/VoteSubmissionCard'
import { IdolPlayCard } from '@/app/survivor/components/chimmy/IdolPlayCard'
import { DeadlineReminderCard } from '@/app/survivor/components/chimmy/DeadlineReminderCard'
import { PowerInventoryCard } from '@/app/survivor/components/chimmy/PowerInventoryCard'
import { ExileTokenSummaryCard } from '@/app/survivor/components/chimmy/ExileTokenSummaryCard'
import { JuryVotingCard } from '@/app/survivor/components/chimmy/JuryVotingCard'
import { ChallengePickCard } from '@/app/survivor/components/chimmy/ChallengePickCard'

export default function SurvivorChimmyPage() {
  const params = useParams()
  const leagueId = typeof params?.leagueId === 'string' ? params.leagueId : ''
  const ctx = useSurvivorUi()
  const ch = ctx.season?.currentChallenge
  const council = ctx.season?.activeCouncil

  const voteTargets = useMemo(() => {
    const players = ctx.season?.players ?? []
    const tid = council?.attendingTribeId
    const pool = tid ? players.filter((p) => p.tribeId === tid && p.playerState === 'active') : players.filter((p) => p.playerState === 'active')
    return pool.map((p) => ({
      id: p.userId,
      name: p.displayName,
      immune: Boolean(p.hasImmunityThisWeek),
    }))
  }, [ctx.season?.players, council?.attendingTribeId])

  const finalists = useMemo(
    () => (ctx.season?.players ?? []).filter((p) => p.isFinalist).map((p) => ({ id: p.userId, name: p.displayName })),
    [ctx.season?.players],
  )

  const powers = (ctx.season?.userState?.idolIds ?? []).map((_, i) => ({
    name: `Power ${i + 1}`,
    phase: 'Pre-merge',
    window: 'Before votes read',
    eligible: true,
  }))

  return (
    <div className="px-3 pb-28 pt-4 md:px-6 md:pb-10">
      <header className="flex items-center gap-3 survivor-panel rounded-2xl p-4">
        <div className="torch-pulse flex h-11 w-11 items-center justify-center rounded-full bg-violet-600/40 text-xl">🔥</div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-violet-200">@Chimmy · Private</p>
          <p className="text-[13px] text-white/55">Only you see confirmations, ballots, and power plays.</p>
        </div>
      </header>

      <div className="mt-6 space-y-4">
        {council?.status === 'voting_open' && ctx.canVote ? (
          <VoteSubmissionCard targets={voteTargets} />
        ) : council?.status === 'voting_open' ? (
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 text-[13px] text-amber-100">
            🔒 Tribal is open — you are immune, eliminated, or not attending this council.
          </div>
        ) : null}

        {council?.status === 'voting_open' && ctx.hasActiveIdol ? (
          <IdolPlayCard
            powerName="Hidden immunity"
            description="Play before the host tallies votes. Everyone will see the play, not your future plans."
            onConfirm={() => {}}
          />
        ) : null}

        {ctx.playerState === 'exile' ? (
          <ExileTokenSummaryCard
            balance={ctx.tokenBalance ?? 0}
            needed={5}
            events={[{ label: 'Token earned · exile grind', delta: '+1' }]}
          />
        ) : null}

        {ctx.playerState === 'jury' && ctx.leaguePhase === 'finale' ? (
          <JuryVotingCard finalists={finalists.length ? finalists : [{ id: 'a', name: 'Finalist A' }]} />
        ) : null}

        {powers.length ? <PowerInventoryCard powers={powers} /> : null}

        {ch?.status === 'open' && ctx.canSubmitChallenge ? (
          <ChallengePickCard title={ch.title ?? 'Challenge'} instructions={ch.instructions ?? 'Lock a pick privately.'} onLock={() => {}}>
            <p className="text-[11px] text-white/40">Mirrors the Challenges screen — commissioner may still collect via chat.</p>
          </ChallengePickCard>
        ) : null}

        <DeadlineReminderCard label="Vote deadline approaching" href={`/survivor/${leagueId}/tribal`} />

        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-[12px] text-emerald-100">
          ✓ Example receipt: action confirmed at {new Date().toLocaleTimeString()}.
        </div>
        <div className="rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-[12px] text-red-100">
          ✗ Example rejection: pick is locked — no changes allowed.
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-[12px] text-amber-100">
          🔒 Forbidden info: &quot;I can&apos;t share that — information is currency out here.&quot;
        </div>
      </div>
    </div>
  )
}
