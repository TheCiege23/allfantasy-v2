'use client'

import Link from 'next/link'
import { useState } from 'react'

export function BombUseCard({ leagueId, hasBomb, isSurvivor }: { leagueId: string; hasBomb: boolean; isSurvivor: boolean }) {
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')

  if (!hasBomb || !isSurvivor) return null

  return (
    <div className="rounded-xl border-2 border-red-500/50 bg-red-950/40 p-4">
      <p className="text-[14px] font-black text-red-100">💣 You hold a BOMB</p>
      <p className="mt-1 text-[12px] text-red-200/80">Detonating can wipe the top Zombie&apos;s weekly winnings (rules apply).</p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 w-full min-h-[56px] rounded-xl bg-red-600/50 text-[13px] font-bold text-white hover:bg-red-600/65"
      >
        Arm Bomb
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-red-500/40 bg-[#1c0a0a] p-4">
            <p className="text-[12px] text-red-100">Type DETONATE to confirm you understand this is irreversible.</p>
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              className="mt-2 w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-[14px] text-white"
              placeholder="DETONATE"
            />
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => setOpen(false)} className="flex-1 rounded-lg bg-white/10 py-3 text-[13px]">
                Cancel
              </button>
              <Link
                href={`/league/${leagueId}?zombieChimmy=${encodeURIComponent('@Chimmy 💣 detonate bomb')}`}
                onClick={() => setOpen(false)}
                className={typed === 'DETONATE' ? 'flex flex-1 items-center justify-center rounded-lg bg-red-600 py-3 text-center text-[13px] font-bold text-white' : 'pointer-events-none flex flex-1 items-center justify-center rounded-lg bg-red-900/40 py-3 text-center text-[13px] text-red-300/50'}
              >
                Confirm
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
