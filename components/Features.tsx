import React from 'react';
import { features } from '../constants';
import { useTranslation } from '../i18n/useTranslation';

const Features: React.FC = () => {
    const { t } = useTranslation();

    return (
        <section className="py-20 md:py-32 bg-gradient-to-b from-dark-space to-dark-space-mid">
            <div className="container mx-auto px-4">
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-extrabold text-white leading-tight mb-4 tracking-tighter">
                        {t('features.title')}
                    </h2>
                    <p className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto">
                        {t('features.subtitle')}
                    </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
                    {features.map((feature, index) => (
                        <div key={index} className="bg-dark-space-mid/50 p-8 rounded-lg border border-slate-800 flex items-start space-x-6 hover:border-astro-amber-400/50 transition-all duration-300 transform hover:-translate-y-1 group">
                            <div className="flex-shrink-0 text-astro-amber-400 mt-1 group-hover:text-astro-cyan-400 transition-colors">
                                {feature.icon}
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white mb-2">{t(feature.titleKey)}</h3>
                                <p className="text-gray-400">
                                    {t(feature.descriptionKey)}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Features;
