"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { signIn } from "next-auth/react"
import {
  type SocialProvider,
  isSocialProviderEnabled,
} from "@/lib/auth/SocialProviderResolver"
import { buildProviderPendingHref } from "@/lib/auth/ProviderPendingFlow"

export default function SocialLoginButtons({ callbackUrl }: { callbackUrl: string }) {
  const router = useRouter()
  const [loadingProvider, setLoadingProvider] = useState<SocialProvider | null>(null)

  const signInWithGoogle = () => {
    void handleProviderClick("google")
  }

  const signInWithApple = () => {
    void handleProviderClick("apple")
  }

  async function handleProviderClick(provider: SocialProvider) {
    if (loadingProvider) return
    setLoadingProvider(provider)

    try {
      // Google and Apple always attempt signIn directly — they have real OAuth credentials.
      if (provider === "google" || provider === "apple") {
        await signIn(provider, { callbackUrl })
        return
      }

      // Other providers (Spotify etc.) check the enable flag first.
      if (isSocialProviderEnabled(provider)) {
        await signIn(provider, { callbackUrl })
        return
      }

      router.push(
        buildProviderPendingHref({
          provider,
          callbackUrl,
        })
      )
    } finally {
      setLoadingProvider(null)
    }
  }

  return (
    <div className="space-y-2">
      <div>
        <button
          type="button"
          onClick={signInWithGoogle}
          disabled={loadingProvider !== null}
          className={`flex w-full items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 py-2 text-sm font-medium text-white backdrop-blur transition hover:bg-white/15 ${loadingProvider !== null ? "opacity-70" : ""}`}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          Continue with Google
        </button>
        <button
          type="button"
          onClick={signInWithApple}
          disabled={loadingProvider !== null}
          className={`w-full bg-black text-white py-2 rounded-lg ${loadingProvider !== null ? "opacity-70" : ""}`}
        >
          Continue with Apple
        </button>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 text-[11px] text-white/45">
        <button
          type="button"
          onClick={() => {
            void handleProviderClick("facebook")
          }}
          disabled={loadingProvider !== null}
          className={`rounded-xl border border-white/10 bg-black/10 px-3 py-2 hover:bg-white/5 hover:text-white/60 transition ${
            loadingProvider !== null ? "opacity-70" : ""
          }`}
        >
          {loadingProvider === "facebook" ? "Opening..." : "Facebook (planned)"}
        </button>
        <button
          type="button"
          onClick={() => {
            void handleProviderClick("instagram")
          }}
          disabled={loadingProvider !== null}
          className={`rounded-xl border border-white/10 bg-black/10 px-3 py-2 hover:bg-white/5 hover:text-white/60 transition ${
            loadingProvider !== null ? "opacity-70" : ""
          }`}
        >
          {loadingProvider === "instagram" ? "Opening..." : "Instagram (planned)"}
        </button>
        <button
          type="button"
          onClick={() => {
            void handleProviderClick("x")
          }}
          disabled={loadingProvider !== null}
          className={`rounded-xl border border-white/10 bg-black/10 px-3 py-2 hover:bg-white/5 hover:text-white/60 transition ${
            loadingProvider !== null ? "opacity-70" : ""
          }`}
        >
          {loadingProvider === "x" ? "Opening..." : "X / Twitter (planned)"}
        </button>
        <button
          type="button"
          onClick={() => {
            void handleProviderClick("tiktok")
          }}
          disabled={loadingProvider !== null}
          className={`rounded-xl border border-white/10 bg-black/10 px-3 py-2 hover:bg-white/5 hover:text-white/60 transition sm:col-span-3 ${
            loadingProvider !== null ? "opacity-70" : ""
          }`}
        >
          {loadingProvider === "tiktok" ? "Opening..." : "TikTok (planned)"}
        </button>
      </div>
    </div>
  )
}
