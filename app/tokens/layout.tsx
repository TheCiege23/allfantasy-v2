import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
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

export default async function TokensLayout({ children }: { children: React.ReactNode }) {
  const session = (await getServerSession(authOptions as never)) as {
    user?: { id?: string };
  } | null;

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/tokens");
  }

  return children;
}
