"use client"

import DashboardUnavailableState from "@/components/dashboard/DashboardUnavailableState"
import { useLanguage } from "@/components/i18n/LanguageProviderClient"

/**
 * League route error boundary — keep messaging generic. Do not pattern-match Prisma/config
 * errors here: many runtime failures (e.g. hydration) surface with messages that mention
 * DATABASE_URL and mislead users into thinking Vercel env is wrong.
 */
export default function LeagueRouteError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const { t } = useLanguage()

  return (
    <DashboardUnavailableState
      title={t("league.error.title")}
      message={t("league.error.message")}
      onRetry={reset}
    />
  )
}
