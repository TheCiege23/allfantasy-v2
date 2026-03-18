import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Leaderboards – AllFantasy",
  description:
    "Platform leaderboards: top users, best drafters, win %, most championships, and most active managers.",
}

export default function LeaderboardsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
