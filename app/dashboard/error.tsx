"use client"

import DashboardUnavailableState from "@/components/dashboard/DashboardUnavailableState"
import { getErrorMessage } from "@/lib/error-handling"
import { useLanguage } from "@/components/i18n/LanguageProviderClient"

/**
 * Dashboard error boundary.
 *
 * IMPORTANT: This runs on the CLIENT. Importing server-only modules here
 * (like runtime-issues.ts → database-url.ts) causes webpack to bundle
 * DATABASE_URL resolution code into a shared client chunk, which crashes
 * every route that loads that chunk — including league pages.
 *
 * The server-side page.tsx already checks getDashboardMissingEnvVars()
 * proactively, so this boundary only catches client rendering failures.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const { t } = useLanguage()

  return (
    <DashboardUnavailableState
      title={t("dashboard.unavailable.title")}
      message={getErrorMessage(error, {
        fallback: t("dashboard.unavailable.message"),
      })}
      onRetry={reset}
    />
  )
}
