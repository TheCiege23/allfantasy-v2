import WorldCupDiscoverClient from "@/components/brackets/world-cup/WorldCupDiscoverClient"

export const dynamic = "force-dynamic"

export default function WorldCupDiscoverPage() {
  return (
    // `mode-readable` opts into the globals.css light-mode rescue layer.
    <main className="mode-readable min-h-screen bg-[#05070b] text-white">
      <WorldCupDiscoverClient />
    </main>
  )
}
