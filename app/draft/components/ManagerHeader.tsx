'use client'

import { cn } from '@/lib/utils'
import type { DraftPickOrderEntry } from '../types'
import { managerColorForIndex } from './manager-colors'

type Props = {
  slots: DraftPickOrderEntry[]
}

export function ManagerHeader({ slots }: Props) {
  return (
    <div className="flex min-w-max gap-1">
      {slots.map((s, i) => {
        const m = managerColorForIndex(i)
        return (
          <div
            key={s.id}
            className={cn(
              'flex w-[100px] shrink-0 flex-col items-center justify-center rounded-t border px-1 py-2 text-center',
              m.border,
              m.bg,
            )}
          >
            <span className={cn('truncate text-[10px] font-semibold', m.text)}>{s.label}</span>
            {s.isCpu ? <span className="text-[8px] text-white/40">CPU</span> : null}
          </div>
        )
      })}
    </div>
  )
}
