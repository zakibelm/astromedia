
import React from 'react';
import { useTranslation } from '../i18n/useTranslation';

const Footer: React.FC = () => {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="py-8 mt-16 border-t border-slate-800">
      <div className="container mx-auto px-4 text-center">
        <p className="text-gray-500">
          {t('footer.copyright.start', { year: currentYear })}
          <span className="text-amber-400 [text-shadow:1px_1px_#b91c1c]">
            {t('footer.copyright.brand')}
          </span>
          {t('footer.copyright.end')}
        </p>
      </div>
    </footer>
  );
};

export default Footer;
