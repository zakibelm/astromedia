
import React from 'react';
import Logo from './Logo';
import { useTranslation } from '../i18n/useTranslation';

interface HeroProps {
  onStart?: () => void;
}

const Hero: React.FC<HeroProps> = ({ onStart }) => {
  const { t } = useTranslation();

  return (
    <section className="relative h-[100dvh] w-full flex flex-col justify-between items-center py-4 md:py-8 px-4 text-center overflow-hidden bg-gradient-to-b from-dark-space via-dark-space-mid to-dark-space">
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-5xl">

        <div className="flex-shrink-0 mb-4 scale-75 md:scale-100 transition-transform">
          <Logo />
        </div>

        <div className="flex flex-col items-center justify-center space-y-4 md:space-y-6">
          <h2 className="text-3xl md:text-5xl lg:text-7xl font-extrabold text-white leading-tight tracking-tighter animate-fade-in-up">
            {t('hero.title')}
          </h2>
          <p className="text-sm md:text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed animate-fade-in-up delay-100 px-4">
            {t('hero.subtitle')}
          </p>
        </div>

        <div className="mt-8 md:mt-12 animate-fade-in-up delay-200">
          <button
            onClick={onStart}
            className="px-6 py-3 md:px-10 md:py-5 bg-gradient-to-r from-astro-amber-500 to-orange-600 text-white text-lg md:text-xl font-bold rounded-full shadow-[0_0_30px_rgba(245,158,11,0.5)] hover:shadow-[0_0_50px_rgba(245,158,11,0.7)] hover:scale-105 transform transition-all duration-300 flex items-center group"
          >
            {t('common.launchApp') || "Lancer la console"}
            <svg className="w-5 h-5 ml-2 md:ml-3 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 md:w-96 md:h-96 bg-astro-amber-500/10 rounded-full blur-3xl opacity-50 animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 md:w-[500px] md:h-[500px] bg-astro-cyan-500/10 rounded-full blur-3xl opacity-30"></div>
      </div>
    </section>
  );
};

export default Hero;
