import MonetizationPurchaseSurface from "@/components/monetization/MonetizationPurchaseSurface";

export default function PricingPage() {
  return (
    <MonetizationPurchaseSurface
      pagePath="/pricing"
      title="Choose Your Plan"
      subtitle="Subscriptions and tokens are powered by Stripe with clear external payment boundaries."
    />
  );
}
