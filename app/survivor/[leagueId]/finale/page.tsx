'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useMemo, useState } from 'react'
import { useSurvivorUi } from '@/lib/survivor/SurvivorUiContext'
import { ScrollReveal, type ScrollRevealStep } from '@/app/survivor/components/ScrollReveal'

export default function SurvivorFinalePage() {
  const params = useParams()
  const leagueId = typeof params?.leagueId === 'string' ? params.leagueId : ''
  const ctx = useSurvivorUi()
  const finalists = useMemo(
    () => (ctx.season?.players ?? []).filter((p) => p.isFinalist),
    [ctx.season?.players],
  )
  const [showReveal, setShowReveal] = useState(false)

  const juryVotes: ScrollRevealStep[] = useMemo(() => {
    const f = finalists.map((x) => x.displayName)
    const a = f[0] ?? 'Finalist A'
    const b = f[1] ?? 'Finalist B'
    return [
      { type: 'vote', targetName: a, voterLabel: 'Juror 1' },
      { type: 'vote', targetName: b, voterLabel: 'Juror 2' },
      { type: 'vote', targetName: a, voterLabel: 'Juror 3' },
      { type: 'pause', hostLine: 'The winner of Survivor…' },
      { type: 'vote', targetName: a },
    ]
  }, [finalists])

  return (
    <div className="px-3 pb-28 pt-4 md:px-6 md:pb-10">
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-b from-amber-500/10 to-transparent" />

      <header className="relative text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-amber-200">Finale</p>
        <h1 className="mt-2 text-3xl font-black uppercase text-white">Sole Survivor</h1>
      </header>

      <div className="relative mt-8 space-y-4">
        {(finalists.length ? finalists : [{ userId: 'p', displayName: 'Finalist' }]).map((p) => (
          <article key={p.userId} className="survivor-panel rounded-2xl p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/15 text-2xl font-bold ring-4 ring-amber-400/40">
                {p.displayName.slice(0, 1)}
              </div>
              <div>
                <p className="text-lg font-bold text-white">{p.displayName}</p>
                <span className="mt-1 inline-block rounded border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-200">
                  Finalist
                </span>
                <ul className="mt-3 space-y-1 text-[12px] text-white/55">
                  <li>Weeks survived · —</li>
                  <li>Immunities won · —</li>
                  <li>Idols played · —</li>
                </ul>
              </div>
            </div>
            <p className="mt-4 border-t border-white/[0.06] pt-3 text-[12px] text-white/45">
              AI storyline arc appears here for AfSub leagues.
            </p>
          </article>
        ))}
      </div>

      <section className="relative mt-10 survivor-panel p-4">
        <h2 className="text-[12px] font-bold uppercase text-white/50">Opening statements</h2>
        <p className="mt-2 text-[13px] text-white/55">Finalist speeches render as cards once submitted.</p>
      </section>

      <section className="relative mt-6 survivor-panel p-4">
        <h2 className="text-[12px] font-bold uppercase text-white/50">Jury Q&A feed</h2>
        <p className="mt-2 text-[12px] text-white/45">Threaded questions and finalist responses group by finalist.</p>
      </section>

      <div className="relative mt-8 flex flex-col items-center gap-3">
        <button
          type="button"
          className="min-h-[52px] w-full max-w-sm rounded-xl bg-amber-500 font-bold text-black md:w-auto md:px-10"
          onClick={() => setShowReveal(true)}
        >
          Preview winner reveal
        </button>
        <Link href={`/survivor/${leagueId}/chat`} className="text-[12px] text-amber-200/90">
          Reunion chat (post-season)
        </Link>
      </div>

      {showReveal ? (
        <ScrollReveal
          steps={juryVotes}
          hostLines={juryVotes.map(() => 'The jury has spoken')}
          onComplete={() => setShowReveal(false)}
        />
      ) : null}
    </div>
  )
}
