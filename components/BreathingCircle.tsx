"use client";

import { useEffect, useMemo, useState } from "react";

export type BreathingPhase = "Inhale" | "Hold" | "Exhale";
export type BreathingTheme = "mist" | "sunrise" | "forest" | "night";

type Props = {
  isActive: boolean;
  inhaleSeconds: number;
  holdSeconds: number;
  exhaleSeconds: number;
  theme?: BreathingTheme;
  onPhaseChange?: (phase: BreathingPhase) => void;
};

const THEME_STYLES: Record<BreathingTheme, { glow: string; border: string; fill: string }> = {
  mist: {
    glow: "rgba(125, 211, 252, 0.32)",
    border: "rgba(186, 230, 253, 0.55)",
    fill: "radial-gradient(circle at 30% 30%, rgba(224,242,254,0.92), rgba(59,130,246,0.18))",
  },
  sunrise: {
    glow: "rgba(251, 191, 36, 0.32)",
    border: "rgba(253, 224, 71, 0.55)",
    fill: "radial-gradient(circle at 30% 30%, rgba(255,247,237,0.92), rgba(251,146,60,0.22))",
  },
  forest: {
    glow: "rgba(74, 222, 128, 0.28)",
    border: "rgba(187, 247, 208, 0.55)",
    fill: "radial-gradient(circle at 30% 30%, rgba(236,253,245,0.92), rgba(34,197,94,0.2))",
  },
  night: {
    glow: "rgba(129, 140, 248, 0.32)",
    border: "rgba(165, 180, 252, 0.52)",
    fill: "radial-gradient(circle at 30% 30%, rgba(224,231,255,0.85), rgba(99,102,241,0.2))",
  },
};

export default function BreathingCircle({
  isActive,
  inhaleSeconds,
  holdSeconds,
  exhaleSeconds,
  theme = "mist",
  onPhaseChange,
}: Props) {
  const phases = useMemo(
    () => [
      { label: "Inhale" as BreathingPhase, seconds: inhaleSeconds },
      { label: "Hold" as BreathingPhase, seconds: holdSeconds },
      { label: "Exhale" as BreathingPhase, seconds: exhaleSeconds },
    ],
    [exhaleSeconds, holdSeconds, inhaleSeconds]
  );

  const [phaseIndex, setPhaseIndex] = useState(0);
  const currentPhase = phases[phaseIndex] ?? phases[0];

  useEffect(() => {
    onPhaseChange?.(currentPhase.label);
  }, [currentPhase.label, onPhaseChange]);

  useEffect(() => {
    if (!isActive) {
      setPhaseIndex(0);
      return;
    }

    const ms = Math.max(1, currentPhase.seconds) * 1000;
    const timer = window.setTimeout(() => {
      setPhaseIndex((previous) => (previous + 1) % phases.length);
    }, ms);

    return () => window.clearTimeout(timer);
  }, [currentPhase.seconds, isActive, phases.length, phaseIndex]);

  const scale =
    currentPhase.label === "Inhale" ? 1.08 : currentPhase.label === "Hold" ? 1.02 : 0.92;
  const styles = THEME_STYLES[theme];

  return (
    <div className="relative flex h-56 w-56 items-center justify-center sm:h-64 sm:w-64">
      <div
        className="absolute inset-0 rounded-full blur-3xl transition-all duration-700"
        style={{ backgroundColor: styles.glow, transform: `scale(${scale + 0.15})` }}
      />
      <div
        className="relative flex h-44 w-44 items-center justify-center rounded-full border text-center shadow-2xl transition-all duration-700 sm:h-52 sm:w-52"
        style={{
          transform: `scale(${scale})`,
          borderColor: styles.border,
          background: styles.fill,
          boxShadow: `0 0 40px ${styles.glow}`,
        }}
      >
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-white/70">Breath</p>
          <p className="mt-2 text-2xl font-semibold text-white">{currentPhase.label}</p>
          <p className="mt-1 text-sm text-white/70">{Math.max(1, currentPhase.seconds)}s</p>
        </div>
      </div>
    </div>
  );
}
