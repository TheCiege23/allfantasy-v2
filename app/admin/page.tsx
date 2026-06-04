import { redirect } from "next/navigation"
import { getAdminAccessState } from "@/lib/adminAuth"
import {
  getAdminCommandCenterMetrics,
  type AdminMetric,
} from "@/lib/admin-dashboard/AdminCommandCenterService"
import type {
  AdminProviderHealthRow,
  AdminProviderHealthStatus,
} from "@/lib/admin-dashboard/AdminProviderHealthService"

export const dynamic = "force-dynamic"

function MetricCard({ item }: { item: AdminMetric }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4 shadow-[0_18px_60px_-46px_rgba(34,211,238,0.75)]">
      <div className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-100/55">
        {item.label}
      </div>
      <div className={item.tracked ? "mt-2 text-2xl font-black text-white" : "mt-2 text-sm font-bold text-amber-100"}>
        {item.value}
      </div>
      {item.note ? <div className="mt-1 text-xs text-white/45">{item.note}</div> : null}
    </div>
  )
}

function Section({ title, items }: { title: string; items: AdminMetric[] }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-black uppercase tracking-[0.18em] text-cyan-100/80">{title}</h2>
        <span className="h-px flex-1 bg-gradient-to-r from-cyan-300/25 to-transparent" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <MetricCard key={`${title}-${item.label}`} item={item} />
        ))}
      </div>
    </section>
  )
}

