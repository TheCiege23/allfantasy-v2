"use client"

import { useState, useEffect } from "react"
import { AppHeader } from "./AppHeader"
import MobileBottomTabs from "@/components/navigation/MobileBottomTabs"
import { MobileNavDrawer } from "./MobileNavDrawer"
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
  const [mobileTopNavHidden, setMobileTopNavHidden] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${LG_BREAKPOINT_PX}px)`)
    const handle = () => {
      if (mql.matches) {
        setMobileMenuOpen(false)
        setMobileTopNavHidden(false)
      }
    }
    mql.addEventListener("change", handle)
    return () => mql.removeEventListener("change", handle)
  }, [])

  useEffect(() => {
    const handler = createCommandPaletteHandler(() => {
      setMobileMenuOpen(false)
      setSearchOpen(true)
    })
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  useEffect(() => {
    if (!mobileMenuOpen && !searchOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [mobileMenuOpen, searchOpen])

  useEffect(() => {
    let lastY = window.scrollY
    let ticking = false

    const onScroll = () => {
      if (window.innerWidth >= LG_BREAKPOINT_PX) {
        if (mobileTopNavHidden) setMobileTopNavHidden(false)
        return
      }
      if (mobileMenuOpen || searchOpen) {
        if (mobileTopNavHidden) setMobileTopNavHidden(false)
        lastY = window.scrollY
        return
      }
      if (ticking) return
      ticking = true
      window.requestAnimationFrame(() => {
        const currentY = window.scrollY
        const delta = currentY - lastY
        if (currentY <= 8 || delta < -6) {
          setMobileTopNavHidden(false)
        } else if (delta > 10) {
          setMobileTopNavHidden(true)
        }
        lastY = currentY
        ticking = false
      })
    }

    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [mobileMenuOpen, searchOpen, mobileTopNavHidden])

  return (
    <>
      <div className={mobileTopNavHidden ? "-translate-y-full transition-transform duration-200 lg:translate-y-0" : "translate-y-0 transition-transform duration-200"}>
        <AppHeader
          isAuthenticated={isAuthenticated}
          isAdmin={isAdmin}
          userLabel={userLabel}
          mobileMenuOpen={mobileMenuOpen}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onOpenSearch={() => setSearchOpen(true)}
        />
      </div>
      <MobileNavDrawer
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        isAdmin={isAdmin}
        onOpenSearch={() => setSearchOpen(true)}
      />
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
      <div className={isAuthenticated ? "pb-20 lg:pb-0" : undefined}>{children}</div>
      {isAuthenticated ? <MobileBottomTabs /> : null}
    </>
  )
}
