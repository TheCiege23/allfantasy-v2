import type { Metadata } from "next";
import MonetizationPurchaseSurface from "@/components/monetization/MonetizationPurchaseSurface";
import { buildSeoMeta } from "@/lib/seo";

export const metadata: Metadata = buildSeoMeta({
  title: "Pricing & Plans — AllFantasy.ai | Fantasy Tools & Subscriptions",
  description:
    "Compare AF Pro, Commissioner, AF Supreme, and AF Legacy. Tokens for Chimmy, trades, and waivers. Secure Stripe checkout. League dues and payouts are handled on FanCred.",
  canonicalPath: "/pricing",
  openGraphTitle: "AllFantasy Pricing — Unlock fantasy tools for your league",
  openGraphDescription:
    "Subscribe to premium tools or buy token packs. Clear plans, Stripe checkout, built for serious managers.",
  imagePath: "/af-crest.png",
  keywords: [
    "AllFantasy pricing",
    "fantasy sports subscription",
    "fantasy football tools",
    "Chimmy",
    "fantasy commissioner tools",
  ],
});

export default function PricingPage() {
  return (
    <MonetizationPurchaseSurface
      pagePath="/pricing"
      title="Win more with tools built for fantasy managers"
      subtitle="Subscribe for full access to Chimmy, trade and waiver intelligence, commissioner tools, and more — or grab token packs whenever you need them. Cancel anytime."
      conversionHero
    />
  );
}
