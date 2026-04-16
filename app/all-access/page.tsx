import MonetizationPurchaseSurface from "@/components/monetization/MonetizationPurchaseSurface";

/** Legacy URL — bundle tier is AF Supreme (Pro + Commissioner + War Room + top token tier). */
export default function AllAccessPage() {
  return (
    <MonetizationPurchaseSurface
      pagePath="/all-access"
      title="Upgrade to AF Supreme"
      subtitle="Full stack: AF Pro + AF Commissioner + AF War Room, with the highest token allowances and subscriber discounts."
      focusPlanFamily="af_supreme"
    />
  );
}
