"use client"

import Link from "next/link"
import { useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { ArrowLeft, ArrowRight, Loader2, Eye, EyeOff, CheckCircle2, TriangleAlert } from "lucide-react"
import { AuthStatusHeader, AuthStatusLoadingFallback, AuthStatusShell } from "@/components/auth/AuthStatusShell"

function ResetPasswordContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams?.get("token") || ""
  const requestedReturnTo = searchParams?.get("returnTo") || ""
  const safeReturnTo = requestedReturnTo.startsWith("/") ? requestedReturnTo : "/dashboard"
  const loginHref = `/login?callbackUrl=${encodeURIComponent(safeReturnTo)}`

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

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
      } else {
        setSuccess(true)
        setTimeout(() => {
          window.location.href = `${loginHref}&reset=1`
        }, 2000)
      }
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <AuthStatusShell>
        <div className="w-full max-w-[440px]">
          <AuthStatusHeader
            title="Invalid reset link"
            subtitle="This password reset link is missing or no longer valid."
          />
          <div className="rounded-[18px] border border-red-500/20 bg-[#16102a] p-8 text-center shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10">
              <TriangleAlert className="h-7 w-7 text-amber-400" />
            </div>
            <h1 className="mt-5 text-2xl font-semibold text-white">Invalid reset link</h1>
            <p className="mt-3 text-sm leading-6 text-white/60">
              This password reset link is missing or invalid.
            </p>
            <Link
              href="/forgot-password"
              className="mt-7 inline-flex items-center justify-center gap-2 rounded-[11px] bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:opacity-90"
            >
              <span>Request new reset link</span>
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
          subtitle="Choose a strong new password for your AllFantasy account."
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

