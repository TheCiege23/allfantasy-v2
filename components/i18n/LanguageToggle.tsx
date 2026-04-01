"use client";

import { useSession } from "next-auth/react";
import { useLanguage } from "./LanguageProviderClient";
import { getLanguageDisplayName } from "@/lib/i18n/constants";

export default function LanguageToggle() {
  const { data: session } = useSession();
  const { language, setLanguage, t } = useLanguage();

  const selectLang = (lang: "en" | "es") => {
    setLanguage(lang);
    if (session?.user) {
      fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferredLanguage: lang }),
      }).catch(() => {});
    }
  };

  return (
    <div
      className="inline-flex items-center gap-2 rounded-full border px-2 py-1 text-xs sm:text-[11px]"
      style={{ borderColor: "var(--border)", background: "var(--panel)", color: "var(--muted)" }}
    >
      <span className="hidden sm:inline px-2" style={{ color: "var(--muted2)" }}>
        {t("common.language")}
      </span>
      <select
        value={language}
        onChange={(event) => selectLang(event.target.value as "en" | "es")}
        aria-label={t("common.language")}
        className="rounded-full border px-3 py-1 pr-7 outline-none transition"
        style={{
          borderColor: "color-mix(in srgb, var(--border) 90%, transparent)",
          background: "color-mix(in srgb, var(--panel2) 88%, transparent)",
          color: "var(--text)",
        }}
      >
        <option value="en">{getLanguageDisplayName("en")}</option>
        <option value="es">{getLanguageDisplayName("es")}</option>
      </select>
    </div>
  );
}

