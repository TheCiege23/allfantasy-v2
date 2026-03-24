import type { ReactNode } from "react"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { resolveAdminEmail } from "@/lib/auth/admin"
import { GlobalShellClient } from "@/components/shell/GlobalShellClient"
import { AppSidebar } from "@/components/shell/AppSidebar"
import { ShellLayoutContainer } from "@/components/shell/ShellLayoutContainer"

export default async function GlobalAppShell({ children }: { children: ReactNode }) {
  const session = (await getServerSession(authOptions as any)) as {
    user?: { email?: string | null; name?: string | null }
  } | null

  const isAuthenticated = Boolean(session?.user)
  const isAdmin = resolveAdminEmail(session?.user?.email)
  const userLabel = session?.user?.name || session?.user?.email || "Guest"

  return (
    <div className="min-h-screen mode-surface transition-colors">
      <GlobalShellClient
        isAuthenticated={isAuthenticated}
        isAdmin={isAdmin}
        userLabel={userLabel}
      >
        <ShellLayoutContainer
          maxWidth="max-w-[1400px]"
          paddingClassName="px-0 lg:px-4"
          className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-6"
        >
          <div className="min-w-0">{children}</div>
          <div className="hidden py-6 lg:block">
            <AppSidebar />
          </div>
        </ShellLayoutContainer>
      </GlobalShellClient>
    </div>
  )
}
