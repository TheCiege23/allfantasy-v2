"use client"

import DashboardUnavailableState from "@/components/dashboard/DashboardUnavailableState"
import { getErrorMessage } from "@/lib/error-handling"
import { getDashboardRuntimeIssue } from "@/lib/dashboard/runtime-issues"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
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
      title="Dashboard temporarily unavailable"
      message={getErrorMessage(error, {
        fallback: "We couldn't load the dashboard right now. Please try again in a moment.",
      })}
      onRetry={reset}
    />
  )
}
