import { notFound } from "next/navigation"
import PlayerComparisonLabHarnessClient from "./PlayerComparisonLabHarnessClient"

export default function E2EPlayerComparisonLabPage() {
  if (process.env.NODE_ENV === "production") {
    notFound()
  }

  return <PlayerComparisonLabHarnessClient />
}
