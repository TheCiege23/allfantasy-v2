import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import SettingsClient from "./SettingsClient"

export default async function SettingsPage() {
  const session = (await getServerSession(authOptions as any)) as {
    user?: { email?: string | null; name?: string | null }
  } | null

  if (!session?.user) {
    redirect("/login?callbackUrl=/settings")
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 mode-readable">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mode-text">Settings</h1>
        <p className="mt-2 text-sm mode-muted">
          Profile, preferences, security, and account. Shared across AllFantasy Sports App, Bracket Challenge, and Legacy.
        </p>
      </div>
      <SettingsClient />
    </main>
  )
}
