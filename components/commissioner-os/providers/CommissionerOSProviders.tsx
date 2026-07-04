'use client'

import type { ReactNode } from 'react'
import { CommissionerFeatureFlagProvider } from './CommissionerFeatureFlagProvider'
import { CommissionerLayoutProvider } from './CommissionerLayoutProvider'
import { CommissionerNavigationProvider } from './CommissionerNavigationProvider'
import { CommissionerPlatformProvider } from './CommissionerPlatformProvider'

/**
 * Infrastructure providers only, per Phase 0.2/0.3 scope — no business
 * providers here. League Health, Recommendations, and every other module
 * own their own data and will be consumed through the Decision OS client
 * interface (Implementation Program §12) once their phase arrives, never
 * through a shell-level provider.
 *
 * No ThemeProvider here — a full-featured one is already mounted globally
 * in components/providers/AppProviders.tsx (light/dark/legacy/system,
 * localStorage + cross-tab sync). Commissioner OS consumes it via
 * useThemeMode(); wrapping a second one here would be a real service
 * collision, not redundant safety (Repository Discovery Rules appendix, §5/§8).
 *
 * CommissionerPlatformProvider (Phase 0.3) holds the shared event bus and
 * platform-service open/closed state Search, Notifications, Activity
 * Stream, and Help Center will all eventually consume — infrastructure
 * only, no service behavior implemented yet.
 */
export function CommissionerOSProviders({ children }: { children: ReactNode }) {
  return (
    <CommissionerFeatureFlagProvider>
      <CommissionerLayoutProvider>
        <CommissionerNavigationProvider>
          <CommissionerPlatformProvider>{children}</CommissionerPlatformProvider>
        </CommissionerNavigationProvider>
      </CommissionerLayoutProvider>
    </CommissionerFeatureFlagProvider>
  )
}
