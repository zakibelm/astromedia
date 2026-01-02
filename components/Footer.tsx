
import React from 'react';
import { useTranslation } from '../i18n/useTranslation';

const Footer: React.FC = () => {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="py-8 mt-16 border-t border-astro-amber-500/10">
      <div className="container mx-auto px-4 text-center">
        <p className="text-gray-500">
          {t('footer.copyright.start', { year: currentYear })}
          <span className="text-astro-amber-400 font-medium">
            {t('footer.copyright.brand')}
          </span>
          {t('footer.copyright.end')}
        </p>
      </div>
    </footer>
  );
};

export default Footer;
