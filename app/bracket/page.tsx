import Link from 'next/link'

export default function BracketRootPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 space-y-4">
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <h1 className="text-2xl font-semibold">NCAA Bracket</h1>
        <p className="mt-2 text-sm text-white/65">Dedicated product shell for pools, entries, standings, and bracket AI.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/brackets" className="rounded-lg border border-white/20 px-3 py-2 text-sm hover:bg-white/10">Open Bracket Hub</Link>
          <Link href="/brackets/leagues/new" className="rounded-lg border border-white/20 px-3 py-2 text-sm hover:bg-white/10">Create Pool</Link>
          <Link href="/brackets/join" className="rounded-lg border border-white/20 px-3 py-2 text-sm hover:bg-white/10">Join Pool</Link>
        </div>
      </section>
    </main>
  )
}
