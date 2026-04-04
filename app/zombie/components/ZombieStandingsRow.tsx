'use client'

import clsx from 'clsx'
import { ZombieStatusBadge } from './ZombieStatusBadge'

export function ZombieStandingsRow({
  rank,
  name,
  status,
  wl,
  ppw,
  mobile,
}: {
  rank: number
  name: string
  status: string
  wl: string
  ppw: string
  mobile?: boolean
}) {
  const s = status.toLowerCase()
  const rowTint =
    s.includes('whisperer') ? 'bg-[var(--zombie-crimson)]/[0.06]' : s.includes('revived') ? 'bg-[var(--zombie-gold)]/[0.06]' : ''

  return (
    <tr
      className={clsx(
        'border-b border-white/[0.04] text-[12px] text-[var(--zombie-text-mid)]',
        rowTint,
        s.includes('zombie') && 'opacity-90 saturate-[0.65]',
        s.includes('eliminat') && 'opacity-50',
      )}
    >
      <td className="py-2 pr-2 font-mono text-[var(--zombie-text-dim)]">{rank}</td>
      <td className="py-2 pr-2">
        <ZombieStatusBadge status={status} compact />
      </td>
      <td className="py-2 pr-2 font-medium text-[var(--zombie-text-full)]">{name}</td>
      <td className="py-2 pr-2">{wl}</td>
      {!mobile ? <td className="py-2 pr-2">{ppw}</td> : null}
    </tr>
  )
}
