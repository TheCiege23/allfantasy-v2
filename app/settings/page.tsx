import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import SettingsFullPage from "./SettingsFullPage"

export default async function SettingsPage() {
  const session = (await getServerSession(authOptions as never)) as {
    user?: { id?: string }
  } | null

  if (!session?.user) {
    redirect("/login?callbackUrl=/settings")
  }

  if (!session.user.id) {
    redirect("/login?callbackUrl=/settings")
  }

  return <SettingsFullPage />
}
