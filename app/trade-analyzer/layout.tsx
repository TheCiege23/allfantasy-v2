import type { Metadata } from "next"
import type { ReactNode } from "react"
import { buildMetadata } from "@/lib/seo"
import { getSEOPageConfig } from "@/lib/seo"

export const metadata: Metadata = buildMetadata(
  getSEOPageConfig("trade-analyzer") ?? {
    title: "Fantasy Trade Analyzer | AllFantasy",
    description: "AI-powered trade grades and analysis for fantasy sports.",
    canonical: "https://allfantasy.ai/trade-analyzer",
  }
)

export default function TradeAnalyzerLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
