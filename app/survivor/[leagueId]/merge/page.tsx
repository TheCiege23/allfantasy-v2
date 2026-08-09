'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useSurvivorUi } from '@/lib/survivor/SurvivorUiContext'

export default function SurvivorMergeSplashPage() {
  const params = useParams()
  const leagueId = typeof params?.leagueId === 'string' ? params.leagueId : ''
  const ctx = useSurvivorUi()
  const tribes = ctx.season?.tribes ?? []
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (step >= 8) return
    const delay = step === 0 ? 600 : step === 1 ? 900 : 750
    const id = setTimeout(() => setStep((s) => Math.min(8, s + 1)), delay)
    return () => clearTimeout(id)
  }, [step])

  return (
    <div className="merge-splash fixed inset-0 z-50 flex flex-col items-center justify-center bg-black text-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          background: `radial-gradient(circle at 50% 80%, rgba(255,200,120,0.2), transparent 50%)`,
        }}
      />

      {step >= 1 ? (
        <p
          className="relative text-center text-3xl font-black uppercase tracking-[0.35em] text-white/95 md:text-5xl"
          style={{ animation: 'survivor-merge-logo-in 0.8s ease-out both' }}
        >
          Drop your buffs.
        </p>
      ) : null}

      {step >= 3 ? (
        <div className="relative mt-10 flex flex-wrap justify-center gap-6 opacity-90">
          {tribes.map((tr) => (
            <div
              key={tr.id}
              className="flex h-16 w-16 items-center justify-center rounded-2xl text-xl font-black text-black/80"
              style={{
                backgroundColor: tr.colorHex ?? '#fbbf24',
                animation: 'survivor-merge-logo-in 0.6s ease-out both',
              }}
            >
              {(tr.name ?? 'T').slice(0, 1)}
            </div>
          ))}
        </div>
      ) : null}

      {step >= 5 ? (
        <p className="relative mt-12 text-center text-sm font-bold uppercase tracking-[0.4em] text-amber-200/90 md:text-lg">
          One tribe. One island.
        </p>
      ) : null}

      {step >= 6 ? (
        <p className="relative mt-4 text-center text-2xl font-bold text-amber-100 md:text-3xl">
          {tribes[0]?.name ?? 'Merged'} · merged
        </p>
      ) : null}

      {step >= 7 ? (
        <p className="relative mt-6 max-w-md px-6 text-center text-[14px] text-white/65">
          From this moment forward, this is an individual game.
        </p>
      ) : null}

      {step >= 8 ? (
        <div className="relative mt-10 flex flex-wrap justify-center gap-2 px-4">
          {(ctx.season?.players ?? []).map((p) => (
            <div key={p.userId} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xs font-bold">
              {p.displayName.slice(0, 1)}
            </div>
          ))}
        </div>
      ) : null}

      <Link
        href={`/survivor/${leagueId}`}
        className="relative mt-12 min-h-[48px] rounded-full border border-white/20 px-8 py-3 text-[13px] font-semibold text-sky-200"
      >
        Continue to Island Home
      </Link>
    </div>
  )
}
