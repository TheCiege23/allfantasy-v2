'use client'

import Link from 'next/link'
import { Plus, Settings } from 'lucide-react'
import { LeagueListPanel } from './LeagueListPanel'
import type { RightControlPanelLayoutProps, UserLeague } from '../types'

function profileInitials(name: string): string {
  const t = name.trim()
  if (!t) return '?'
  const at = t.indexOf('@')
  const base = at > 0 ? t.slice(0, at) : t
  const parts = base.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
  }
  return base.slice(0, 2).toUpperCase() || '?'
}

export function RightControlPanel({
  leagues,
  leaguesLoading,
  selectedId,
  activeLeagueId,
  onSelectLeague,
  userId,
  userName,
  userImage,
  userSubtitle,
  onImport,
  onAfterLeagueNavigate,
}: RightControlPanelLayoutProps) {
  const resolvedSelectedId = activeLeagueId ?? selectedId
  const subtitle =
    userSubtitle === ''
      ? null
      : userSubtitle != null && userSubtitle !== ''
        ? userSubtitle
        : 'AllFantasy'

  return (
    <div className="relative flex h-full min-h-0 w-full min-w-0 max-w-full flex-col overflow-x-hidden border-l border-white/[0.07] bg-[#0a0a1f]">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-w-0 flex-shrink-0 items-center justify-between gap-2 border-b border-white/[0.07] px-2 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30">My Leagues</p>
          <button
            type="button"
            onClick={onImport}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-white transition hover:bg-white/[0.08]"
            aria-label="Import league"
            title="Import league"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
          <LeagueListPanel
            leagues={leagues}
            selectedId={resolvedSelectedId}
            onSelect={(league: UserLeague) => {
              onSelectLeague(league)
              onAfterLeagueNavigate?.()
            }}
            compact
            loading={leaguesLoading}
          />
        </div>
      </div>

      {/* Compact AF Chat icon bar (DM / Groups / Chimmy) — retained for future use; replaced by profile footer */}
      {/*
      <div
        className="flex h-12 max-h-12 min-h-[48px] shrink-0 items-center justify-around border-t border-white/[0.07] bg-[#0a0a1f] px-4 py-2"
        data-af-chat-user-id={userId}
      >
        ... MessageCircle, Users, Bot toggles ...
      </div>
      */}

      <div
        className="flex min-h-[52px] flex-shrink-0 items-center gap-2 border-t border-white/[0.07] bg-[#0a0a1f] px-2 py-2"
        data-dashboard-user-id={userId}
        data-dashboard-profile-footer
      >
        <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-cyan-500 to-blue-600">
          {userImage ? (
            <img src={userImage} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-[10px] font-bold uppercase text-white">
              {profileInitials(userName)}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-semibold text-white">{userName}</p>
          {subtitle ? (
            <p className="truncate text-[9px] leading-tight text-white/40">{subtitle}</p>
          ) : null}
        </div>
        <Link
          href="/settings"
          className="flex shrink-0 rounded-lg p-1 transition-colors hover:bg-white/[0.06]"
          aria-label="Settings"
        >
          <Settings className="h-3.5 w-3.5 text-white/40 transition-colors hover:text-white/80" />
        </Link>
      </div>
    </div>
  )
}
