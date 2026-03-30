import MonetizationPurchaseSurface from "@/components/monetization/MonetizationPurchaseSurface";

export default function AllAccessPage() {
  return (
    <MonetizationPurchaseSurface
      pagePath="/all-access"
      title="Upgrade to AF All-Access"
      subtitle="The simplest premium option: AF Pro + AF Commissioner + AF War Room in one bundle."
      focusPlanFamily="af_all_access"
    />
  );
}
