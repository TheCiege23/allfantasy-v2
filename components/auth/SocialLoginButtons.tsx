"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"

const enableGoogle = process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH === "true"
const enableApple = process.env.NEXT_PUBLIC_ENABLE_APPLE_AUTH === "true"

export default function SocialLoginButtons({ callbackUrl }: { callbackUrl: string }) {
  const [providerMessage, setProviderMessage] = useState<string | null>(null)

  function handleProviderClick(provider: "google" | "apple" | "facebook" | "instagram" | "x" | "tiktok") {
    if (provider === "google" && enableGoogle) {
      signIn("google", { callbackUrl })
      return
    }
    if (provider === "apple" && enableApple) {
      signIn("apple", { callbackUrl })
      return
    }
    const messages: Record<string, string> = {
      google: "Google sign-in is not configured for this environment. It will appear here when enabled.",
      apple: "Apple sign-in is not configured for this environment. It will appear here when enabled.",
      facebook: "Facebook sign-in is planned. Follow updates for when it’s available.",
      instagram: "Instagram sign-in is planned. Follow updates for when it’s available.",
      x: "X (Twitter) sign-in is planned. Follow updates for when it’s available.",
      tiktok: "TikTok sign-in is planned. Follow updates for when it’s available.",
    }
    setProviderMessage(messages[provider] ?? "This sign-in option is coming soon.")
  }

  return (
    <div className="space-y-2">
      {providerMessage && (
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-200">
          {providerMessage}
        </div>
      )}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => handleProviderClick("google")}
          className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
            enableGoogle
              ? "border-white/15 bg-white/[0.03] text-white/80 hover:bg-white/10"
              : "border-white/10 bg-black/20 text-white/50 hover:text-white/70 hover:bg-white/5"
          }`}
        >
          {enableGoogle ? "Continue with Google" : "Google (connect coming soon)"}
        </button>
        <button
          type="button"
          onClick={() => handleProviderClick("apple")}
          className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
            enableApple
              ? "border-white/15 bg-white/[0.03] text-white/80 hover:bg-white/10"
              : "border-white/10 bg-black/20 text-white/50 hover:text-white/70 hover:bg-white/5"
          }`}
        >
          {enableApple ? "Continue with Apple" : "Apple (connect coming soon)"}
        </button>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 text-[11px] text-white/45">
        <button
          type="button"
          onClick={() => handleProviderClick("facebook")}
          className="rounded-xl border border-white/10 bg-black/10 px-3 py-2 hover:bg-white/5 hover:text-white/60 transition"
        >
          Facebook (planned)
        </button>
        <button
          type="button"
          onClick={() => handleProviderClick("instagram")}
          className="rounded-xl border border-white/10 bg-black/10 px-3 py-2 hover:bg-white/5 hover:text-white/60 transition"
        >
          Instagram (planned)
        </button>
        <button
          type="button"
          onClick={() => handleProviderClick("x")}
          className="rounded-xl border border-white/10 bg-black/10 px-3 py-2 hover:bg-white/5 hover:text-white/60 transition"
        >
          X / Twitter (planned)
        </button>
        <button
          type="button"
          onClick={() => handleProviderClick("tiktok")}
          className="rounded-xl border border-white/10 bg-black/10 px-3 py-2 hover:bg-white/5 hover:text-white/60 transition sm:col-span-3"
        >
          TikTok (planned)
        </button>
      </div>
    </div>
  )
}
