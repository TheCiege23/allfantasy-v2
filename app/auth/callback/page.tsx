"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useMemo, useRef, useState } from "react"
import { Loader2, TriangleAlert, ArrowRight } from "lucide-react"
import { loginUrlWithIntent, safeRedirectPath } from "@/lib/auth/auth-intent-resolver"
import { resolveSocialOAuthErrorMessage } from "@/lib/auth/AuthErrorMessageResolver"
import { AuthStatusHeader, AuthStatusLoadingFallback, AuthStatusShell } from "@/components/auth/AuthStatusShell"
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient"

function OAuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const startedRef = useRef(false)
  const [error, setError] = useState<string | null>(null)

  const nextParam = searchParams?.get("next") ?? null
  const code = searchParams?.get("code") ?? null
  const providerError =
    searchParams?.get("error_description") ??
    searchParams?.get("error") ??
    null
  const nextPath = useMemo(() => safeRedirectPath(nextParam), [nextParam])

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    async function completeOAuthSignIn() {
      if (!isSupabaseConfigured) {
        setError(resolveSocialOAuthErrorMessage("SUPABASE_NOT_CONFIGURED"))
        return
      }

      if (providerError) {
        setError(resolveSocialOAuthErrorMessage(providerError))
        return
      }

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(
          code
        )
        if (exchangeError) {
          setError(
            resolveSocialOAuthErrorMessage(
              exchangeError.message || "Could not complete social sign-in."
            )
          )
          return
        }
      } else {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (!session) {
          setError(resolveSocialOAuthErrorMessage("Missing OAuth callback code."))
          return
        }
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        await supabase.from("profiles").upsert({
          id: user.id,
          email: user.email,
          avatar_url:
            typeof user.user_metadata?.avatar_url === "string"
              ? user.user_metadata.avatar_url
              : null,
        })
      }

      router.replace(nextPath)
    }

    void completeOAuthSignIn()
  }, [code, nextPath, providerError, router])

  if (error) {
    return (
      <AuthStatusShell>
        <div className="w-full max-w-[440px]">
          <AuthStatusHeader
            title="Social sign-in issue"
            subtitle="We couldn't finish your sign-in. You can try again or head back home."
          />
          <div className="rounded-[18px] border border-red-500/20 bg-[#16102a] p-8 text-center shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10">
              <TriangleAlert className="h-7 w-7 text-red-400" />
            </div>
            <h1 className="mt-5 text-2xl font-semibold text-white">Social sign-in failed</h1>
            <p className="mt-3 text-sm leading-6 text-white/60">{error}</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href={loginUrlWithIntent(nextPath)}
                className="flex flex-1 items-center justify-center gap-2 rounded-[11px] bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:opacity-90"
              >
                <span>Try Again</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/"
                className="flex flex-1 items-center justify-center rounded-[11px] border border-violet-400/30 bg-[#1c1535] px-4 py-3 text-sm font-medium text-white/75 transition hover:border-violet-300/45 hover:bg-[#211a3e] hover:text-white"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </AuthStatusShell>
    )
  }

  return (
    <AuthStatusShell>
      <div className="w-full max-w-[440px]">
        <AuthStatusHeader
          title="Completing sign-in"
          subtitle="Finalizing your social login and sending you back to AllFantasy."
        />
        <div className="rounded-[18px] border border-violet-400/20 bg-[#16102a] p-8 text-center shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10">
            <Loader2 className="h-7 w-7 animate-spin text-cyan-300" />
          </div>
          <h1 className="mt-5 text-2xl font-semibold text-white">Completing sign-in</h1>
          <p className="mt-3 text-sm leading-6 text-white/60">
            Finishing your social sign-in and sending you back now.
          </p>
        </div>
      </div>
    </AuthStatusShell>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<AuthStatusLoadingFallback />}>
      <OAuthCallbackContent />
    </Suspense>
  )
}
