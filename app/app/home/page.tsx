import { Suspense } from 'react'
import FinalDashboardClient from '@/components/dashboard/FinalDashboardClient'

export const metadata = {
  title: 'Dashboard | AllFantasy',
  description: 'Your leagues, drafts, matchups, and AI suggestions in one place.',
}

export default function AppHomePage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 flex items-center justify-center min-h-[40vh]">
          <div className="text-sm text-white/50">Loading…</div>
        </main>
      }
    >
      <FinalDashboardClient />
    </Suspense>
  )
}
