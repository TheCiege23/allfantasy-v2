import { LoadingStateRenderer } from "@/components/ui-states"

export default function DashboardLoading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <LoadingStateRenderer label="Loading dashboard..." testId="dashboard-page-loading-state" />
    </main>
  )
}
