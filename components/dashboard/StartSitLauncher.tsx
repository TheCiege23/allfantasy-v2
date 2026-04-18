'use client'

import { useState } from 'react'
import StartSitPopup from '@/components/StartSitPopup'

type StartSitLauncherProps = {
  userId: string
  /** compact = icon-only on small screens */
  variant?: 'default' | 'compact'
}

export function StartSitLauncher({ userId, variant = 'default' }: StartSitLauncherProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-testid="dashboard-start-sit-open"
        className={
          variant === 'compact'
            ? 'inline-flex h-9 min-w-[2.25rem] items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] px-2 text-sm text-white/85 hover:bg-white/[0.07]'
            : 'inline-flex items-center justify-center gap-1.5 rounded-lg border border-cyan-500/25 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-100 hover:bg-cyan-500/15'
        }
      >
        <span aria-hidden>⚡</span>
        {variant === 'compact' ? <span className="sr-only">Start/Sit</span> : <span>Start/Sit</span>}
      </button>
      <StartSitPopup isOpen={open} onClose={() => setOpen(false)} userId={userId} />
    </>
  )
}
