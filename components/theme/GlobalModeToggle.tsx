"use client"

import { usePathname } from "next/navigation"
import { ModeToggle } from "@/components/theme/ModeToggle"

export function GlobalModeToggle() {
  const pathname = usePathname() ?? ""
  if (pathname?.startsWith("/admin")) return null

  /** Right-rail profile footer (username + settings) sits bottom-right; fixed toggle covered the gear. */
  if (pathname?.startsWith("/dashboard") || pathname?.startsWith("/league/")) return null

  /** Bug-stab: draft room mounts WarRoomPopup at fixed bottom-4 right-4 z-[60].
   *  This toggle sits at fixed bottom-4 right-4 z-40 — same coordinates, lower
   *  z-index — so the AF/light-dark button visually overlaps the War Room
   *  trigger and steals user clicks at narrow widths. The draft route has its
   *  own theme controls in DraftTopBar; the global toggle is redundant here. */
  if (pathname?.startsWith("/draft/") || pathname?.startsWith("/draft-room/")) return null

  /** Canonical `/create-league`; legacy `/leagues/create` and `/create-league/v2` redirect but may flash on client. */
  const createLeagueRoute =
    pathname.startsWith('/create-league') || pathname === '/leagues/create'

  return (
    <div
      className={
        createLeagueRoute
          ? 'fixed right-4 top-4 z-40 sm:top-5'
          : 'fixed right-4 z-40 bottom-20 lg:bottom-4'
      }
    >
      <ModeToggle className="rounded-xl border px-3 py-2 text-xs font-semibold shadow-lg backdrop-blur"
      />
    </div>
  )
}
