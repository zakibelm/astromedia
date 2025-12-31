
import React from 'react';
import { useTranslation } from '../i18n/useTranslation';
import LanguageSwitcher from './LanguageSwitcher';

interface HeaderProps {
  onStart: () => void;
}

const Header: React.FC<HeaderProps> = ({ onStart }) => {
  const { t } = useTranslation();

  return (
    <header className="py-6 px-4 sm:px-6 lg:px-8 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-wider text-white">
          Astro<span className="text-amber-400 [text-shadow:1px_1px_#b91c1c]">Media</span>
        </h1>
        <div className="flex items-center space-x-4">
          <LanguageSwitcher />
          <button onClick={onStart} className="px-5 py-2 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 rounded-full hover:from-amber-500 hover:to-orange-600 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl hover:shadow-orange-500/20 transform hover:-translate-y-px animate-gradient">
            {t('header.start')}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;