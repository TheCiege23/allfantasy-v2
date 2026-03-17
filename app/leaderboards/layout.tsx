import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Leaderboards – AllFantasy",
  description:
    "Platform leaderboards: best draft grades, most championships, highest win %, and most active managers.",
}

export default function LeaderboardsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
