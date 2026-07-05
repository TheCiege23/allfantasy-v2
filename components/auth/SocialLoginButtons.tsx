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

  const signInWithSpotify = () => {
    void handleProviderClick("spotify")
  }

  async function handleProviderClick(provider: SocialProvider) {
    if (loadingProvider) return
    setLoadingProvider(provider)

    try {
      // Google and Spotify always attempt signIn directly — they have real OAuth
      // credentials configured. Kept in sync with app/login/LoginContent.tsx.
      if (provider === "google" || provider === "spotify") {
        await signIn(provider, { callbackUrl })
        return
      }

      // Apple is intentionally not yet enabled (no OAuth credentials configured) —
      // always route to the pending flow, matching the login page's behavior.
      if (provider !== "apple" && isSocialProviderEnabled(provider)) {
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
          onClick={signInWithSpotify}
          disabled={loadingProvider !== null}
          className={`flex w-full items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 py-2 text-sm font-medium text-white backdrop-blur transition hover:bg-white/15 ${loadingProvider !== null ? "opacity-70" : ""}`}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#1DB954" /><path d="M16.8 16.64a.75.75 0 0 1-1.03.25c-2.8-1.71-6.32-2.1-10.45-1.13a.75.75 0 1 1-.34-1.46c4.52-1.05 8.43-.62 11.57 1.3.36.22.47.68.25 1.04Zm1.48-3.3a.95.95 0 0 1-1.3.31c-3.2-1.97-8.07-2.55-11.84-1.36a.95.95 0 0 1-.58-1.81c4.3-1.38 9.66-.72 13.4 1.57.45.28.6.86.32 1.3Zm.12-3.43C14.57 7.63 8.82 7.4 5.34 8.48a1.15 1.15 0 1 1-.68-2.2c4-1.22 10.43-.98 14.93 1.7a1.15 1.15 0 0 1-1.18 1.93Z" fill="#fff" /></svg>
          Continue with Spotify
        </button>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 text-[11px] text-white/45">
        {/* Apple is not yet enabled (no OAuth credentials configured) — kept alongside
            the other "soon" providers, matching app/login/LoginContent.tsx. */}
        <button
          type="button"
          onClick={() => {
            void handleProviderClick("apple")
          }}
          disabled={loadingProvider !== null}
          className={`rounded-xl border border-white/10 bg-black/10 px-3 py-2 hover:bg-white/5 hover:text-white/60 transition ${
            loadingProvider !== null ? "opacity-70" : ""
          }`}
        >
          {loadingProvider === "apple" ? "Opening..." : "Apple (soon)"}
        </button>
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
          {loadingProvider === "facebook" ? "Opening..." : "Facebook (soon)"}
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
          {loadingProvider === "instagram" ? "Opening..." : "Instagram (soon)"}
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
          {loadingProvider === "x" ? "Opening..." : "X / Twitter (soon)"}
        </button>
        <button
          type="button"
          onClick={() => {
            void handleProviderClick("tiktok")
          }}
          disabled={loadingProvider !== null}
          className={`rounded-xl border border-white/10 bg-black/10 px-3 py-2 hover:bg-white/5 hover:text-white/60 transition sm:col-span-2 ${
            loadingProvider !== null ? "opacity-70" : ""
          }`}
        >
          {loadingProvider === "tiktok" ? "Opening..." : "TikTok (soon)"}
        </button>
      </div>
    </div>
  )
}
