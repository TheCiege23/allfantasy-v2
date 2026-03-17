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
      className="inline-flex items-center gap-1 rounded-full border px-1 py-0.5 text-xs sm:text-[11px]"
      style={{ borderColor: "var(--border)", background: "var(--panel)", color: "var(--muted)" }}
    >
      <span className="hidden sm:inline px-2" style={{ color: "var(--muted2)" }}>
        {t("common.language")}
      </span>
      <button
        type="button"
        onClick={() => selectLang("en")}
        className="px-2 py-1 rounded-full transition-colors min-w-[2rem]"
        style={{
          background: language === "en" ? "var(--accent-cyan)" : "transparent",
          color: language === "en" ? "var(--on-accent-bg)" : "var(--text)",
        }}
        aria-label={getLanguageDisplayName("en")}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => selectLang("es")}
        className="px-2 py-1 rounded-full transition-colors min-w-[2rem]"
        style={{
          background: language === "es" ? "var(--accent-cyan)" : "transparent",
          color: language === "es" ? "var(--on-accent-bg)" : "var(--text)",
        }}
        aria-label={getLanguageDisplayName("es")}
      >
        ES
      </button>
    </div>
  );
}

