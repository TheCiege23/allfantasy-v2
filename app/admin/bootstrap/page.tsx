import AdminBootstrapClient from "./AdminBootstrapClient"

export const dynamic = "force-dynamic"

function configState() {
  const enabled = process.env.ADMIN_BOOTSTRAP_ENABLED === "true"
  const hasEmail = Boolean(process.env.ADMIN_BOOTSTRAP_EMAIL?.includes("@"))
  const hasPassword = String(process.env.ADMIN_BOOTSTRAP_PASSWORD ?? "").length >= 12
  const hasSessionSecret = Boolean(process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD)
  return { enabled, configured: enabled && hasEmail && hasPassword && hasSessionSecret }
}

export default function AdminBootstrapPage() {
  const state = configState()

  return (
    <main className="min-h-dvh bg-[#020817] px-4 py-8 text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(34,211,238,0.20),transparent_34%),radial-gradient(circle_at_85%_8%,rgba(251,191,36,0.14),transparent_30%),linear-gradient(180deg,#020817_0%,#06111f_48%,#020817_100%)]" />
      <section className="relative mx-auto max-w-xl rounded-3xl border border-cyan-300/15 bg-black/45 p-6 shadow-[0_28px_90px_-54px_rgba(34,211,238,0.85)] backdrop-blur-xl sm:p-8">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-200">
          AllFantasy Admin Recovery
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-white">
          Bootstrap admin access
        </h1>
        <p className="mt-3 text-sm leading-6 text-white/62">
          This recovery path only works when the explicit Vercel bootstrap env vars are enabled.
          Disable it immediately after confirming `/admin` access.
        </p>

        {!state.enabled ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.05] p-4 text-sm font-bold text-white/70">
            Bootstrap is disabled. Set `ADMIN_BOOTSTRAP_ENABLED=true` in Vercel only when recovering access.
          </div>
        ) : !state.configured ? (
          <div className="mt-6 rounded-2xl border border-amber-300/25 bg-amber-300/[0.08] p-4 text-sm font-bold text-amber-100">
            Bootstrap is enabled but not configured safely. Check `ADMIN_BOOTSTRAP_EMAIL`,
            `ADMIN_BOOTSTRAP_PASSWORD`, and `ADMIN_SESSION_SECRET`.
          </div>
        ) : (
          <AdminBootstrapClient />
        )}

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-xs leading-5 text-white/50">
          Durable admin access requires the same email in `ADMIN_EMAILS`. Bootstrap creates a signed
          temporary admin session and verifies or creates the account; it does not publish any default credentials.
        </div>
      </section>
    </main>
  )
}
