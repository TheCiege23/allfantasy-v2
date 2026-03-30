import Link from "next/link";
import {
  getFanCredBoundaryDisclosureShort,
  getFanCredCommissionerSetupNotice,
} from "@/lib/legal/FanCredBoundaryDisclosure";

export function CommissionerFanCredSetupNotice({
  dataTestId,
  showFanCredLink = true,
}: {
  dataTestId?: string;
  showFanCredLink?: boolean;
}) {
  const shortDisclosure = getFanCredBoundaryDisclosureShort();
  const commissionerSetupNotice = getFanCredCommissionerSetupNotice();
  const fanCredHref = process.env.NEXT_PUBLIC_FANCRED_URL || "https://fancred.com";

  return (
    <section
      className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-amber-100"
      data-testid={dataTestId}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-200/85">
        Commissioner paid-league setup
      </p>
      <p className="mt-1 text-xs text-amber-100/95">
        {commissionerSetupNotice}
      </p>
      <p className="mt-1 text-xs text-amber-200/80">{shortDisclosure}</p>
      {showFanCredLink ? (
        <Link
          href={fanCredHref}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex text-xs font-semibold underline decoration-amber-200/60 underline-offset-2 hover:text-amber-50"
          data-testid="commissioner-fancred-setup-link"
        >
          Open FanCred setup
        </Link>
      ) : null}
    </section>
  );
}
