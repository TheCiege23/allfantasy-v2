"use client"

import { useState, useEffect } from "react"
import DesktopNavBar from "@/components/navigation/DesktopNavBar"
import { MobileNavigationDrawer } from "./MobileNavigationDrawer"
import { SearchOverlay } from "@/components/search/SearchOverlay"
import { createCommandPaletteHandler } from "@/lib/search"

const LG_BREAKPOINT_PX = 1024

export interface ResponsiveNavSystemProps {
  isAuthenticated: boolean
  isAdmin: boolean
  userLabel: string | null
  children: React.ReactNode
}

/**
 * Responsive navigation: desktop bar + mobile drawer + search overlay. Closes drawer when viewport
 * resizes to lg (desktop) so state does not get stuck.
 */
export function ResponsiveNavSystem({
  isAuthenticated,
  isAdmin,
  userLabel,
  children,
}: ResponsiveNavSystemProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${LG_BREAKPOINT_PX}px)`)
    const handle = () => {
      if (mql.matches) setMobileMenuOpen(false)
    }
    mql.addEventListener("change", handle)
    return () => mql.removeEventListener("change", handle)
  }, [])

  useEffect(() => {
    const handler = createCommandPaletteHandler(() => setSearchOpen(true))
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  return (
    <>
      <DesktopNavBar
        isAuthenticated={isAuthenticated}
        isAdmin={isAdmin}
        userLabel={userLabel}
        onOpenMobileMenu={() => setMobileMenuOpen(true)}
        onOpenSearch={() => setSearchOpen(true)}
      />
      <MobileNavigationDrawer
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        isAdmin={isAdmin}
      />
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
      {children}
    </>
  )
}
