'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import ptMessages from '../messages/pt.json';
import enMessages from '../messages/en.json';

export type Locale = 'pt-BR' | 'en-US';
export const DEFAULT_LOCALE: Locale = 'pt-BR';

const messages: Record<Locale, any> = {
  'pt-BR': ptMessages,
  'en-US': enMessages,
};

const get = (obj: any, path: string): string | undefined => {
  const keys = path.split('.');
  let result = obj;
  for (const key of keys) {
    if (result === undefined || result === null) return undefined;
    result = result[key];
  }
  return typeof result === 'string' ? result : key;
};

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);

  const t = (key: string): string => {
    return get(messages[locale], key) ?? get(messages[DEFAULT_LOCALE], key) ?? key;
  };

  const value: I18nContextType = { locale, setLocale, t };

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}

export function useTranslations(namespace: string) {
  const { t: fullT } = useI18n();
  const t = (key: string) => fullT(`${namespace}.${key}`);
  return t;
}
