import React from 'react';
import { useTranslation } from '../../i18n/useTranslation';

const SettingsView: React.FC = () => {
    const { t } = useTranslation();

    return (
        <div className="h-full bg-dark-space p-8 overflow-y-auto animate-fade-in">
            <h2 className="text-3xl font-bold text-white mb-6">Paramètres</h2>

            <div className="bg-dark-space-mid border border-astro-amber-500/10 rounded-xl p-6 mb-6">
                <h3 className="text-xl font-semibold text-white mb-4">Général</h3>
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-dark-space rounded-lg border border-astro-amber-500/10">
                        <div>
                            <p className="text-white font-medium">Mode Sombre</p>
                            <p className="text-sm text-gray-400">Toujours activé pour System Alpha</p>
                        </div>
                        <div className="w-12 h-6 bg-astro-amber-500 rounded-full relative cursor-not-allowed opacity-50">
                            <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-dark-space-mid border border-astro-amber-500/10 rounded-xl p-6">
                <h3 className="text-xl font-semibold text-white mb-4">Notifications</h3>
                <p className="text-gray-400">Configuration des alertes système (Bientôt disponible)</p>
            </div>
        </div>
    );
};

export default SettingsView;
