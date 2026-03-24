'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getPrimaryChimmyEntry } from '@/lib/ai-product-layer'

const CHIMMY_HREF = getPrimaryChimmyEntry().href

const TABS = [
  { href: '/brackets', label: 'Home' },
  { href: '/brackets', label: 'My Pools' },
  { href: '/brackets/leagues/new', label: 'Create Pool' },
  { href: '/brackets/join', label: 'Join Pool' },
  { href: '/brackets', label: 'My Entries' },
  { href: '/brackets', label: 'Standings' },
  { href: '/messages', label: 'Pool Chat' },
  { href: CHIMMY_HREF, label: 'AI Coach' },
  { href: '/brackets', label: 'History' },
] as const

export default function BracketTopNav() {
  const pathname = usePathname()

  return (
    <div className="flex gap-2 overflow-x-auto rounded-xl border border-white/10 bg-white/[0.03] p-2">
      {TABS.map((tab, idx) => {
        const active = tab.href !== CHIMMY_HREF && pathname === tab.href
        return (
          <Link
            key={`${tab.label}-${idx}`}
            href={tab.href}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs transition ${
              active
                ? 'bg-white text-black'
                : 'border border-white/10 bg-black/20 text-white/75 hover:bg-white/10'
            }`}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
