import { redirect } from "next/navigation"
import type { Metadata } from "next"
export const dynamic = "force-dynamic"

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Playoff Bracket" }
}

export default async function PlayoffBracketPage({
  params,
  searchParams,
}: {
  params: { bracketId: string }
  searchParams?: { entryId?: string }
}) {
  const base = `/brackets/leagues/${encodeURIComponent(params.bracketId)}`
  const entryId = searchParams?.entryId ? String(searchParams.entryId) : ""
  const target = entryId ? `${base}?entryId=${encodeURIComponent(entryId)}` : base
  redirect(target)
}
