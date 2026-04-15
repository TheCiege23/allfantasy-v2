"use client"

import { usePathname } from "next/navigation"
import { ModeToggle } from "@/components/theme/ModeToggle"

export function GlobalModeToggle() {
  const pathname = usePathname() ?? ""
  if (pathname?.startsWith("/admin")) return null

  /** Right-rail profile footer (username + settings) sits bottom-right; fixed toggle covered the gear. */
  if (pathname?.startsWith("/dashboard") || pathname?.startsWith("/league/")) return null

  const createLeagueRoute = pathname === '/create-league' || pathname === '/leagues/create'

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
