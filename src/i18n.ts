'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import ptMessages from '../messages/pt.json';
import enMessages from '../messages/en.json';

export type Locale = 'pt-BR' | 'en-US';
export const DEFAULT_LOCALE: Locale = 'pt-BR';

const messages: Record<Locale, any> = {
  'pt-BR': ptMessages,
  'en-US': enMessages,
};

const getTranslation = (locale: Locale, key: string): string => {
  const keyParts = key.split('.');
  
  const findMessage = (source: any): string | undefined => {
    let current = source;
    for (const part of keyParts) {
      if (current === undefined || typeof current !== 'object' || current === null) {
        return undefined;
      }
      current = current[part];
    }
    return typeof current === 'string' ? current : undefined;
  }

  const message = findMessage(messages[locale]);
  if (message !== undefined) {
    return message;
  }

  if (locale !== DEFAULT_LOCALE) {
    const defaultMessage = findMessage(messages[DEFAULT_LOCALE]);
    if (defaultMessage !== undefined) {
      return defaultMessage;
    }
  }

  return key;
};

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);

  const t = useCallback((key: string): string => {
    return getTranslation(locale, key);
  }, [locale]);
  
  const value: I18nContextType = { locale, setLocale, t };

  // Using React.createElement to bypass JSX parsing issues
  return React.createElement(I18nContext.Provider, { value: value }, children);
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}

export function useTranslations(namespace: string) {
  const { t } = useI18n();
  return useCallback((key: string) => t(`${namespace}.${key}`), [t, namespace]);
}
