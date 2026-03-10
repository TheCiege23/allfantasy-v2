import Link from "next/link"
import { Trophy, ChevronRight } from "lucide-react"

export default function NCAABracketCard({ poolCount, entryCount }: { poolCount: number; entryCount: number }) {
  return (
    <Link href="/brackets" className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-5 hover:bg-cyan-500/10 transition">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-cyan-200">NCAA Bracket</h2>
        <Trophy className="h-4 w-4 text-cyan-300" />
      </div>
      <p className="mt-2 text-xs text-cyan-100/80">{entryCount} entries across {poolCount} pools.</p>
      <p className="mt-2 text-xs text-cyan-100/70">AI highlight: two undervalued upset spots this week.</p>
      <div className="mt-4 inline-flex items-center gap-1 text-xs text-cyan-200">Open Bracket <ChevronRight className="h-3.5 w-3.5" /></div>
    </Link>
  )
}
