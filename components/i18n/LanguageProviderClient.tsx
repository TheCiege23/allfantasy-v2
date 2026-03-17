"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { translations } from "@/lib/i18n/translations";
import { LANG_STORAGE_KEY, DEFAULT_LANG, resolveLanguage, type LanguageCode } from "@/lib/i18n/constants";

type Language = LanguageCode;

type LanguageContextValue = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | undefined>(
  undefined
);
export function LanguageProviderClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof document !== "undefined" && document.documentElement.dataset.lang) {
      return resolveLanguage(document.documentElement.dataset.lang);
    }
    if (typeof window !== "undefined") {
      try {
        return resolveLanguage(window.localStorage.getItem(LANG_STORAGE_KEY));
      } catch {}
    }
    return DEFAULT_LANG;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(LANG_STORAGE_KEY);
    const resolved = resolveLanguage(stored);
    setLanguageState(resolved);
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, lang);
      if (typeof document !== "undefined") {
        document.documentElement.dataset.lang = lang;
      }
    } catch {
      // ignore
    }
  };

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage,
      t: (key: string) => {
        const dict = translations[language] || translations.en;
        return dict[key] ?? translations.en[key] ?? key;
      },
    }),
    [language]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within LanguageProviderClient");
  }
  return ctx;
}

