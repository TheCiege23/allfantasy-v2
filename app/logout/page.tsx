"use client"

import { Suspense, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { signOut } from "next-auth/react"
import { AuthStatusLoadingFallback } from "@/components/auth/AuthStatusShell"
import { getLoginRedirectUrl } from "@/lib/routing"

function LogoutContent() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const requested = searchParams?.get("callbackUrl") || searchParams?.get("next") || "/"
    const target = getLoginRedirectUrl(requested)

    // NextAuth will clear the user session and then redirect to our auth landing
    signOut({ callbackUrl: target })
  }, [searchParams])

  return <AuthStatusLoadingFallback label="Signing you out..." />
}

export default function LogoutPage() {
  return (
    <Suspense fallback={<AuthStatusLoadingFallback label="Signing you out..." />}>
      <LogoutContent />
    </Suspense>
  )
}

