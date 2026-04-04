'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import clsx from 'clsx'

type ZMeta = {
  league?: { name?: string | null; universeId?: string | null; currentWeek?: number }
}

function navActive(pathname: string | null, href: string, lid: string): boolean {
  if (!pathname) return false
  if (href === `/zombie/${lid}`) return pathname === href
  if (href.startsWith(`/zombie/${lid}`)) return pathname === href || pathname.startsWith(`${href}/`)
  return pathname === href || pathname.startsWith(`${href}/`)
}

export default function ZombieLeagueShell({
  leagueId,
  children,
}: {
  leagueId: string
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [meta, setMeta] = useState<ZMeta | null>(null)

  useEffect(() => {
    fetch(`/api/zombie/league?leagueId=${encodeURIComponent(leagueId)}`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: ZMeta | null) => setMeta(d))
      .catch(() => setMeta(null))
  }, [leagueId])

  const title = meta?.league?.name ?? 'Zombie League'
  const universeId = meta?.league?.universeId

  const nav = [
    { href: `/zombie/${leagueId}`, label: 'Home' },
    { href: `/zombie/${leagueId}/standings`, label: 'Standings' },
    { href: `/zombie/${leagueId}/matchups`, label: 'Matchups' },
    { href: `/league/${leagueId}`, label: 'Chat' },
    { href: `/zombie/${leagueId}/rules`, label: 'Rules' },
    ...(universeId ? [{ href: `/zombie/universe/${universeId}`, label: 'Universe' }] : []),
  ]

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="hidden w-[220px] shrink-0 border-r border-[var(--zombie-border)] bg-[var(--zombie-panel)] p-4 md:block">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--zombie-text-dim)]">Zombie</p>
        <h1 className="mt-1 text-[15px] font-bold leading-tight text-[var(--zombie-text-full)]">{title}</h1>
        <nav className="mt-6 flex flex-col gap-1">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={clsx(
                'rounded-lg px-3 py-2 text-[13px] transition-colors',
                navActive(pathname, n.href, leagueId)
                  ? 'bg-sky-500/15 text-sky-200'
                  : 'text-white/55 hover:bg-white/[0.06] hover:text-white/90',
              )}
              data-testid={`zombie-nav-${n.label.toLowerCase()}`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-[var(--zombie-border)] bg-[#07080c]/95 px-4 py-3 md:hidden">
          <span className="text-[14px] font-semibold text-white">{title}</span>
        </header>
        <nav className="flex gap-1 overflow-x-auto border-b border-[var(--zombie-border)] bg-[var(--zombie-panel)] px-2 py-2 md:hidden">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={clsx(
                'shrink-0 rounded-lg px-3 py-1.5 text-[11px]',
                navActive(pathname, n.href, leagueId) ? 'bg-sky-500/20 text-sky-100' : 'text-white/70',
              )}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <main className="min-h-0 flex-1 overflow-y-auto p-4">{children}</main>
      </div>
    </div>
  )
}
