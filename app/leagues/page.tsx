import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import AppShellNav from "@/components/navigation/AppShellNav"
import LeagueSyncDashboard from "@/app/components/LeagueSyncDashboard"

export const metadata = {
  title: "League Sync | AllFantasy",
  description: "Sync and manage your fantasy leagues",
}

function resolveAdmin(email: string | null | undefined) {
  if (!email) return false
  const allow = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean)
  return allow.includes(email.toLowerCase())
}

export default async function LeaguesPage() {
  const session = (await getServerSession(authOptions as any)) as {
    user?: { email?: string | null; name?: string | null }
  } | null

  const isAuthenticated = Boolean(session?.user)
  const isAdmin = resolveAdmin(session?.user?.email)

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <AppShellNav
        isAuthenticated={isAuthenticated}
        isAdmin={isAdmin}
        userLabel={session?.user?.name || session?.user?.email || "Guest"}
      />
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/70">
          Leagues workspace: sync imports, open league homes, and manage league memberships.
        </div>
        <LeagueSyncDashboard />
      </main>
    </div>
  )
}
