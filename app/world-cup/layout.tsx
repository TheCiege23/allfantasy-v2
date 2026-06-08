import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Create Your 2026 World Cup Pool | AllFantasy.AI",
  description:
    "Create a free 2026 World Cup pool, invite friends, build brackets, and get AI-powered predictions from Chimmy. Free to start. No gambling. Just bragging rights.",
  openGraph: {
    title: "Create Your 2026 World Cup Pool",
    description:
      "Invite friends, build brackets, track standings, and use Chimmy AI to help predict the tournament.",
    images: ["/images/brackets/world-cup/af-world-cup-hero-poster.jpg"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Create Your 2026 World Cup Pool",
    description:
      "Free World Cup pools, private groups, brackets, live standings, and AI-powered predictions.",
    images: ["/images/brackets/world-cup/af-world-cup-hero-poster.jpg"],
  },
}

export default function WorldCupFunnelLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
