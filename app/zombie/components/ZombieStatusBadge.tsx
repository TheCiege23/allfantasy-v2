'use client'

import clsx from 'clsx'
import { ZOMBIE_STATUS_ICON } from '@/lib/zombie/iconSystem'

const LABEL: Record<string, string> = {
  survivor: 'SURVIVOR',
  whisperer: 'WHISPERER',
  zombie: 'ZOMBIE',
  revived_survivor: 'REVIVED',
  revived: 'REVIVED',
  eliminated: 'ELIMINATED',
}

function normalize(raw: string): string {
  const s = raw.toLowerCase()
  if (s.includes('whisperer')) return 'whisperer'
  if (s.includes('zombie')) return 'zombie'
  if (s.includes('revived')) return 'revived_survivor'
  if (s.includes('eliminat') || s.includes('dead')) return 'eliminated'
  return 'survivor'
}

export function ZombieStatusBadge({
  status,
  compact = false,
  className,
}: {
  status: string
  compact?: boolean
  className?: string
}) {
  const key = normalize(status)
  const icon = ZOMBIE_STATUS_ICON[key] ?? ZOMBIE_STATUS_ICON.survivor
  const label = LABEL[key] ?? 'SURVIVOR'

  const styles: Record<string, string> = {
    survivor: 'border-[var(--zombie-green)]/50 bg-[var(--zombie-green)]/15 text-[var(--zombie-green)]',
    whisperer:
      'animate-pulse border-[var(--zombie-crimson)]/60 bg-[var(--zombie-crimson)]/15 text-[var(--zombie-crimson)]',
    zombie: 'border-[var(--zombie-purple)]/50 bg-[var(--zombie-purple)]/15 text-[var(--zombie-purple)]',
    revived_survivor: 'border-[var(--zombie-gold)]/50 bg-[var(--zombie-gold)]/15 text-[var(--zombie-gold)]',
    eliminated: 'border-[var(--zombie-gray)]/50 bg-white/[0.04] text-[var(--zombie-gray)]',
  }

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
        styles[key] ?? styles.survivor,
        className,
      )}
      aria-label={`Player status: ${label}`}
    >
      {!compact ? <span aria-hidden>{icon}</span> : null}
      {!compact ? label : icon}
    </span>
  )
}

/** Chat-sized dot with tooltip label via title. */
export function ZombieStatusDot({ status, titleName }: { status: string; titleName: string }) {
  const key = normalize(status)
  const colors: Record<string, string> = {
    survivor: 'bg-[var(--zombie-green)]',
    whisperer: 'bg-[var(--zombie-crimson)]',
    zombie: 'bg-[var(--zombie-purple)]',
    revived_survivor: 'bg-[var(--zombie-gold)]',
    eliminated: 'bg-[var(--zombie-gray)]',
  }
  const label = LABEL[key] ?? 'SURVIVOR'
  return (
    <span
      title={`${titleName}'s status: ${label}`}
      className={clsx('inline-block h-2 w-2 shrink-0 rounded-full ring-2 ring-white/10', colors[key] ?? colors.survivor)}
      aria-label={`${titleName}'s status: ${label}`}
    />
  )
}
