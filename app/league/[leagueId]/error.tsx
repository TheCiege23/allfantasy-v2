"use client"

import DashboardUnavailableState from "@/components/dashboard/DashboardUnavailableState"
import { getErrorMessage } from "@/lib/error-handling"
import { getDashboardRuntimeIssue } from "@/lib/dashboard/runtime-issues"
import { useLanguage } from "@/components/i18n/LanguageProviderClient"

/**
 * League pages use Prisma on the server; missing DATABASE_URL surfaces as this boundary.
 * Reuse dashboard config messaging so production misconfig is actionable (Vercel env + redeploy).
 */
export default function LeagueRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const { t } = useLanguage()
  const issue = getDashboardRuntimeIssue(error)

  if (issue) {
    return (
      <DashboardUnavailableState
        title={issue.title}
        message={issue.message}
        missing={issue.missing}
        onRetry={reset}
      />
    )
  }

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
