'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import clsx from 'clsx'

type ZMeta = {
  league?: { name?: string | null; universeId?: string | null; currentWeek?: number }
  myActiveItemCount?: number
  viewerIsCommissioner?: boolean
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
  const [moreOpen, setMoreOpen] = useState(false)

  useEffect(() => {
    fetch(`/api/zombie/league?leagueId=${encodeURIComponent(leagueId)}`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: ZMeta | null) => setMeta(d))
      .catch(() => setMeta(null))
  }, [leagueId])

  const title = meta?.league?.name ?? 'Zombie League'
  const universeId = meta?.league?.universeId
  const itemCount = meta?.myActiveItemCount ?? 0
  const showComm = meta?.viewerIsCommissioner === true

  const desktopNav: { href: string; label: string; emoji?: string }[] = [
    { href: `/zombie/${leagueId}`, label: 'Home', emoji: '🏚' },
    { href: `/zombie/${leagueId}/standings`, label: 'Standings', emoji: '📊' },
    { href: `/zombie/${leagueId}/matchups`, label: 'Matchups', emoji: '🎯' },
    { href: `/zombie/${leagueId}/chat`, label: 'Chat', emoji: '💬' },
    { href: `/zombie/${leagueId}/items`, label: 'Items', emoji: '🎒' },
    ...(universeId ? [{ href: `/zombie/universe/${universeId}`, label: 'Universe', emoji: '🌍' }] : []),
    { href: `/zombie/${leagueId}/rules`, label: 'Rules', emoji: '📜' },
    { href: `/zombie/${leagueId}/history`, label: 'History', emoji: '📖' },
    ...(showComm
      ? [{ href: `/league/${leagueId}`, label: 'Commissioner', emoji: '⚙️' }]
      : []),
  ]

  const bottomMain: { href: string; label: string }[] = [
    { href: `/zombie/${leagueId}`, label: 'Home' },
    { href: `/zombie/${leagueId}/standings`, label: 'Standings' },
    { href: `/zombie/${leagueId}/matchups`, label: 'Matchups' },
    { href: `/zombie/${leagueId}/chat`, label: 'Chat' },
  ]

  const drawerLinks: { href: string; label: string; emoji: string }[] = [
    { href: `/zombie/${leagueId}/items`, label: 'Items / Inventory', emoji: '🎒' },
    ...(universeId ? [{ href: `/zombie/universe/${universeId}`, label: 'Universe', emoji: '🌍' }] : []),
    { href: `/zombie/${leagueId}/rules`, label: 'Rules', emoji: '📜' },
    { href: `/zombie/${leagueId}/history`, label: 'History', emoji: '📖' },
    ...(showComm
      ? [{ href: `/league/${leagueId}`, label: 'Commissioner', emoji: '⚙️' }]
      : []),
  ]

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="hidden w-[220px] shrink-0 border-r border-[var(--zombie-border)] bg-[var(--zombie-panel)] p-4 md:block">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--zombie-text-dim)]">Zombie</p>
        <h1 className="mt-1 text-[15px] font-bold leading-tight text-[var(--zombie-text-full)]">{title}</h1>
        <nav className="mt-6 flex flex-col gap-1">
          {desktopNav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={clsx(
                'flex items-center justify-between rounded-lg px-3 py-2 text-[13px] transition-colors',
                navActive(pathname, n.href, leagueId)
                  ? 'bg-sky-500/15 text-sky-200'
                  : 'text-white/55 hover:bg-white/[0.06] hover:text-white/90',
              )}
              data-testid={`zombie-nav-${n.label.toLowerCase().replace(/\s.*/, '')}`}
            >
              <span>
                {n.emoji ? `${n.emoji} ` : ''}
                {n.label}
              </span>
              {n.label === 'Items' && itemCount > 0 ? (
                <span className="rounded-full bg-teal-500/25 px-1.5 text-[10px] font-bold text-teal-200">{itemCount}</span>
              ) : null}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-[var(--zombie-border)] bg-[#07080c]/95 px-4 py-3 md:hidden">
          <span className="text-[14px] font-semibold text-white">{title}</span>
        </header>

        <nav className="grid grid-cols-5 border-b border-[var(--zombie-border)] bg-[var(--zombie-panel)] md:hidden">
          {bottomMain.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={clsx(
                'flex min-h-[48px] flex-col items-center justify-center px-1 py-2 text-[10px] font-medium',
                navActive(pathname, n.href, leagueId) ? 'text-sky-200' : 'text-white/60',
              )}
            >
              <span className="text-[11px]">{n.label}</span>
            </Link>
          ))}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="flex min-h-[48px] flex-col items-center justify-center px-1 py-2 text-[10px] font-medium text-white/60"
            aria-expanded={moreOpen}
            aria-label="More navigation"
            data-testid="zombie-nav-more"
          >
            ···
            <span className="text-[11px]">More</span>
          </button>
        </nav>

        {moreOpen ? (
          <div
            className="fixed inset-0 z-40 bg-black/70 md:hidden"
            role="presentation"
            onClick={() => setMoreOpen(false)}
          >
            <div
              className="absolute bottom-0 left-0 right-0 max-h-[70vh] overflow-y-auto rounded-t-2xl border border-[var(--zombie-border)] bg-[var(--zombie-panel)] p-4 shadow-xl"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-label="More zombie navigation"
            >
              <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-[var(--zombie-text-dim)]">
                More
              </p>
              <div className="flex flex-col gap-1">
                {drawerLinks.map((n) => (
                  <Link
                    key={n.href}
                    href={n.href}
                    onClick={() => setMoreOpen(false)}
                    className="flex min-h-[44px] items-center justify-between rounded-xl px-3 py-2 text-[14px] text-white/85 hover:bg-white/[0.06]"
                  >
                    <span>
                      {n.emoji} {n.label}
                    </span>
                    {n.label.startsWith('Items') && itemCount > 0 ? (
                      <span className="rounded-full bg-teal-500/25 px-2 text-[11px] font-bold text-teal-200">
                        🎒 {itemCount}
                      </span>
                    ) : null}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        <main className="min-h-0 flex-1 overflow-y-auto p-4">{children}</main>
      </div>
    </div>
  )
}
