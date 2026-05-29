"use client"

import { usePathname } from "next/navigation"
import { Toaster } from "sonner"
import { BackToTop } from "@/components/BackToTop"
import SyncProfilePreferences from "@/components/auth/SyncProfilePreferences"
import SessionIdleMonitor from "@/components/auth/SessionIdleMonitor"
import { ErrorTrackingInit } from "@/components/error-handling/ErrorTrackingInit"
import WebVitalsTracker from "@/components/performance/WebVitalsTracker"
import ServiceWorkerRegistration from "@/components/pwa/ServiceWorkerRegistration"
import { ReferralTracker } from "@/components/referral/ReferralTracker"
import { TimeEngineClientSync } from "@/components/time/TimeEngineClientSync"
import { GlobalModeToggle } from "@/components/theme/GlobalModeToggle"

const AUTH_ROUTE_PREFIXES = ["/login", "/signup", "/signin", "/auth"]

/**
 * Paths where ALL chrome (Toaster portal, SW reg, GlobalModeToggle, etc.)
 * must be suppressed to prevent hydration mismatches. Mirrors the list in
 * SafeGlobalChrome — keep them in sync.
 *
 * /brackets/world-cup is included because usePathname() returns null during
 * the first client render tick (before the router initialises). On the server
 * the real pathname is returned and chrome would render; on the client the
 * null bail fires and chrome returns null → server/client tree mismatch →
 * React #418/#423 → HierarchyRequestError. Adding the prefix here ensures
 * both sides agree on null output.
 */
const FULL_CHROME_BAIL_PREFIXES = [
  ...AUTH_ROUTE_PREFIXES,
  "/brackets/world-cup",
]

function shouldBailChrome(pathname: string | null): boolean {
  if (!pathname) return false
  return FULL_CHROME_BAIL_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}

export function AuthRouteGlobalChrome() {
  const pathname = usePathname()

  // Bail when pathname is unknown (first client render tick before router
  // initialises). This matches the server's null output for unknown paths
  // so both sides of hydration agree.
  if (pathname === null || pathname === undefined) {
    return null
  }
  // Bail on /brackets root — crashing after Phase 6 page rollback.
  if (pathname === "/brackets") {
    return null
  }

  if (shouldBailChrome(pathname)) {
    return null
  }

  return (
    <>
      <ErrorTrackingInit />
      <WebVitalsTracker />
      <ServiceWorkerRegistration />
      <ReferralTracker />
      <SyncProfilePreferences />
      <TimeEngineClientSync />
      <SessionIdleMonitor />
      <GlobalModeToggle />
      <Toaster position="top-center" richColors closeButton />
      <BackToTop />
    </>
  )
}
