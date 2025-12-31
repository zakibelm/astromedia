import React from 'react';
import { AnalyticsOutput } from '../services/agentSchemas';
import { useTranslation } from '../i18n/useTranslation';

interface AnalyticsDashboardProps {
    data: AnalyticsOutput | null;
}

// --- Icon Components ---
const TargetIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 10-7.07 0M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>;
const CheckCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>;
const XCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>;
const ArrowUpCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" /></svg>;
const LightBulbIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>;
const WrenchScrewdriverIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;

const KpiCard: React.FC<{ kpi: AnalyticsOutput['kpis'][0] }> = ({ kpi }) => {
    const { t } = useTranslation();

    const statusInfo = {
        above: { text: 'analytics.kpi.status.above', color: 'text-green-300', icon: <ArrowUpCircleIcon /> },
        on_track: { text: 'analytics.kpi.status.on_track', color: 'text-blue-300', icon: <CheckCircleIcon /> },
        below: { text: 'analytics.kpi.status.below', color: 'text-red-300', icon: <XCircleIcon /> },
    };
    const currentStatus = statusInfo[kpi.status];

    return (
        <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 flex flex-col justify-between">
            <div>
                <div className="flex items-center text-slate-400 mb-2">
                    <TargetIcon />
                    <h4 className="ml-2 font-semibold ">{kpi.kpi}</h4>
                </div>
                <p className="text-3xl font-bold text-white">{kpi.value}</p>
                <p className="text-sm text-slate-500">{t('analytics.kpi.target', { target: kpi.target })}</p>
            </div>
            <div className={`mt-3 flex items-center text-sm font-semibold ${currentStatus.color}`}>
                {currentStatus.icon}
                <span className="ml-1.5">{t(currentStatus.text)}</span>
            </div>
        </div>
    );
};

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ data }) => {
    const { t } = useTranslation();

    if (!data) {
        return (
            <div className="flex flex-col items-center justify-center text-center h-[40vh] animate-fade-in">
                <svg className="w-16 h-16 text-slate-600 mb-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                <h3 className="text-xl font-bold text-slate-300">{t('analytics.noData.title')}</h3>
                <p className="text-slate-500 max-w-md">{t('analytics.noData.subtitle')}</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in">
            {/* KPIs Section */}
            <section>
                <h2 className="text-xl font-bold text-white mb-4">{t('analytics.kpis.title')}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {data.kpis.map((kpi, index) => (
                        <KpiCard key={index} kpi={kpi} />
                    ))}
                </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Insights Section */}
                <section>
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                        <LightBulbIcon />
                        <span className="ml-2">{t('analytics.insights.title')}</span>
                    </h2>
                    <div className="space-y-3">
                        {data.insights.map((insight, index) => (
                            <div key={index} className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 text-slate-300">
                                {insight}
                            </div>
                        ))}
                    </div>
                </section>

                {/* Recommendations Section */}
                <section>
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                        <WrenchScrewdriverIcon />
                        <span className="ml-2">{t('analytics.recommendations.title')}</span>
                    </h2>
                    <div className="space-y-3">
                        {data.recommendations.sort((a,b) => a.priority - b.priority).map((rec, index) => (
                            <div key={index} className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 flex items-start">
                                <span className={`mr-4 text-xs font-bold px-2 py-1 rounded-full ${rec.priority === 1 ? 'bg-red-500/20 text-red-300' : 'bg-yellow-500/20 text-yellow-300'}`}>{t('analytics.recommendation.priority')} {rec.priority}</span>
                                <p className="text-slate-300 flex-1">{rec.action}</p>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default AnalyticsDashboard;