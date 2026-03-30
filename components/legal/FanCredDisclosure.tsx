import Link from "next/link";
import { getFanCredBoundaryDisclosure } from "@/lib/legal/FanCredBoundaryDisclosure";

type FanCredDisclosureVariant = "compact" | "detailed";

export function FanCredDisclosure({
  variant = "compact",
  showCta = true,
  ctaLabel = "Learn more about FanCred",
  ctaHref,
  ctaTestId = "fancred-external-cta-link",
  shortCopy,
  longCopy,
  dataTestId,
  className = "",
}: {
  variant?: FanCredDisclosureVariant;
  showCta?: boolean;
  ctaLabel?: string;
  ctaHref?: string;
  ctaTestId?: string;
  shortCopy?: string;
  longCopy?: string;
  dataTestId?: string;
  className?: string;
}) {
  const disclosure = getFanCredBoundaryDisclosure();
  const href = ctaHref || process.env.NEXT_PUBLIC_FANCRED_URL || "https://fancred.com";

  return (
    <section
      className={`rounded-xl border border-amber-400/25 bg-amber-500/10 p-3 ${className}`}
      data-testid={dataTestId}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-200/85">
        External payment boundary
      </p>
      <p className="mt-1 text-sm text-amber-100">{shortCopy || disclosure.short}</p>
      {variant === "detailed" ? (
        <>
          <p className="mt-2 text-xs text-amber-200/80">{longCopy || disclosure.long}</p>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-amber-100/90">
            {disclosure.checklist.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </>
      ) : null}
      {showCta ? (
        <Link
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex text-xs font-semibold text-amber-100 underline decoration-amber-200/60 underline-offset-2 hover:text-amber-50"
          data-testid={ctaTestId}
        >
          {ctaLabel}
        </Link>
      ) : null}
    </section>
  );
}
