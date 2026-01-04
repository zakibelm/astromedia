import React from 'react';
import { features } from '../constants';
import { useTranslation } from '../i18n/useTranslation';

const Features: React.FC = () => {
    const { t } = useTranslation();

    return (
        <section className="relative py-20 md:py-32 bg-gradient-to-b from-[#10051a] to-[#190729] overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>
            <div className="container mx-auto px-4 relative z-10">
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
                        <div key={index} className="bg-slate-900/50 p-8 rounded-lg border border-slate-800 flex items-start space-x-6 hover:border-amber-400/50 transition-all duration-300 transform hover:-translate-y-1">
                            <div className="flex-shrink-0 text-amber-400 mt-1">
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
