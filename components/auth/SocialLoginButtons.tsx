"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { signIn } from "next-auth/react"
import {
  type SocialProvider,
  isSocialProviderEnabled,
} from "@/lib/auth/SocialProviderResolver"
import { buildProviderPendingHref } from "@/lib/auth/ProviderPendingFlow"
import { buildSupabaseOAuthRedirectTo } from "@/lib/auth/SupabaseOAuthService"
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient"

export default function SocialLoginButtons({ callbackUrl }: { callbackUrl: string }) {
  const router = useRouter()
  const [loadingProvider, setLoadingProvider] = useState<SocialProvider | null>(null)

  useEffect(() => {
    const syncProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      await supabase.from("profiles").upsert({
        id: user.id,
        email: user.email,
        avatar_url:
          typeof user.user_metadata?.avatar_url === "string"
            ? user.user_metadata.avatar_url
            : null,
      })
    }

    void syncProfile()
  }, [])

  const signInWithGoogleOAuth = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: buildSupabaseOAuthRedirectTo({ callbackUrl }) ?? undefined,
      },
    })
  }

  const signInWithAppleOAuth = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: {
        redirectTo: buildSupabaseOAuthRedirectTo({ callbackUrl }) ?? undefined,
      },
    })
  }

  const signInWithGoogle = () => {
    void handleProviderClick("google")
  }

  const signInWithApple = () => {
    void handleProviderClick("apple")
  }

  async function handleProviderClick(provider: SocialProvider) {
    if (loadingProvider) return
    setLoadingProvider(provider)
    const googleEnabled = isSocialProviderEnabled("google")
    const appleEnabled = isSocialProviderEnabled("apple")

    try {
      if (provider === "google" && googleEnabled) {
        await signIn(provider, { callbackUrl })
        return
      }

      if (provider === "apple" && appleEnabled) {
        await signIn(provider, { callbackUrl })
        return
      }

      if (provider === "google" && isSupabaseConfigured) {
        await signInWithGoogleOAuth()
        return
      }

      if (provider === "apple" && isSupabaseConfigured) {
        await signInWithAppleOAuth()
        return
      }

      if (
        isSocialProviderEnabled(provider)
      ) {
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
          className={`w-full bg-white text-black py-2 rounded-lg mb-3 ${loadingProvider !== null ? "opacity-70" : ""}`}
        >
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
