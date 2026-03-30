import MonetizationPurchaseSurface from "@/components/monetization/MonetizationPurchaseSurface";

export default function CommissionerUpgradePage() {
  return (
    <MonetizationPurchaseSurface
      pagePath="/commissioner-upgrade"
      title="Upgrade to AF Commissioner"
      subtitle="Unlock league-specific commissioner automation, oversight, and governance tools."
      focusPlanFamily="af_commissioner"
    />
  );
}
