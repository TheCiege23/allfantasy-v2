'use client'

import clsx from 'clsx'
import Link from 'next/link'
import { type LucideIcon } from 'lucide-react'
import { type ZombieItemKind, zombieItemKindClasses } from '@/lib/zombie/zombie-visual-system'

const kindPreset = (kind: ZombieItemKind | 'neutral' | 'chat' | 'universe' | 'pay') => {
  switch (kind) {
    case 'serum':
      return zombieItemKindClasses('serum')
    case 'weapon':
      return zombieItemKindClasses('weapon')
    case 'bomb':
      return zombieItemKindClasses('bomb')
    case 'ambush':
      return zombieItemKindClasses('ambush')
    case 'chat':
      return { bg: 'bg-cyan-500/12 border-cyan-400/28', text: 'text-cyan-50', ring: 'ring-cyan-400/30' }
    case 'universe':
      return { bg: 'bg-amber-500/12 border-amber-400/28', text: 'text-amber-50', ring: 'ring-amber-400/25' }
    case 'pay':
      return { bg: 'bg-emerald-600/12 border-emerald-400/25', text: 'text-emerald-50', ring: 'ring-emerald-400/25' }
    default:
      return { bg: 'bg-white/[0.05] border-white/12', text: 'text-white/88', ring: 'ring-white/15' }
  }
}

export function ZombieQuickAction({
  href,
  label,
  icon: Icon,
  kind = 'neutral',
  onClick,
  className,
  'data-testid': dataTestId,
}: {
  href?: string
  label: string
  icon: LucideIcon
  kind?: ZombieItemKind | 'neutral' | 'chat' | 'universe' | 'pay'
  onClick?: () => void
  className?: string
  'data-testid'?: string
}) {
  const c = kindPreset(kind)
  const inner = (
    <>
      <Icon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
      <span className="min-w-0 flex-1 text-left font-semibold">{label}</span>
    </>
  )
  const base = clsx(
    'group inline-flex min-h-[48px] w-full items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm transition',
    'hover:brightness-110 active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500/40',
    'ring-1 ring-inset',
    c.bg,
    c.text,
    c.ring,
    className,
  )

  if (href) {
    return (
      <Link href={href} data-testid={dataTestId} className={base}>
        {inner}
      </Link>
    )
  }
  return (
    <button type="button" data-testid={dataTestId} onClick={onClick} className={base}>
      {inner}
    </button>
  )
}
