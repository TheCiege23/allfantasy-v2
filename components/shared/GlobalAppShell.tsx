import type { ReactNode } from "react"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { resolveAdminEmail } from "@/lib/auth/admin"
import GlobalTopNav from "@/components/shared/GlobalTopNav"
import GlobalRightRail from "@/components/shared/GlobalRightRail"

export default async function GlobalAppShell({ children }: { children: ReactNode }) {
  const session = (await getServerSession(authOptions as any)) as {
    user?: { email?: string | null; name?: string | null }
  } | null

  const isAuthenticated = Boolean(session?.user)
  const isAdmin = resolveAdminEmail(session?.user?.email)

  return (
    <div className="min-h-screen mode-surface transition-colors">
      <GlobalTopNav
        isAuthenticated={isAuthenticated}
        isAdmin={isAdmin}
        userLabel={session?.user?.name || session?.user?.email || "Guest"}
      />
      <div className="mx-auto w-full max-w-[1400px] px-0 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-6 lg:px-4">
        <div className="min-w-0">{children}</div>
        <div className="hidden py-6 lg:block">
          <GlobalRightRail />
        </div>
      </div>
    </div>
  )
}
