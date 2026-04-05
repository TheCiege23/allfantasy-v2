"use client"

import Link from "next/link"
import { useState, Suspense, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { signIn } from "next-auth/react"
import { ArrowLeft, ArrowRight, Loader2, Eye, EyeOff, CheckCircle2, TriangleAlert } from "lucide-react"
import { AuthStatusHeader, AuthStatusLoadingFallback, AuthStatusShell } from "@/components/auth/AuthStatusShell"
import { clearUnifiedAuthDestination } from "@/lib/auth/UnifiedAuthOrchestrator"
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient"

type AuthMode = "checking" | "token" | "supabase" | "none"

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams?.get("token") || ""
  const requestedReturnTo = searchParams?.get("returnTo") || ""
  const safeReturnTo = requestedReturnTo.startsWith("/") ? requestedReturnTo : "/dashboard"
  const loginHref = `/login?callbackUrl=${encodeURIComponent(safeReturnTo)}`

  const [authMode, setAuthMode] = useState<AuthMode>("checking")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (token) {
      setAuthMode("token")
      return
    }
    if (!isSupabaseConfigured) {
      setAuthMode("none")
      return
    }
    let cancelled = false
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return
      if (session?.user) setAuthMode("supabase")
      else setAuthMode("none")
    })
    return () => {
      cancelled = true
    }
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }

    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      setError("Password must include at least one letter and one number.")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    setLoading(true)
    try {
      if (authMode === "supabase") {
        const { error: updateErr } = await supabase.auth.updateUser({ password })
        if (updateErr) {
          setError(updateErr.message || "Could not update password.")
          return
        }

        const {
          data: { session },
        } = await supabase.auth.getSession()
        const email = session?.user?.email?.trim() ?? ""
        const accessToken = session?.access_token

        if (accessToken) {
          try {
            await fetch("/api/auth/password/sync-neon", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify({ newPassword: password }),
            })
          } catch {
            // Neon sync is best-effort; NextAuth still needs the hash for credentials sign-in.
          }
        }

        await supabase.auth.signOut().catch(() => {})

        if (email) {
          const signInResult = await signIn("credentials", {
            login: email,
            password,
            redirect: false,
            callbackUrl: safeReturnTo,
          })
          if (!signInResult?.error) {
            clearUnifiedAuthDestination()
            router.replace(safeReturnTo)
            return
          }
        }

        setSuccess(true)
        setTimeout(() => {
          window.location.href = `${loginHref}&reset=success`
        }, 2000)
        return
      }

      const res = await fetch("/api/auth/password/reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      })

      const data = await res.json()

      if (!res.ok) {
        const errorMap: Record<string, string> = {
          MISSING_FIELDS: "Token and new password are required.",
          WEAK_PASSWORD: "Password must be at least 8 characters with a letter and number.",
          INVALID_OR_USED_TOKEN: "This reset link is invalid or has already been used.",
          EXPIRED_TOKEN: "This reset link has expired. Please request a new one.",
          RESET_FAILED: "Something went wrong saving your password. Please try again.",
        }
        setError(errorMap[data.error] || data.error || "Something went wrong.")
        return
      }

      setSuccess(true)
      setTimeout(() => {
        window.location.href = `${loginHref}&reset=success`
      }, 2000)
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (authMode === "checking") {
    return (
      <AuthStatusShell>
        <div className="w-full max-w-[440px]">
          <AuthStatusHeader title="Loading" subtitle="Checking your reset session…" />
          <div className="flex justify-center rounded-[18px] border border-violet-400/20 bg-[#16102a] p-12">
            <Loader2 className="h-10 w-10 animate-spin text-cyan-400" />
          </div>
        </div>
      </AuthStatusShell>
    )
  }

  if (authMode === "none" && !token) {
    return (
      <AuthStatusShell>
        <div className="w-full max-w-[440px]">
          <AuthStatusHeader
            title="Invalid reset link"
            subtitle="Open the link from your password reset email, or request a new one."
          />
          <div className="rounded-[18px] border border-red-500/20 bg-[#16102a] p-8 text-center shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10">
              <TriangleAlert className="h-7 w-7 text-amber-400" />
            </div>
            <h1 className="mt-5 text-2xl font-semibold text-white">Session required</h1>
            <p className="mt-3 text-sm leading-6 text-white/60">
              We couldn&apos;t verify a password reset session. Use the link from your email, or request a new reset.
            </p>
            <Link
              href="/forgot-password"
              className="mt-7 inline-flex items-center justify-center gap-2 rounded-[11px] bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:opacity-90"
            >
              <span>Request reset</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </AuthStatusShell>
    )
  }

  if (success) {
    return (
      <AuthStatusShell>
        <div className="w-full max-w-[440px]">
          <AuthStatusHeader
            title="Password reset"
            subtitle="Your password was updated successfully."
          />
          <div className="rounded-[18px] border border-violet-400/20 bg-[#16102a] p-8 text-center shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10">
              <CheckCircle2 className="h-7 w-7 text-emerald-400" />
            </div>
            <h1 className="mt-5 text-2xl font-semibold text-white">Password reset</h1>
            <p className="mt-3 text-sm leading-6 text-white/60">
              Your password has been updated. Redirecting to sign in...
            </p>
            <Link
              href={loginHref}
              className="mt-7 inline-flex items-center justify-center gap-2 rounded-[11px] bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:opacity-90"
            >
              <span>Sign In</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </AuthStatusShell>
    )
  }

  return (
    <AuthStatusShell>
      <div className="w-full max-w-[440px]">
        <Link
          href={loginHref}
          className="mb-6 inline-flex items-center gap-2 rounded-[10px] border border-violet-400/30 bg-[#1c1535] px-4 py-2.5 text-sm font-medium text-white/75 transition hover:border-violet-300/45 hover:bg-[#211a3e] hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Sign In</span>
        </Link>

        <AuthStatusHeader
          title="Set new password"
          subtitle={
            authMode === "supabase"
              ? "Choose a new password for your AllFantasy account (verified via email link)."
              : "Choose a strong new password for your AllFantasy account."
          }
        />

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
            <div className="flex items-start gap-2">
              <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />
              <div>{error}</div>
            </div>
          </div>
        )}

        <div className="rounded-[18px] border border-violet-400/20 bg-[#16102a] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[13px] font-semibold tracking-[0.02em] text-white/60">New password</label>
              <div className="relative mt-1.5">
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  className="w-full rounded-[10px] border border-violet-400/30 bg-[#1c1535] px-3.5 py-3 pr-11 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/10"
                  placeholder="At least 8 characters"
                  disabled={loading}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/35 transition hover:text-cyan-200"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-[13px] font-semibold tracking-[0.02em] text-white/60">Confirm password</label>
              <input
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                type="password"
                autoComplete="new-password"
                className="mt-1.5 w-full rounded-[10px] border border-violet-400/30 bg-[#1c1535] px-3.5 py-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/10"
                placeholder="Confirm your new password"
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !password || !confirmPassword}
              className="flex w-full items-center justify-center gap-2 rounded-[11px] bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Resetting...
                </>
              ) : (
                <>
                  <span>Reset Password</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </AuthStatusShell>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<AuthStatusLoadingFallback />}>
      <ResetPasswordContent />
    </Suspense>
  )
}
