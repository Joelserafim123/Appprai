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

// Function to get a nested property from an object
const get = (obj: any, path: string): string | undefined => {
  const keys = path.split('.');
  let result = obj;
  for (const key of keys) {
    if (result === undefined) return undefined;
    result = result[key];
  }
  return result;
}

// Function to replace placeholders like {name} with strings or React elements
function interpolate(text: string, params?: Record<string, any>): React.ReactNode {
    if (!params) {
        return text;
    }

    const parts = text.split(/({[^}]+})/g);

    return parts.map((part, index) => {
        if (part.startsWith('{') && part.endsWith('}')) {
            const key = part.substring(1, part.length - 1);
            if (params && Object.prototype.hasOwnProperty.call(params, key)) {
                const replacement = params[key];
                if (React.isValidElement(replacement)) {
                    return React.cloneElement(replacement, { key: `${key}-${index}` });
                }
                return replacement;
            }
        }
        return part;
    });
}

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, any>) => ReactNode;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);

  const t = useCallback(
    (key: string, params?: Record<string, any>): ReactNode => {
      let translation = get(messages[locale], key);

      if (translation === undefined) {
        // Fallback to default locale
        translation = get(messages[DEFAULT_LOCALE], key);
      }
      
      const text = translation ?? key;
      return typeof text === 'string' ? interpolate(text, params) : text;
    },
    [locale]
  );
  
  // Explicitly type the provider value to help the compiler.
  const providerValue: I18nContextType = {
    locale,
    setLocale,
    t,
  };

  return (
    <I18nContext.Provider value={providerValue}>
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
    const t = useCallback(
        (key: string, params?: Record<string, any>) => fullT(`${namespace}.${key}`, params),
        [fullT, namespace]
    );
    return t;
}
