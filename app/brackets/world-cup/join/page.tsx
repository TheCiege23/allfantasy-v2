import WorldCupInviteJoinPanel from "@/components/brackets/world-cup/WorldCupInviteJoinPanel"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default function WorldCupJoinWithCodePage() {
  return (
    <main className="min-h-screen bg-[#05070b] text-white">
      <div className="mx-auto max-w-lg px-4 py-10">
        <Link
          href="/brackets/world-cup"
          className="mb-6 inline-block rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-white/60 hover:text-white"
        >
          ← World Cup hub
        </Link>
        <WorldCupInviteJoinPanel title="Join with invite code" />
      </div>
    </main>
  )
}
