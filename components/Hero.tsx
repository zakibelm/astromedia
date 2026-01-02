
import React from 'react';
import Logo from './Logo';
import { useTranslation } from '../i18n/useTranslation';

interface HeroProps {
  onStart?: () => void;
}

const Hero: React.FC<HeroProps> = ({ onStart }) => {
  const { t } = useTranslation();

  return (
    <section className="relative min-h-screen flex flex-col justify-center items-center py-20 px-4 text-center overflow-hidden bg-gradient-to-b from-dark-space via-dark-space-mid to-dark-space">
      <div className="container mx-auto z-10 flex flex-col items-center">
        <div className="flex justify-center items-center mb-8 md:mb-12 animate-fade-in-down">
          <Logo />
        </div>
        <h2 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-white leading-tight mb-6 tracking-tighter max-w-5xl animate-fade-in-up">
          {t('hero.title')}
        </h2>
        <p className="text-lg md:text-2xl text-gray-300 max-w-3xl mx-auto mb-10 md:mb-16 leading-relaxed animate-fade-in-up delay-100">
          {t('hero.subtitle')}
        </p>

        <div className="flex justify-center animate-fade-in-up delay-200">
          <button
            onClick={onStart}
            className="px-10 py-5 bg-gradient-to-r from-astro-amber-500 to-orange-600 text-white text-xl font-bold rounded-full shadow-[0_0_30px_rgba(245,158,11,0.5)] hover:shadow-[0_0_50px_rgba(245,158,11,0.7)] hover:scale-105 transform transition-all duration-300 flex items-center group"
          >
            {t('common.launchApp') || "Lancer la console"}
            <svg className="w-6 h-6 ml-3 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-astro-amber-500/10 rounded-full blur-3xl opacity-50 animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-astro-cyan-500/10 rounded-full blur-3xl opacity-30"></div>
      </div>
    </section>
  );
};

export default Hero;
