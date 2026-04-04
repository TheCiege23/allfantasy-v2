'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useMemo } from 'react'
import { useSurvivorUi } from '@/lib/survivor/SurvivorUiContext'
import { JuryVotingCard } from '@/app/survivor/components/chimmy/JuryVotingCard'

export default function SurvivorJuryPage() {
  const params = useParams()
  const leagueId = typeof params?.leagueId === 'string' ? params.leagueId : ''
  const ctx = useSurvivorUi()
  const base = `/survivor/${leagueId}`

  const jurors = useMemo(
    () => (ctx.season?.players ?? []).filter((p) => p.isJuryMember || p.playerState === 'jury'),
    [ctx.season?.players],
  )
  const finalists = useMemo(
    () => (ctx.season?.players ?? []).filter((p) => p.isFinalist),
    [ctx.season?.players],
  )
  const finalistOptions = finalists.map((p) => ({ id: p.userId, name: p.displayName }))

  const isJury = ctx.playerState === 'jury'

  return (
    <div className="px-3 pb-28 pt-4 md:px-6 md:pb-10">
      <header className="survivor-panel rounded-2xl p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-amber-200">⚖️ Jury chamber</p>
        <h1 className="mt-2 text-2xl font-black uppercase tracking-wide text-white">Justice · Drama · Payoff</h1>
        <p className="mt-2 text-[13px] text-white/55">Your vote will determine the Sole Survivor.</p>
      </header>

      <section className="mt-8">
        <p className="text-[11px] font-bold uppercase text-white/40">Jury panel</p>
        <div className="mt-3 flex flex-wrap gap-3">
          {jurors.map((j) => (
            <div
              key={j.userId}
              className={`flex flex-col items-center rounded-xl border px-3 py-2 ${
                j.userId === ctx.season?.userState?.userId
                  ? 'border-amber-400/50 bg-amber-500/10'
                  : 'border-white/10 bg-black/20'
              }`}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-sm font-bold ring-2 ring-amber-500/40">
                {j.displayName.slice(0, 1)}
              </div>
              <p className="mt-1 text-[11px] text-white/80">{j.displayName}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <p className="text-[11px] font-bold uppercase text-white/40">Finalists</p>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {(finalists.length ? finalists : [{ userId: 'x', displayName: 'Finalist slot' }]).map((f) => (
            <div key={f.userId} className="survivor-panel rounded-xl p-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/15 text-lg font-bold ring-2 ring-amber-400/50">
                {f.displayName.slice(0, 1)}
              </div>
              <p className="mt-2 font-semibold text-white">{f.displayName}</p>
              <p className="text-[11px] text-white/45">Tribe history & stats surface from season logs.</p>
            </div>
          ))}
        </div>
      </section>

      {isJury && ctx.leaguePhase === 'finale' ? (
        <section className="mt-8">
          <JuryVotingCard finalists={finalistOptions.length ? finalistOptions : [{ id: 'a', name: 'A' }]} />
        </section>
      ) : null}

      <section className="mt-8 survivor-panel p-4">
        <p className="text-[11px] font-bold uppercase text-white/45">Jury Q&A</p>
        <textarea
          className="mt-2 min-h-[100px] w-full rounded-xl border border-white/10 bg-black/30 p-3 text-[13px] text-white"
          placeholder="Ask a finalist a question or make a statement…"
          disabled={!isJury}
        />
        <p className="mt-2 text-[11px] text-white/35">Submissions route to finale chat when enabled.</p>
      </section>

      <div className="mt-6 text-center">
        <Link href={`${base}/finale`} className="text-[13px] font-semibold text-amber-200">
          Finale stage →
        </Link>
      </div>
    </div>
  )
}
