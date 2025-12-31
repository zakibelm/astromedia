
import React from 'react';
import { useTranslation } from '../i18n/useTranslation';

interface Props {
    onCreateCampaign: () => void;
}

const PlusIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
)

const OverviewView: React.FC<Props> = ({ onCreateCampaign }) => {
    const { t } = useTranslation();
    return (
        <div className="flex flex-col items-center justify-center text-center h-[60vh]">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center mb-6 animate-gradient">
                <div className="w-20 h-20 rounded-full bg-[#10051a] flex items-center justify-center">
                    <PlusIcon />
                </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">{t('overview.noCampaign.title')}</h2>
            <p className="text-gray-400 max-w-md mb-8">{t('overview.noCampaign.subtitle')}</p>
            <button 
                onClick={onCreateCampaign}
                className="bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 font-semibold py-3 px-6 rounded-md hover:from-amber-500 hover:to-orange-600 transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-orange-500/20 transform hover:-translate-y-px flex items-center animate-gradient"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                {t('overview.noCampaign.button')}
            </button>
        </div>
    );
};

export default OverviewView;