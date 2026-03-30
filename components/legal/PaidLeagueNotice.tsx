import { FanCredDisclosure } from "@/components/legal/FanCredDisclosure";

export function PaidLeagueNotice({
  compact = true,
  showFanCredCta = false,
  ctaLabel = "Open FanCred",
  ctaTestId,
  dataTestId,
  className = "",
}: {
  compact?: boolean;
  showFanCredCta?: boolean;
  ctaLabel?: string;
  ctaTestId?: string;
  dataTestId?: string;
  className?: string;
}) {
  return (
    <FanCredDisclosure
      variant={compact ? "compact" : "detailed"}
      showCta={showFanCredCta}
      ctaLabel={ctaLabel}
      ctaTestId={ctaTestId}
      dataTestId={dataTestId}
      className={className}
    />
  );
}
