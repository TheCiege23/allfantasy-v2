import { Suspense } from 'react'
import AdminLoginContent from './AdminLoginContent'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Admin Login · AllFantasy',
  robots: { index: false, follow: false },
}

function AdminLoginFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0f1a] text-white/60 text-sm">
      Loading…
    </div>
  )
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<AdminLoginFallback />}>
      <AdminLoginContent />
    </Suspense>
  )
}
