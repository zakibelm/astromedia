
import { useContext } from 'react';
import { TranslationContext } from './TranslationContext';

export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }

  const t = (key: string, replacements?: Record<string, string | number>): string => {
    let translation = context.translations[key] || key;
    if (replacements) {
      Object.keys(replacements).forEach((placeholder) => {
        translation = translation.replace(
          new RegExp(`\\{${placeholder}\\}`, 'g'),
          String(replacements[placeholder])
        );
      });
    }
    return translation;
  };

  return { ...context, t };
};
