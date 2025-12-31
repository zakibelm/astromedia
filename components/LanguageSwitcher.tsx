
import React from 'react';
import { useTranslation } from '../i18n/useTranslation';

const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage } = useTranslation();

  const toggleLanguage = () => {
    const newLang = language === 'fr' ? 'en' : 'fr';
    setLanguage(newLang);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="px-3 py-1 bg-gradient-to-r from-slate-700 to-slate-800 text-slate-300 rounded-full text-sm font-semibold hover:from-slate-600 hover:to-slate-700 hover:text-white transition-colors animate-gradient"
      aria-label={`Switch language to ${language === 'fr' ? 'English' : 'Français'}`}
    >
      {language === 'fr' ? 'EN' : 'FR'}
    </button>
  );
};

export default LanguageSwitcher;