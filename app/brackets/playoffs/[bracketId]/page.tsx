import { redirect } from "next/navigation"
import type { Metadata } from "next"

export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: { params: { bracketId: string } }): Promise<Metadata> {
  return { title: "Playoff Bracket" }
}

export default async function PlayoffBracketPage({
  params,
  searchParams,
}: {
  params: { bracketId: string }
  searchParams?: { entryId?: string }
}) {
  const base = `/brackets/leagues/${params.bracketId}`
  const href = searchParams?.entryId ? `${base}?entryId=${encodeURIComponent(searchParams.entryId)}` : base
  redirect(href)
}
