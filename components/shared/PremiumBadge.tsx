"use client";

import { Sparkles } from "lucide-react";

type PremiumBadgeProps = {
  label?: string;
  className?: string;
};

export default function PremiumBadge({
  label = "Premium Insight",
  className = "",
}: PremiumBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${className}`}
      style={{
        borderColor: "color-mix(in srgb, var(--accent) 35%, transparent)",
        background: "color-mix(in srgb, var(--accent) 12%, transparent)",
        color: "var(--text)",
      }}
    >
      <Sparkles className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}
