'use client'

import Link from 'next/link'
import { useState } from 'react'

export function SerumUseCard({
  leagueId,
  serumCount,
  allies,
}: {
  leagueId: string
  serumCount: number
  allies: { userId: string; name: string }[]
}) {
  const [step, setStep] = useState<'pick' | 'confirm'>('pick')
  const [mode, setMode] = useState<'self' | 'ally'>('self')
  const [allyId, setAllyId] = useState('')

  if (serumCount < 1) return null

  const text =
    mode === 'self'
      ? '@Chimmy use serum protect myself'
      : `@Chimmy use serum protect ally ${allyId}`.trim()

  return (
    <div className="rounded-xl border border-teal-500/30 bg-teal-950/30 p-4">
      <p className="text-[13px] font-bold text-teal-100">🧪 You hold {serumCount} serum(s)</p>
      {step === 'pick' ? (
        <div className="mt-3 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              setMode('self')
              setStep('confirm')
            }}
            className="min-h-[56px] rounded-xl bg-teal-600/35 text-[13px] font-semibold text-white hover:bg-teal-600/45"
          >
            Protect Myself This Week
          </button>
          <button
            type="button"
            onClick={() => setMode('ally')}
            className="min-h-[56px] rounded-xl bg-teal-600/20 text-[13px] font-semibold text-teal-100 hover:bg-teal-600/30"
          >
            Protect an Ally
          </button>
          {mode === 'ally' ? (
            <div className="space-y-2">
              <select
                value={allyId}
                onChange={(e) => setAllyId(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-[13px] text-white"
              >
                <option value="">Select Survivor</option>
                {allies.map((a) => (
                  <option key={a.userId} value={a.userId}>
                    {a.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!allyId}
                onClick={() => setStep('confirm')}
                className="w-full min-h-[48px] rounded-xl bg-teal-600/40 text-[13px] font-semibold disabled:opacity-40"
              >
                Continue
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          <p className="text-[12px] text-[var(--zombie-text-mid)]">Confirm in league chat:</p>
          <Link
            href={`/league/${leagueId}?zombieChimmy=${encodeURIComponent(text)}`}
            className="flex min-h-[56px] items-center justify-center rounded-xl bg-teal-600 text-[13px] font-bold text-white"
          >
            Open chat with message
          </Link>
          <button type="button" onClick={() => setStep('pick')} className="w-full text-[12px] text-white/50 underline">
            Back
          </button>
        </div>
      )}
    </div>
  )
}
