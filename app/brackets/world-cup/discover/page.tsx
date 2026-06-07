import WorldCupDiscoverClient from "@/components/brackets/world-cup/WorldCupDiscoverClient"
import { ModeToggle } from "@/components/theme/ModeToggle"

export const dynamic = "force-dynamic"

export default function WorldCupDiscoverPage() {
  return (
    // `mode-readable` opts into the globals.css light-mode rescue layer.
    <main className="mode-readable af-world-cup-page min-h-screen bg-[#05070b] text-white">
      <div className="mx-auto flex max-w-5xl justify-end px-3 pt-6 sm:px-6">
        <ModeToggle className="rounded-lg border px-3 py-2 text-xs font-bold shadow-sm" />
      </div>
      <WorldCupDiscoverClient />
    </main>
  )
}
