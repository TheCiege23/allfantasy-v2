import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { isAdminEmailAllowed } from "@/lib/adminAuth"
import WorldCupAdminPanel from "./WorldCupAdminPanel"

export const dynamic = "force-dynamic"

export default async function WorldCupAdminPage() {
  const session = (await getServerSession(authOptions as any)) as {
    user?: { id?: string | null; email?: string | null }
  } | null

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard/admin/world-cup")
  }

  const isAdmin = isAdminEmailAllowed(session.user?.email)
  if (!isAdmin) {
    redirect("/dashboard")
  }

  return <WorldCupAdminPanel />
}
