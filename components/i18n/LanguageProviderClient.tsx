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
import { setStoredLanguage } from "@/lib/preferences/LanguagePreferenceService";
import { applyLanguageToDocument } from "@/lib/preferences/HtmlPreferenceSync";

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
  const [messages, setMessages] = useState<Record<string, string>>(() => {
    return translations[language] || translations.en;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(LANG_STORAGE_KEY);
    const resolved = resolveLanguage(stored);
    setLanguageState(resolved);
  }, []);

  useEffect(() => {
    applyLanguageToDocument(language);
    // Immediately reflect language switch with bundled copy while remote dictionary loads.
    setMessages(translations[language] || translations.en);

    let cancelled = false;
    fetch(`/api/i18n/translations?lang=${encodeURIComponent(language)}`, {
      cache: "no-store",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { messages?: Record<string, string> } | null) => {
        if (cancelled) return;
        const next = data?.messages;
        if (next && typeof next === "object") {
          setMessages(next);
          return;
        }
        setMessages(translations[language] || translations.en);
      })
      .catch(() => {
        if (!cancelled) {
          setMessages(translations[language] || translations.en);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [language]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== LANG_STORAGE_KEY) return;
      const resolved = resolveLanguage(event.newValue);
      setLanguageState(resolved);
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const setLanguage = (lang: Language) => {
    const resolved = resolveLanguage(lang);
    setLanguageState(resolved);
    try {
      setStoredLanguage(resolved);
    } catch {
      // ignore
    }

    fetch("/api/i18n/preference", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: resolved }),
    }).catch(() => {});
  };

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage,
      t: (key: string) => {
        const dict = messages || translations[language] || translations.en;
        return dict[key] ?? translations.en[key] ?? key;
      },
    }),
    [language, messages]
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

