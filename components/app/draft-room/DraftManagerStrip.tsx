'use client'

import { Crown } from 'lucide-react'
import { getManagerColorBySlot, withAlpha } from '@/lib/draft-room'
import { sleeperAvatarUrl } from '@/lib/sleeper-avatar'

export type ManagerSlot = {
  slot: number
  rosterId: string
  displayName: string
  teamName?: string | null
  handle?: string | null
  avatarUrl?: string | null
  isCommissioner?: boolean
  /** If this pick was traded, show metadata */
  tradedPickMeta?: { newOwnerName?: string; previousOwnerName?: string; tintColor?: string } | null
}

export type DraftManagerStripProps = {
  managers: ManagerSlot[]
  activeRosterId: string | null
  tradedPickColorMode?: boolean
  /** Optional: show new owner name in red on traded picks */
  showNewOwnerInRed?: boolean
  /** Optional: e.g. "Weighted Lottery Order" when order came from lottery */
  orderSourceLabel?: string | null
}

function managerInitials(value: string): string {
  const parts = value
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2)

  if (parts.length === 0) return 'AF'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase()
}

export function DraftManagerStrip({
  managers,
  activeRosterId,
  tradedPickColorMode = false,
  showNewOwnerInRed = false,
  orderSourceLabel,
}: DraftManagerStripProps) {
  return (
    <div className="border-b border-white/8 bg-[#071020] px-3 pb-3 pt-1.5 sm:px-4">
      {orderSourceLabel ? (
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/38">
            Draft order
          </span>
          <span className="rounded-full border border-amber-400/25 bg-amber-500/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-200/90">
            {orderSourceLabel}
          </span>
        </div>
      ) : null}

      <div className="flex gap-3 overflow-x-auto pb-1" data-testid="draft-manager-strip">
        {managers.map((manager) => {
          const isActive = manager.rosterId === activeRosterId
          const color = getManagerColorBySlot(manager.slot)
          const avatarSrc = sleeperAvatarUrl(manager.avatarUrl)
          const displayHandle = (manager.handle?.trim() || manager.displayName?.trim() || `Manager ${manager.slot}`).replace(/^@/, '')
          const initials = managerInitials(manager.handle?.trim() || manager.displayName?.trim() || manager.teamName?.trim() || `Manager ${manager.slot}`)
          const tradedTint =
            tradedPickColorMode && manager.tradedPickMeta?.tintColor
              ? {
                  borderColor: withAlpha(manager.tradedPickMeta.tintColor, 0.65),
                  backgroundColor: withAlpha(manager.tradedPickMeta.tintColor, 0.14),
                }
              : undefined

          return (
            <div
              key={manager.rosterId}
              className="group flex min-w-[72px] flex-col items-center gap-1.5 pb-0.5 text-center"
              data-slot={manager.slot}
              data-roster-id={manager.rosterId}
              data-testid={`draft-manager-slot-${manager.slot}`}
            >
              <div className="relative flex h-12 w-12 items-center justify-center sm:h-14 sm:w-14">
                <span
                  className="absolute inset-1 rounded-full blur-[10px] transition-opacity duration-200 group-hover:opacity-100"
                  style={{ backgroundColor: withAlpha(color.tintHex, isActive ? 0.48 : 0.3) }}
                  aria-hidden
                />
                <div
                  className={`relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border bg-[#020814] shadow-[0_10px_30px_rgba(0,0,0,0.35)] sm:h-12 sm:w-12 ${
                    isActive ? 'ring-2 ring-cyan-300/75 ring-offset-2 ring-offset-[#071020]' : ''
                  }`}
                  style={
                    tradedTint ?? {
                      borderColor: withAlpha(color.tintHex, isActive ? 0.9 : 0.52),
                      backgroundColor: withAlpha(color.tintHex, 0.12),
                    }
                  }
                >
                  {avatarSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-white/80">
                      {initials}
                    </span>
                  )}
                </div>

                {manager.isCommissioner ? (
                  <span className="absolute -right-0.5 -top-0.5 rounded-full border border-amber-300/40 bg-[#0b1323] p-1 text-amber-200 shadow-sm">
                    <Crown className="h-2.5 w-2.5" />
                  </span>
                ) : null}

                {isActive ? (
                  <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border border-[#071020] bg-cyan-300 shadow-[0_0_16px_rgba(103,232,249,0.8)]" />
                ) : null}
              </div>

              <div className="w-[78px] sm:w-[84px]">
                <p className={`truncate text-[12px] font-medium ${isActive ? 'text-white' : 'text-[#9fb7ff]'}`}>
                  {displayHandle}
                </p>

                {showNewOwnerInRed && manager.tradedPickMeta?.newOwnerName ? (
                  <p className="truncate text-[10px] text-red-300" title={`Now: ${manager.tradedPickMeta.newOwnerName}`}>
                    Now {manager.tradedPickMeta.newOwnerName}
                  </p>
                ) : manager.teamName ? (
                  <p className="truncate text-[10px] text-white/32">{manager.teamName}</p>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
