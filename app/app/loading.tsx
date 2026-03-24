import { LoadingStateRenderer } from "@/components/ui-states"

export default function AppShellLoading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <LoadingStateRenderer label="Loading sports app..." testId="app-shell-loading-state" />
    </main>
  )
}
