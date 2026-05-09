import WorldCupDiscoverClient from "@/components/brackets/world-cup/WorldCupDiscoverClient"

export const dynamic = "force-dynamic"

export default function WorldCupDiscoverPage() {
  return (
    <main className="min-h-screen bg-[#05070b] text-white">
      <WorldCupDiscoverClient />
    </main>
  )
}
