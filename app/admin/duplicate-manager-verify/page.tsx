import { redirect } from "next/navigation"
import { getAdminAccessState } from "@/lib/adminAuth"
import DuplicateManagerVerifyClient from "./DuplicateManagerVerifyClient"

export const dynamic = "force-dynamic"

export default async function DuplicateManagerVerifyPage() {
  const state = await getAdminAccessState()
  if (state.status !== "admin") {
    redirect("/admin")
  }

  return (
    <main className="min-h-dvh bg-[#020817] px-4 py-8 text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(34,211,238,0.20),transparent_34%),radial-gradient(circle_at_85%_8%,rgba(251,191,36,0.14),transparent_30%),linear-gradient(180deg,#020817_0%,#06111f_48%,#020817_100%)]" />
      <div className="relative mx-auto max-w-4xl">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-200">Duplicate-Manager Fraud Hardening</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
          League join &amp; duplicate-manager verification
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/62">
          Runs the real league-join and duplicate-manager code paths against isolated, clearly-marked test
          data — never real leagues or users — then deletes everything it created. Use this instead of writing
          a one-off script whenever this flow needs to be re-verified.
        </p>

        <DuplicateManagerVerifyClient />
      </div>
    </main>
  )
}
