"use client";

type SoftGlowBackgroundProps = {
  className?: string;
  intensity?: "soft" | "medium";
};

export default function SoftGlowBackground({
  className = "",
  intensity = "soft",
}: SoftGlowBackgroundProps) {
  const blur = intensity === "medium" ? "blur-3xl" : "blur-2xl";

  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      <div
        className={`absolute -top-20 -left-16 h-56 w-56 rounded-full ${blur}`}
        style={{ background: "color-mix(in srgb, var(--accent-purple) 28%, transparent)" }}
      />
      <div
        className={`absolute top-16 right-0 h-44 w-44 rounded-full ${blur}`}
        style={{ background: "color-mix(in srgb, var(--accent-cyan) 26%, transparent)" }}
      />
      <div
        className={`absolute -bottom-14 left-1/3 h-48 w-48 rounded-full ${blur}`}
        style={{ background: "color-mix(in srgb, var(--accent-amber) 20%, transparent)" }}
      />
    </div>
  );
}
