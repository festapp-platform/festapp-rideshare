"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { SupportedLocale } from "@festapp/shared";
import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY } from "@festapp/shared";
import { translations, type TranslationKeys } from "./translations";

type I18nContextValue = {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  t: (key: string) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<SupportedLocale>(DEFAULT_LOCALE);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
      if (stored && (stored === "cs" || stored === "sk" || stored === "en")) {
        setLocaleState(stored);
      }
    } catch {
      // localStorage may be unavailable (SSR, privacy mode)
    }
  }, []);

  const setLocale = useCallback((newLocale: SupportedLocale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
    } catch {
      // localStorage may be unavailable
    }
  }, []);

  const t = useCallback(
    (key: string): string => {
      const dict = translations[locale];
      return (dict as Record<string, string>)[key] ?? key;
    },
    [locale],
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}
