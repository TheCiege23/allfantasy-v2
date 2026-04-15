import type { Metadata } from "next";
import { buildSeoMeta } from "@/lib/seo";

export const metadata: Metadata = buildSeoMeta({
  title: "AI Tokens — AllFantasy.ai | Buy Token Packs & View Feature Costs",
  description:
    "Purchase AI token packs (Stripe checkout), see per-feature token costs, and review your balance. Subscribers may get discounted token pricing on eligible actions.",
  canonicalPath: "/tokens",
  openGraphTitle: "AllFantasy AI Tokens",
  openGraphDescription: "Buy tokens for Chimmy and AI tools. Transparent pricing matrix. Checkout powered by Stripe.",
  keywords: ["AllFantasy tokens", "AI tokens fantasy", "Chimmy tokens", "fantasy AI credits"],
});

export default function TokensLayout({ children }: { children: React.ReactNode }) {
  return children;
}
