"use client"

import Link from "next/link"
import { useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { ArrowLeft, Info } from "lucide-react"
import {
  getProviderDisplayName,
  getProviderFallbackMessage,
} from "@/lib/auth/ProviderFallbackFlowService"
import { type SocialProvider } from "@/lib/auth/SocialProviderResolver"
import { resolveFallbackRoute } from "@/lib/ui-state"

const SUPPORTED_PROVIDER_IDS: SocialProvider[] = [
  "google",
  "apple",
  "facebook",
  "instagram",
  "x",
  "tiktok",
]

function toProvider(value: string | null): SocialProvider {
  if (!value) return "google"
  if (SUPPORTED_PROVIDER_IDS.includes(value as SocialProvider)) {
    return value as SocialProvider
  }
  return "google"
}

export default function ProviderPendingPage() {
  const searchParams = useSearchParams()
  const defaultDashboardHref = resolveFallbackRoute("dashboard").href
  const callbackUrlRaw = searchParams?.get("callbackUrl") ?? defaultDashboardHref
  const callbackUrl = callbackUrlRaw.startsWith("/") ? callbackUrlRaw : defaultDashboardHref
  const provider = toProvider(searchParams?.get("provider"))
  const landingFallback = resolveFallbackRoute("home")

  const providerName = useMemo(() => getProviderDisplayName(provider), [provider])
  const message = useMemo(() => getProviderFallbackMessage(provider), [provider])

  return (
    <main className="min-h-screen bg-neutral-950 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-2">
            <Info className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">{providerName} sign-in</h1>
            <p className="text-xs text-white/50">Provider availability</p>
          </div>
        </div>

        <p className="text-sm text-white/70">{message}</p>

        <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-white/50">
          Your account still works with username, email, or mobile number + password.
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
            className="flex-1 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 px-4 py-2.5 text-center text-sm font-semibold text-white hover:from-cyan-400 hover:to-purple-500 transition"
          >
            Back to Sign In
          </Link>
          <Link
            href={`/signup?next=${encodeURIComponent(callbackUrl)}`}
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-center text-sm font-medium text-white/80 hover:bg-white/10 transition"
          >
            Go to Sign Up
          </Link>
        </div>

        <Link
          href={landingFallback.href}
          className="inline-flex items-center gap-2 text-xs text-white/50 hover:text-white/70"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {landingFallback.label}
        </Link>
      </div>
    </main>
  )
}
