
import React, { createContext, useState, ReactNode } from 'react';
// FIX: Corrected import path to be explicit, though the original issue was likely due to the locales file being empty.
import * as locales from './locales';

type Language = 'fr' | 'en';

interface TranslationContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  translations: Record<string, string>;
}

export const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

const translationsData = {
  fr: locales.fr,
  en: locales.en,
};

const getInitialLanguage = (): Language => {
  if (typeof window !== 'undefined' && window.localStorage) {
    const storedLang = window.localStorage.getItem('language') as Language;
    if (storedLang && ['fr', 'en'].includes(storedLang)) {
      return storedLang;
    }
  }
  if (typeof window !== 'undefined' && window.navigator) {
    const browserLang = navigator.language.split('-')[0];
    if (browserLang === 'en') {
      return 'en';
    }
  }
  return 'fr'; // Défaut sur le français
};

export const TranslationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  console.log('TranslationProvider: Rendering');
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('language', lang);
    }
  };

  const translations = translationsData[language];

  return (
    <TranslationContext.Provider value={{ language, setLanguage, translations }}>
      {children}
    </TranslationContext.Provider>
  );
};
