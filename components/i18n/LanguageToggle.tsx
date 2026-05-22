"use client";

import { Globe } from "lucide-react";
import { useOptionalSession } from "@/components/auth/useOptionalSession";
import { useOptionalLanguage } from "./LanguageProviderClient";
import { getLanguageDisplayName, SUPPORTED_LANGUAGES, type LanguageCode } from "@/lib/i18n/constants";

export type LanguageToggleVariant = "default" | "compact";

/**
 * Language picker.
 *
 * Two visual variants, same behavior:
 *   - "default" (existing) — label + select pill. Used in settings and
 *     anywhere the surrounding chrome already gives the picker context.
 *   - "compact" (new) — globe icon + select with native names. Drops the
 *     "Language" word so it fits inside dense headers (e.g. World Cup
 *     pool dashboard). Both variants persist the choice the same way
 *     (localStorage `af_lang` + UserProfile.preferredLanguage when the
 *     user is signed in).
 */
export default function LanguageToggle({
  variant = "default",
}: {
  /** Visual style. Defaults to the existing "default" variant. */
  variant?: LanguageToggleVariant;
} = {}) {
  const { data: session } = useOptionalSession();
  const { language, setLanguage, t } = useOptionalLanguage();

  const selectLang = (lang: LanguageCode) => {
    setLanguage(lang);
    if (session?.user) {
      fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferredLanguage: lang }),
      }).catch(() => {});
    }
  };

  const labelText = t("common.language");

  if (variant === "compact") {
    return (
      <div
        className="inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs"
        style={{
          borderColor: "var(--border)",
          background: "var(--panel)",
          color: "var(--muted)",
        }}
        data-testid="language-toggle-compact"
      >
        <Globe className="h-3.5 w-3.5 shrink-0" aria-hidden style={{ color: "var(--muted2)" }} />
        <span className="sr-only">{labelText}</span>
        <select
          value={language}
          onChange={(event) => selectLang(event.target.value as LanguageCode)}
          aria-label={labelText}
          className="rounded-full border-0 bg-transparent px-1.5 py-0.5 text-xs outline-none focus:ring-1 focus:ring-cyan-300/40"
          style={{ color: "var(--text)" }}
        >
          {SUPPORTED_LANGUAGES.map((lang) => (
            <option key={lang} value={lang}>
              {getLanguageDisplayName(lang)}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div
      className="inline-flex items-center gap-2 rounded-full border px-2 py-1 text-xs sm:text-[11px]"
      style={{ borderColor: "var(--border)", background: "var(--panel)", color: "var(--muted)" }}
    >
      <span className="hidden sm:inline px-2" style={{ color: "var(--muted2)" }}>
        {labelText}
      </span>
      <select
        value={language}
        onChange={(event) => selectLang(event.target.value as LanguageCode)}
        aria-label={labelText}
        className="rounded-full border px-3 py-1 pr-7 outline-none transition"
        style={{
          borderColor: "color-mix(in srgb, var(--border) 90%, transparent)",
          background: "color-mix(in srgb, var(--panel2) 88%, transparent)",
          color: "var(--text)",
        }}
      >
        {SUPPORTED_LANGUAGES.map((lang) => (
          <option key={lang} value={lang}>
            {getLanguageDisplayName(lang)}
          </option>
        ))}
      </select>
    </div>
  );
}
