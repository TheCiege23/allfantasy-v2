import {
  DEFAULT_LANG,
  LANG_STORAGE_KEY,
  resolveLanguage,
  type LanguageCode,
} from "@/lib/i18n/constants";
import {
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  resolveTheme,
  type ThemeId,
} from "@/lib/theme";

function getDocumentElement(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return document.documentElement;
}

export function applyThemeToDocument(value: string | null | undefined): ThemeId {
  const resolved = resolveTheme(value);
  const root = getDocumentElement();
  if (root) {
    root.setAttribute("data-mode", resolved);
    root.style.colorScheme = resolved === "light" ? "light" : "dark";
  }
  return resolved;
}

export function applyLanguageToDocument(
  value: string | null | undefined
): LanguageCode {
  const resolved = resolveLanguage(value);
  const root = getDocumentElement();
  if (root) {
    root.setAttribute("lang", resolved);
    root.setAttribute("data-lang", resolved);
  }
  return resolved;
}

export function buildThemeInitScript(serverMode?: string | null): string {
  const fallbackMode = resolveTheme(serverMode ?? DEFAULT_THEME);
  const fallbackColorScheme = fallbackMode === "light" ? "light" : "dark";

  return `
    (function(){
      try {
        var fallbackMode = ${JSON.stringify(fallbackMode)};
        var mode = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)}) || fallbackMode;
        if (mode !== "dark" && mode !== "light" && mode !== "legacy") mode = fallbackMode;
        document.documentElement.setAttribute("data-mode", mode);
        document.documentElement.style.colorScheme = mode === "light" ? "light" : "dark";
      } catch (e) {
        document.documentElement.setAttribute("data-mode", ${JSON.stringify(fallbackMode)});
        document.documentElement.style.colorScheme = ${JSON.stringify(fallbackColorScheme)};
      }
    })();
  `;
}

export function buildLanguageInitScript(serverLang?: string | null): string {
  const fallbackLanguage = resolveLanguage(serverLang ?? DEFAULT_LANG);

  return `
    (function(){
      try {
        var fallbackLang = ${JSON.stringify(fallbackLanguage)};
        var lang = localStorage.getItem(${JSON.stringify(LANG_STORAGE_KEY)}) || fallbackLang;
        if (lang !== "en" && lang !== "es") lang = fallbackLang;
        document.documentElement.setAttribute("lang", lang);
        document.documentElement.setAttribute("data-lang", lang);
      } catch (e) {
        document.documentElement.setAttribute("lang", ${JSON.stringify(fallbackLanguage)});
        document.documentElement.setAttribute("data-lang", ${JSON.stringify(fallbackLanguage)});
      }
    })();
  `;
}
