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

function isAuthRoutePath(pathname: string | null): boolean {
  if (!pathname) return false
  return AUTH_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}

export function AuthRouteGlobalChrome() {
  const pathname = usePathname()

  // EMERGENCY HARD BAIL: /brackets root crashing after Phase 6 page rollback.
  // Defensively skip all chrome (toaster portal, SW reg, sonner, etc.) on the
  // exact /brackets path and when pathname is unknown. /brackets/world-cup and
  // every other route continue to render the full chrome.
  if (pathname === null || pathname === undefined) {
    return null
  }
  if (pathname === "/brackets") {
    return null
  }

  if (isAuthRoutePath(pathname)) {
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
