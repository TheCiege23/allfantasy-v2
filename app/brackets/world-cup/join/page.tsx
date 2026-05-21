import Image from "next/image"
import Link from "next/link"
import WorldCupInviteJoinPanel from "@/components/brackets/world-cup/WorldCupInviteJoinPanel"

const WC_LOGO_SRC = "/images/brackets/world-cup/af-world-cup-logo.png"

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

        {/* WC branding lockup */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-300/35 bg-cyan-300/10 p-1">
            <Image
              src={WC_LOGO_SRC}
              alt="AllFantasy World Cup"
              width={40}
              height={40}
              className="h-full w-full object-contain"
              priority
            />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/35">AllFantasy</p>
            <h1 className="text-base font-black leading-tight text-white">2026 World Cup Bracket Pools</h1>
          </div>
        </div>

        <WorldCupInviteJoinPanel title="Join with invite code" />
      </div>
    </main>
  )
}
