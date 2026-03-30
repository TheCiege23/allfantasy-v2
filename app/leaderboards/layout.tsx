import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Leaderboards – AllFantasy",
  description:
    "Platform leaderboards: best draft grades, most championships, highest win percentage, and most active managers.",
}

export default function LeaderboardsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
