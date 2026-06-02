import { redirect } from "next/navigation"
import { requireAdmin } from "@/lib/adminAuth"
import {
  getAdminCommandCenterMetrics,
  type AdminMetric,
} from "@/lib/admin-dashboard/AdminCommandCenterService"

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

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: { q?: string | string[] }
}) {
  const gate = await requireAdmin()
  if (!gate.ok) {
    redirect("/admin-login?next=/admin")
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
      </div>
    </main>
  )
}