function formatDate(value: string | null) {
  if (!value) return "Not set"
  return new Date(value).toLocaleString("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function providerStatusLabel(status: AdminProviderHealthStatus) {
  switch (status) {
    case "configured":
      return "Configured"
    case "missing_env":
      return "Missing env"
    case "configured_failing":
      return "Configured failing"
    case "scaffold_only":
      return "Scaffold only"
    case "not_production_ready":
      return "Not production ready"
    case "disabled":
      return "Disabled"
    case "public_fallback":
      return "Public fallback"
    default:
      return "Unknown"
  }
}

function providerStatusClass(status: AdminProviderHealthStatus) {
  if (status === "configured") return "border-emerald-300/35 bg-emerald-300/10 text-emerald-100"
  if (status === "public_fallback") return "border-cyan-300/35 bg-cyan-300/10 text-cyan-100"
  if (status === "scaffold_only" || status === "not_production_ready") {
    return "border-amber-300/35 bg-amber-300/10 text-amber-100"
  }
  if (status === "missing_env" || status === "configured_failing") {
    return "border-rose-300/35 bg-rose-300/10 text-rose-100"
  }
  return "border-white/15 bg-white/[0.06] text-white/70"
}

function joinList(values: string[], fallback = "Not tracked yet") {
  return values.length > 0 ? values.join(", ") : fallback
}

function ProviderHealthPanel({ rows }: { rows: AdminProviderHealthRow[] }) {
  return (
    <section className="rounded-3xl border border-cyan-300/15 bg-white/[0.04] p-4 shadow-[0_24px_80px_-54px_rgba(34,211,238,0.75)] sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-sm font-black uppercase tracking-[0.18em] text-cyan-100/80">
            Provider Health & Cost Guards
          </h2>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-white/48">
            Env readiness, stored data, request telemetry, sync state, and call-limit protection. This view does not call paid providers.
          </p>
        </div>
        <span className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.08] px-3 py-2 text-xs font-black text-amber-100">
          {rows.length} providers
        </span>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[1180px] text-left text-xs">
          <thead className="text-[10px] uppercase tracking-[0.16em] text-white/42">
            <tr>
              <th className="py-2 pr-3">Provider</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 pr-3">Data / Consumers</th>
              <th className="py-2 pr-3">Storage</th>
              <th className="py-2 pr-3">Requests</th>
              <th className="py-2 pr-3">Sync</th>
              <th className="py-2 pr-3">Cost Protection</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {rows.map((row) => (
              <tr key={row.id} className="align-top text-white/70">
                <td className="max-w-[210px] py-4 pr-3">
                  <div className="font-black text-white">{row.name}</div>
                  <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-cyan-100/45">
                    {row.category}
                  </div>
                  <div className="mt-2 text-[11px] text-white/38">
                    Env: {joinList(row.envVars, "No env required")}
                  </div>
                </td>
                <td className="py-4 pr-3">
                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black ${providerStatusClass(row.status)}`}>
                    {providerStatusLabel(row.status)}
                  </span>
                  <div className="mt-2 max-w-[210px] text-[11px] leading-4 text-white/45">
                    {row.note}
                  </div>
                </td>
                <td className="max-w-[240px] py-4 pr-3">
                  <div className="font-bold text-white/80">{joinList(row.dataCategories)}</div>
                  <div className="mt-2 text-[11px] text-white/45">Used by: {joinList(row.consumedBy)}</div>
                </td>
                <td className="max-w-[210px] py-4 pr-3">
                  <div className="font-bold text-white/75">{joinList(row.storage)}</div>
                  <div className="mt-2 text-[11px] text-white/45">
                    Imported rows: {row.importedRows ?? "Not tracked yet"}
                  </div>
                </td>
                <td className="py-4 pr-3">
                  <div className="font-black text-white">{row.requestCount24h ?? 0} / 24h</div>
                  <div className="mt-1 text-[11px] text-white/45">
                    Avg latency: {row.avgLatencyMs24h == null ? "Not tracked" : `${row.avgLatencyMs24h}ms`}
                  </div>
                  <div className="mt-1 text-[11px] text-white/45">{row.rateLimit}</div>
                </td>
                <td className="max-w-[180px] py-4 pr-3">
                  <div className="font-bold text-white/75">{formatDate(row.lastSyncAt)}</div>
                  {row.lastError ? (
                    <div className="mt-2 rounded-xl border border-rose-300/25 bg-rose-300/10 p-2 text-[11px] text-rose-100">
                      {row.lastError}
                    </div>
                  ) : (
                    <div className="mt-2 text-[11px] text-white/40">No recent stored error</div>
                  )}
                </td>
                <td className="max-w-[240px] py-4 pr-3">
                  <div className="text-[11px] leading-5 text-white/55">{joinList(row.costProtection)}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function AdminAccessDenied() {
  return (
    <main className="min-h-dvh bg-[#020817] px-4 py-8 text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(34,211,238,0.20),transparent_34%),radial-gradient(circle_at_85%_8%,rgba(251,191,36,0.14),transparent_30%),linear-gradient(180deg,#020817_0%,#06111f_48%,#020817_100%)]" />
      <section className="relative mx-auto max-w-xl rounded-3xl border border-amber-300/20 bg-black/45 p-6 shadow-[0_28px_90px_-54px_rgba(251,191,36,0.75)] backdrop-blur-xl sm:p-8">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-200">
          Admin Access
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-white">
          Access denied
        </h1>
        <p className="mt-3 text-sm leading-6 text-white/62">
          You are signed in, but this account is not on the AllFantasy admin allowlist.
          Ask an existing admin to add your email to `ADMIN_EMAILS`, or use the bootstrap recovery path if you are the founder.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href="/dashboard"
            className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-black text-white hover:border-cyan-300/45"
          >
            Back to dashboard
          </a>
          <a
            href="/admin/bootstrap"
            className="rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-black text-slate-950 hover:bg-cyan-200"
          >
            Admin recovery
          </a>
        </div>
      </section>
    </main>
  )
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: { q?: string | string[] }
}) {
  const gate = await getAdminAccessState()
  if (gate.status === "unauthenticated") {
    redirect("/admin-login?next=/admin")
  }
  if (gate.status === "forbidden") {
    return <AdminAccessDenied />
  }

  const q = Array.isArray(searchParams?.q) ? searchParams?.q[0] ?? "" : searchParams?.q ?? ""
  const data = await getAdminCommandCenterMetrics(q)

  return (
    <main className="min-h-dvh bg-[#020817] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(34,211,238,0.20),transparent_34%),radial-gradient(circle_at_85%_8%,rgba(251,191,36,0.14),transparent_30%),linear-gradient(180deg,#020817_0%,#06111f_46%,#020817_100%)]" />
      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <header className="rounded-3xl border border-cyan-300/15 bg-black/35 p-5 shadow-[0_28px_90px_-54px_rgba(34,211,238,0.85)] backdrop-blur-xl sm:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-200">AllFantasy Admin</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-5xl">
                Command Center
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/62">
                Production metrics from existing AllFantasy tables. Unavailable metrics are labeled instead of estimated.
              </p>
            </div>
            <div className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.08] px-4 py-3 text-sm font-bold text-amber-100">
              Generated {new Date(data.generatedAt).toLocaleString("en-US", { timeZone: "America/New_York" })}
            </div>
          </div>
        </header>

        <Section title="Users" items={data.users} />
        <Section title="Payments & Subscriptions" items={data.subscriptions} />
        <Section title="Tokens & AI" items={[...data.tokens, ...data.ai]} />
        <Section title="World Cup" items={data.worldCup} />
        <Section title="System Health" items={data.health} />
        <ProviderHealthPanel rows={data.providerHealth ?? []} />

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.75fr)]">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-[0_20px_70px_-52px_rgba(34,211,238,0.7)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-black uppercase tracking-[0.18em] text-cyan-100/80">User Search</h2>
                <p className="mt-1 text-xs text-white/45">Masked email, subscription, token balance, and World Cup activity.</p>
              </div>
              <form action="/admin" className="flex min-w-0 gap-2">
                <input
                  name="q"
                  defaultValue={q}
                  placeholder="Search username or email"
                  className="min-h-11 min-w-0 rounded-2xl border border-white/10 bg-black/35 px-4 text-sm font-semibold text-white outline-none placeholder:text-white/35 focus:border-cyan-300/60"
                />
                <button className="min-h-11 rounded-2xl bg-cyan-300 px-4 text-sm font-black text-black">
                  Search
                </button>
              </form>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="text-[11px] uppercase tracking-[0.16em] text-white/45">
                  <tr>
                    <th className="py-2">User</th>
                    <th className="py-2">Email</th>
                    <th className="py-2">Sub</th>
                    <th className="py-2">Tokens</th>
                    <th className="py-2">WC Entries</th>
                    <th className="py-2">WC Pools</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {data.usersSearch.length > 0 ? (
                    data.usersSearch.map((user) => (
                      <tr key={user.id} className="text-white/76">
                        <td className="py-3">
                          <div className="font-black text-white">@{user.username}</div>
                          {user.displayName && user.displayName !== user.username ? (
                            <div className="text-xs text-white/40">{user.displayName}</div>
                          ) : null}
                        </td>
                        <td className="py-3">{user.emailMasked}</td>
                        <td className="py-3">{user.subscriptionStatus}</td>
                        <td className="py-3">{user.tokenBalance ?? "Not tracked"}</td>
                        <td className="py-3">{user.worldCupEntries}</td>
                        <td className="py-3">{user.worldCupPoolsCreated}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="py-5 text-white/45" colSpan={6}>
                        Enter at least two characters to search users.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-[0_20px_70px_-52px_rgba(251,191,36,0.55)]">
            <h2 className="text-sm font-black uppercase tracking-[0.18em] text-amber-100/80">Most Active World Cup Pools</h2>
            <div className="mt-4 space-y-3">
              {data.activeWorldCupPools.length > 0 ? (
                data.activeWorldCupPools.map((pool) => (
                  <div key={pool.id} className="rounded-2xl border border-white/10 bg-black/25 p-3">
                    <div className="font-black text-white">{pool.name}</div>
                    <div className="mt-1 text-xs text-white/45">Owner @{pool.ownerUsername ?? "unknown"}</div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs font-bold text-white/70">
                      <span className="rounded-xl bg-white/[0.06] px-2 py-2">{pool.entries} entries</span>
                      <span className="rounded-xl bg-white/[0.06] px-2 py-2">{pool.participants} players</span>
                      <span className="rounded-xl bg-white/[0.06] px-2 py-2">{pool.chatEvents} chat</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl border border-white/10 bg-black/25 p-4 text-sm text-white/50">
                  No World Cup pool activity recorded yet.
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-[0_20px_70px_-52px_rgba(34,211,238,0.7)]">
            <h2 className="text-sm font-black uppercase tracking-[0.18em] text-cyan-100/80">Recent Users</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="text-[11px] uppercase tracking-[0.16em] text-white/45">
                  <tr>
                    <th className="py-2">User</th>
                    <th className="py-2">Email</th>
                    <th className="py-2">Sub</th>
                    <th className="py-2">Tokens</th>
                    <th className="py-2">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {data.recentUsers.map((user) => (
                    <tr key={user.id} className="text-white/76">
                      <td className="py-3 font-black text-white">@{user.username}</td>
                      <td className="py-3">{user.emailMasked}</td>
                      <td className="py-3">{user.subscriptionStatus}</td>
                      <td className="py-3">{user.tokenBalance ?? "Not tracked"}</td>
                      <td className="py-3">{formatDate(user.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-[0_20px_70px_-52px_rgba(251,191,36,0.55)]">
            <h2 className="text-sm font-black uppercase tracking-[0.18em] text-amber-100/80">Recent Subscriptions</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="text-[11px] uppercase tracking-[0.16em] text-white/45">
                  <tr>
                    <th className="py-2">User</th>
                    <th className="py-2">Plan</th>
                    <th className="py-2">Status</th>
                    <th className="py-2">SKU</th>
                    <th className="py-2">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {data.recentSubscriptions.length > 0 ? (
                    data.recentSubscriptions.map((sub) => (
                      <tr key={sub.id} className="text-white/76">
                        <td className="py-3">
                          <div className="font-black text-white">@{sub.username}</div>
                          <div className="text-xs text-white/40">{sub.emailMasked}</div>
                        </td>
                        <td className="py-3">{sub.plan}</td>
                        <td className="py-3">{sub.status}</td>
                        <td className="py-3">{sub.sku ?? "Not set"}</td>
                        <td className="py-3">{formatDate(sub.updatedAt)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="py-5 text-white/45" colSpan={5}>
                        No subscription rows recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-[0_20px_70px_-52px_rgba(34,211,238,0.7)]">
            <h2 className="text-sm font-black uppercase tracking-[0.18em] text-cyan-100/80">Recent Payments</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="text-[11px] uppercase tracking-[0.16em] text-white/45">
                  <tr>
                    <th className="py-2">User</th>
                    <th className="py-2">Type</th>
                    <th className="py-2">Status</th>
                    <th className="py-2">Amount</th>
                    <th className="py-2">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {data.recentPayments.length > 0 ? (
                    data.recentPayments.map((payment) => (
                      <tr key={payment.id} className="text-white/76">
                        <td className="py-3">
                          <div className="font-black text-white">@{payment.username}</div>
                          <div className="text-xs text-white/40">{payment.emailMasked}</div>
                        </td>
                        <td className="py-3">{payment.paymentType}</td>
                        <td className="py-3">{payment.status}</td>
                        <td className="py-3 text-amber-100">{payment.amount}</td>
                        <td className="py-3">{formatDate(payment.createdAt)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="py-5 text-white/45" colSpan={5}>
                        No payment rows recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-[0_20px_70px_-52px_rgba(34,211,238,0.7)]">
            <h2 className="text-sm font-black uppercase tracking-[0.18em] text-cyan-100/80">Recent Token Activity</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="text-[11px] uppercase tracking-[0.16em] text-white/45">
                  <tr>
                    <th className="py-2">User</th>
                    <th className="py-2">Type</th>
                    <th className="py-2">Delta</th>
                    <th className="py-2">Balance</th>
                    <th className="py-2">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {data.recentTokenActivity.length > 0 ? (
                    data.recentTokenActivity.map((entry) => (
                      <tr key={entry.id} className="text-white/76">
                        <td className="py-3">
                          <div className="font-black text-white">@{entry.username}</div>
                          <div className="text-xs text-white/40">{entry.emailMasked}</div>
                        </td>
                        <td className="py-3">{entry.entryType}</td>
                        <td className={entry.tokenDelta >= 0 ? "py-3 text-emerald-200" : "py-3 text-amber-100"}>
                          {entry.tokenDelta}
                        </td>
                        <td className="py-3">{entry.balanceAfter}</td>
                        <td className="py-3">{formatDate(entry.createdAt)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="py-5 text-white/45" colSpan={5}>
                        No token ledger rows recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
