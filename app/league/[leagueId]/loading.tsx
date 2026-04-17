import { LoadingStateRenderer } from "@/components/ui-states"

export default function LeagueDashboardLoading() {
  return (
    <main className="mx-auto flex min-h-[40vh] w-full max-w-6xl flex-1 flex-col px-4 py-6 sm:px-6">
      <LoadingStateRenderer label="Loading league..." testId="league-page-loading-state" />
    </main>
  )
}
