
import React from 'react';
import Logo from './Logo';
import { useTranslation } from '../i18n/useTranslation';

interface HeroProps {
  onStart?: () => void;
}

const Hero: React.FC<HeroProps> = ({ onStart }) => {
  const { t } = useTranslation();

  return (
    <section className="relative py-20 md:py-32 text-center overflow-hidden">
      <div className="container mx-auto px-4 z-10">
        <div className="flex justify-center items-center mb-12">
          <Logo />
        </div>
        <h2 className="text-4xl md:text-6xl font-extrabold text-white leading-tight mb-4 tracking-tighter">
          {t('hero.title')}
        </h2>
        <p className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto mb-10">
          {t('hero.subtitle')}
        </p>

        <div className="flex justify-center">
          <button
            onClick={onStart}
            className="px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-lg font-bold rounded-full shadow-lg hover:shadow-purple-500/50 transform hover:-translate-y-1 transition-all flex items-center"
          >
            {t('common.launchApp') || "Lancer la console"}
            <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
};

export default Hero;
