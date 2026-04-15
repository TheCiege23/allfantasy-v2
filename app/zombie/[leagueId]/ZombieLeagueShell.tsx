'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import clsx from 'clsx'
import { AlertTriangle, RadioTower, ShieldAlert, Skull, Sparkles } from 'lucide-react'
import { CommissionerSettingsModal } from '@/app/league/[leagueId]/components/CommissionerSettingsModal'

type ZMeta = {
  league?: {
    name?: string | null
    universeId?: string | null
    currentWeek?: number
    status?: string
    counts?: {
      survivor?: number
      zombie?: number
      whisperer?: number
      alive?: number
      total?: number
      horde?: number
    }
  }
  myActiveItemCount?: number
  myPendingItemCount?: number
  viewerIsCommissioner?: boolean
  commissionerNotifications?: {
    unread?: number
    actionRequired?: number
  }
}

function navActive(pathname: string, href: string, lid: string): boolean {
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
  const currentPath = pathname ?? ''
  const [meta, setMeta] = useState<ZMeta | null>(null)
  const [moreOpen, setMoreOpen] = useState(false)
  const [opsOpen, setOpsOpen] = useState(false)

  useEffect(() => {
    fetch(`/api/zombie/league?leagueId=${encodeURIComponent(leagueId)}`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: ZMeta | null) => setMeta(d))
      .catch(() => setMeta(null))
  }, [leagueId])

  const title = meta?.league?.name ?? 'Zombie League'
  const universeId = meta?.league?.universeId
  const itemCount = meta?.myActiveItemCount ?? 0
  const pendingCount = meta?.myPendingItemCount ?? 0
  const showComm = meta?.viewerIsCommissioner === true
  const week = Math.max(1, meta?.league?.currentWeek ?? 1)
  const survivorCount = meta?.league?.counts?.alive ?? 0
  const hordeCount = meta?.league?.counts?.horde ?? 0
  const whispererCount = meta?.league?.counts?.whisperer ?? 0
  const unreadOps = meta?.commissionerNotifications?.unread ?? 0
  const urgentOps = meta?.commissionerNotifications?.actionRequired ?? 0

  const desktopNav: { href: string; label: string; emoji?: string }[] = [
    { href: `/zombie/${leagueId}`, label: 'Home', emoji: '🏚' },
    { href: `/zombie/${leagueId}/standings`, label: 'Standings', emoji: '📊' },
    { href: `/zombie/${leagueId}/matchups`, label: 'Matchups', emoji: '🎯' },
    { href: `/zombie/${leagueId}/chat`, label: 'Chat', emoji: '💬' },
    { href: `/zombie/${leagueId}/items`, label: 'Items', emoji: '🎒' },
    ...(universeId ? [{ href: `/app/zombie-universe/${universeId}`, label: 'Universe', emoji: '🌍' }] : []),
    { href: `/zombie/${leagueId}/rules`, label: 'Rules', emoji: '📜' },
    { href: `/zombie/${leagueId}/history`, label: 'History', emoji: '📖' },
    ...(showComm ? [{ href: '#ops', label: 'Commissioner', emoji: '⚙️' }] : []),
  ]

  const bottomMain: { href: string; label: string }[] = [
    { href: `/zombie/${leagueId}`, label: 'Home' },
    { href: `/zombie/${leagueId}/standings`, label: 'Standings' },
    { href: `/zombie/${leagueId}/matchups`, label: 'Matchups' },
    { href: `/zombie/${leagueId}/chat`, label: 'Chat' },
  ]

  const drawerLinks: { href: string; label: string; emoji: string }[] = [
    { href: `/zombie/${leagueId}/items`, label: 'Items / Inventory', emoji: '🎒' },
    ...(universeId ? [{ href: `/app/zombie-universe/${universeId}`, label: 'Universe', emoji: '🌍' }] : []),
    { href: `/zombie/${leagueId}/rules`, label: 'Rules', emoji: '📜' },
    { href: `/zombie/${leagueId}/history`, label: 'History', emoji: '📖' },
    ...(showComm ? [{ href: '#ops', label: 'Commissioner', emoji: '⚙️' }] : []),
  ]

  function openOps() {
    if (showComm) setOpsOpen(true)
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="hidden w-[270px] shrink-0 border-r border-[var(--zombie-border)] bg-[radial-gradient(circle_at_top,_rgba(220,38,38,0.14),_transparent_35%),linear-gradient(180deg,#0a0b10_0%,#12141c_52%,#0c0d12_100%)] p-4 md:block">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4 shadow-[0_0_40px_rgba(220,38,38,0.08)]">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--zombie-text-dim)]">Zombie Ops</p>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-500/25 bg-red-950/40 text-red-200">
              <Skull className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-[16px] font-bold leading-tight text-[var(--zombie-text-full)]">{title}</h1>
              <p className="mt-1 text-[11px] uppercase tracking-[0.22em] text-red-200/70">Week {week} outbreak</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 text-[11px]">
            <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/8 p-2">
              <p className="text-white/45">Alive</p>
              <p className="mt-1 text-[16px] font-black text-emerald-200">{survivorCount}</p>
            </div>
            <div className="rounded-xl border border-red-500/15 bg-red-500/8 p-2">
              <p className="text-white/45">Horde</p>
              <p className="mt-1 text-[16px] font-black text-red-100">{hordeCount}</p>
            </div>
            <div className="rounded-xl border border-amber-500/15 bg-amber-500/8 p-2">
              <p className="text-white/45">Whisperer</p>
              <p className="mt-1 text-[16px] font-black text-amber-200">{whispererCount}</p>
            </div>
            <div className="rounded-xl border border-sky-500/15 bg-sky-500/8 p-2">
              <p className="text-white/45">Inventory</p>
              <p className="mt-1 text-[16px] font-black text-sky-100">{itemCount}</p>
            </div>
          </div>

          {showComm ? (
            <button
              type="button"
              onClick={openOps}
              className="mt-4 flex min-h-[44px] w-full items-center justify-between rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-left text-[12px] font-semibold text-amber-100 transition hover:bg-amber-500/15"
            >
              <span className="inline-flex items-center gap-2">
                <ShieldAlert className="h-4 w-4" />
                Commissioner Ops
              </span>
              <span className="rounded-full bg-black/25 px-2 py-1 text-[10px]">
                {urgentOps > 0 ? `${urgentOps} urgent` : unreadOps > 0 ? `${unreadOps} unread` : 'ready'}
              </span>
            </button>
          ) : null}
        </div>

        <p className="mt-5 text-[10px] font-bold uppercase tracking-widest text-[var(--zombie-text-dim)]">Navigation</p>
        <nav className="mt-3 flex flex-col gap-1">
          {desktopNav.map((n) =>
            n.href === '#ops' ? (
              <button
                key={n.href}
                type="button"
                onClick={openOps}
                className={clsx(
                  'flex items-center justify-between rounded-xl px-3 py-2.5 text-[13px] transition-colors',
                  opsOpen ? 'bg-amber-500/15 text-amber-100' : 'text-white/55 hover:bg-white/[0.06] hover:text-white/90',
                )}
                data-testid={`zombie-nav-${n.label.toLowerCase().replace(/\s.*/, '')}`}
              >
                <span>
                  {n.emoji ? `${n.emoji} ` : ''}
                  {n.label}
                </span>
                {urgentOps > 0 ? (
                  <span className="rounded-full bg-amber-500/20 px-2 text-[10px] font-bold text-amber-100">{urgentOps}</span>
                ) : unreadOps > 0 ? (
                  <span className="rounded-full bg-white/10 px-2 text-[10px] font-bold text-white/75">{unreadOps}</span>
                ) : null}
              </button>
            ) : (
              <Link
                key={n.href}
                href={n.href}
                className={clsx(
                  'flex items-center justify-between rounded-xl px-3 py-2.5 text-[13px] transition-colors',
                  navActive(currentPath, n.href, leagueId) ? 'bg-sky-500/15 text-sky-200' : 'text-white/55 hover:bg-white/[0.06] hover:text-white/90',
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
            ),
          )}
        </nav>

        <div className="mt-6 space-y-2 rounded-2xl border border-white/8 bg-black/20 p-3 text-[11px]">
          <div className="flex items-center justify-between text-white/70">
            <span className="inline-flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-red-300" />
              Live danger
            </span>
            <span>{hordeCount > survivorCount ? 'Escalating' : 'Contained'}</span>
          </div>
          <div className="flex items-center justify-between text-white/70">
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
              Pending items
            </span>
            <span>{pendingCount}</span>
          </div>
          <div className="flex items-center justify-between text-white/70">
            <span className="inline-flex items-center gap-1.5">
              <RadioTower className="h-3.5 w-3.5 text-amber-300" />
              League state
            </span>
            <span className="capitalize">{meta?.league?.status ?? 'active'}</span>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-[var(--zombie-border)] bg-[linear-gradient(180deg,rgba(17,18,24,0.98),rgba(10,11,16,0.96))] px-4 py-3 md:hidden">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="truncate text-[14px] font-semibold text-white">{title}</span>
              <p className="mt-1 text-[10px] uppercase tracking-[0.22em] text-white/45">Week {week} outbreak</p>
            </div>
            {showComm ? (
              <button
                type="button"
                onClick={openOps}
                className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-[11px] font-semibold text-amber-100"
              >
                Ops
              </button>
            ) : null}
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2 text-center text-[10px]">
            <div className="rounded-lg bg-white/5 px-2 py-2 text-white/70">
              <div className="text-white/40">Alive</div>
              <div className="mt-1 font-black text-emerald-200">{survivorCount}</div>
            </div>
            <div className="rounded-lg bg-white/5 px-2 py-2 text-white/70">
              <div className="text-white/40">Horde</div>
              <div className="mt-1 font-black text-red-100">{hordeCount}</div>
            </div>
            <div className="rounded-lg bg-white/5 px-2 py-2 text-white/70">
              <div className="text-white/40">Items</div>
              <div className="mt-1 font-black text-sky-100">{itemCount}</div>
            </div>
            <div className="rounded-lg bg-white/5 px-2 py-2 text-white/70">
              <div className="text-white/40">Ops</div>
              <div className="mt-1 font-black text-amber-100">{urgentOps || unreadOps}</div>
            </div>
          </div>
        </header>

        <nav className="grid grid-cols-5 border-b border-[var(--zombie-border)] bg-[var(--zombie-panel)] md:hidden">
          {bottomMain.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={clsx(
                'flex min-h-[48px] flex-col items-center justify-center px-1 py-2 text-[10px] font-medium',
                navActive(currentPath, n.href, leagueId) ? 'text-sky-200' : 'text-white/60',
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
              <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-[var(--zombie-text-dim)]">More</p>
              <div className="flex flex-col gap-1">
                {drawerLinks.map((n) =>
                  n.href === '#ops' ? (
                    <button
                      key={n.href}
                      type="button"
                      onClick={() => {
                        setMoreOpen(false)
                        openOps()
                      }}
                      className="flex min-h-[44px] items-center justify-between rounded-xl px-3 py-2 text-[14px] text-white/85 hover:bg-white/[0.06]"
                    >
                      <span>
                        {n.emoji} {n.label}
                      </span>
                      {urgentOps > 0 ? (
                        <span className="rounded-full bg-amber-500/25 px-2 text-[11px] font-bold text-amber-100">{urgentOps}</span>
                      ) : unreadOps > 0 ? (
                        <span className="rounded-full bg-white/10 px-2 text-[11px] font-bold text-white/75">{unreadOps}</span>
                      ) : null}
                    </button>
                  ) : (
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
                        <span className="rounded-full bg-teal-500/25 px-2 text-[11px] font-bold text-teal-200">🎒 {itemCount}</span>
                      ) : null}
                    </Link>
                  ),
                )}
              </div>
            </div>
          </div>
        ) : null}

        <main className="min-h-0 flex-1 overflow-y-auto bg-[linear-gradient(180deg,rgba(9,10,14,0.9),rgba(12,14,18,1))] p-4">
          {children}
        </main>
      </div>
      {showComm ? <CommissionerSettingsModal leagueId={leagueId} isOpen={opsOpen} onClose={() => setOpsOpen(false)} /> : null}
    </div>
  )
}
