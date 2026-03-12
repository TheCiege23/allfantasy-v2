"use client";

import { useLanguage } from "./LanguageProviderClient";

export default function LanguageToggle() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/30 px-1 py-0.5 text-xs sm:text-[11px] text-white/70">
      <span className="hidden sm:inline px-2 text-white/40">
        {t("common.language")}
      </span>
      <button
        type="button"
        onClick={() => setLanguage("en")}
        className={`px-2 py-1 rounded-full transition-colors ${
          language === "en"
            ? "bg-white text-black"
            : "text-white/70 hover:text-white"
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLanguage("es")}
        className={`px-2 py-1 rounded-full transition-colors ${
          language === "es"
            ? "bg-white text-black"
            : "text-white/70 hover:text-white"
        }`}
      >
        ES
      </button>
    </div>
  );
}

