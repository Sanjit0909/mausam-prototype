"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  TRANSLATIONS,
  persistLocale,
  readStoredLocale,
  type Locale,
  type TranslationKey,
} from "@/lib/i18n/translations";

type Vars = Record<string, string | number>;

interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, vars?: Vars) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return Object.entries(vars).reduce(
    (acc, [key, value]) => acc.replaceAll(`{${key}}`, String(value)),
    template
  );
}

export function LanguageProvider({
  children,
  initialLocale = "en",
}: {
  children: ReactNode;
  /** From cookie on the server so first paint matches hydration. */
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  // Sync localStorage → state before paint when cookie was missing (legacy sessions).
  useLayoutEffect(() => {
    const stored = readStoredLocale();
    if (stored !== initialLocale) {
      setLocaleState(stored);
    }
    persistLocale(stored);
    document.documentElement.lang = stored;
  }, [initialLocale]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    persistLocale(next);
    document.documentElement.lang = next;
  }, []);

  const t = useCallback(
    (key: TranslationKey, vars?: Vars) => {
      const table = TRANSLATIONS[locale];
      return interpolate(table[key] ?? TRANSLATIONS.en[key], vars);
    },
    [locale]
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return ctx;
}
