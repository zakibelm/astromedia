
import React from 'react';
import Logo from './Logo';
import { useTranslation } from '../i18n/useTranslation';

const Hero: React.FC = () => {
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
        <p className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto">
          {t('hero.subtitle')}
        </p>
      </div>
    </section>
  );
};

export default Hero;
