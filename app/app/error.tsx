"use client"

import { ErrorStateRenderer } from "@/components/ui-states"
import { resolveRecoveryActions } from "@/lib/ui-state"

export default function AppShellError({
  error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <ErrorStateRenderer
        title="Sports app unavailable"
        message={error.message || "This app surface is temporarily unavailable."}
        onRetry={reset}
        actions={resolveRecoveryActions("dashboard").map((action) => ({
          id: action.id,
          label: action.label,
          href: action.href,
        }))}
        testId="app-shell-error-state"
      />
    </main>
  )
}
