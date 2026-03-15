"use client"

import { Suspense, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { signOut } from "next-auth/react"
import { Loader2 } from "lucide-react"
import { getLoginRedirectUrl } from "@/lib/routing"

function LogoutContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const requested = searchParams?.get("callbackUrl") || searchParams?.get("next") || "/"
    const target = getLoginRedirectUrl(requested)

    // NextAuth will clear the user session and then redirect to our auth landing
    signOut({ callbackUrl: target })
  }, [router, searchParams])

  return (
    <main className="min-h-screen bg-neutral-950 text-white flex items-center justify-center px-4">
      <div className="flex items-center gap-3 text-sm text-white/70">
        <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
        <span>Signing you out…</span>
      </div>
    </main>
  )
}

export default function LogoutPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-neutral-950 text-white flex items-center justify-center px-4">
          <div className="flex items-center gap-3 text-sm text-white/70">
            <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
            <span>Signing you out…</span>
          </div>
        </main>
      }
    >
      <LogoutContent />
    </Suspense>
  )
}

