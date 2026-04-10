import { FanCredDisclosure } from "@/components/legal/FanCredDisclosure";
import { getFanCredPublicUrl } from "@/lib/legal/fancredPublicUrl";

export function MonetizationComplianceNotice({ fancredCopy }: { fancredCopy?: { short?: string; long?: string } }) {
  const fanCredHref = getFanCredPublicUrl();

  return (
    <FanCredDisclosure
      variant="detailed"
      ctaHref={fanCredHref}
      ctaLabel="Learn more about FanCred"
      ctaTestId="monetization-fancred-link"
      shortCopy={fancredCopy?.short}
      longCopy={fancredCopy?.long}
      dataTestId="monetization-compliance-notice"
      className="rounded-2xl p-4"
    />
  );
}
