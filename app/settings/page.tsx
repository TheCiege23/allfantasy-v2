import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import AppShellNav from '@/components/navigation/AppShellNav'

function resolveAdmin(email: string | null | undefined) {
  if (!email) return false
  const allow = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean)
  return allow.includes(email.toLowerCase())
}

export default async function SettingsPage() {
  const session = (await getServerSession(authOptions as any)) as {
    user?: { email?: string | null; name?: string | null }
  } | null

  const isAuthenticated = Boolean(session?.user)
  const isAdmin = resolveAdmin(session?.user?.email)

  return (
    <div className="min-h-screen mode-surface mode-readable">
      <AppShellNav isAuthenticated={isAuthenticated} isAdmin={isAdmin} userLabel={session?.user?.name || session?.user?.email || 'Guest'} />
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        <section className="mode-panel rounded-2xl p-6">
          <h1 className="text-2xl font-semibold mode-text">Settings</h1>
          <p className="mt-2 text-sm mode-muted">Shared profile/security/verification/payment preferences across all products.</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <Link href="/verify" className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: 'var(--border)' }}>Verification</Link>
            <Link href="/forgot-password" className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: 'var(--border)' }}>Password Reset</Link>
          </div>
        </section>
      </main>
    </div>
  )
}
