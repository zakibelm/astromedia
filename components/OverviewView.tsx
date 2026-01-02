import React from 'react';
import { useTranslation } from '../i18n/useTranslation';

const OverviewView: React.FC<{ onCreateCampaign: () => void }> = ({ onCreateCampaign }) => {
    const { t } = useTranslation();

    const stats = [
        { label: "Campagnes Actives", value: "0", change: "+0%", color: "text-blue-400" },
        { label: "Agents Disponibles", value: "8", change: "Ready", color: "text-emerald-400" },
        { label: "Engagement Global", value: "0%", change: "--", color: "text-purple-400" },
        { label: "Budget Utilisé", value: "0 $", change: "0%", color: "text-amber-400" },
    ];

    return (
        <div className="p-8 h-full overflow-y-auto bg-gradient-to-br from-dark-space to-dark-space-mid">
            {/* Header Section */}
            <div className="flex justify-between items-end mb-10">
                <div>
                    <h1 className="text-4xl font-extrabold text-white tracking-tight uppercase">
                        Commande <span className="text-transparent bg-clip-text bg-gradient-to-r from-astro-amber-400 to-orange-600">Système</span>
                    </h1>
                    <p className="text-gray-400 mt-2 font-light">Hub global d'orchestration et de supervision des intelligences artificielles.</p>
                </div>
                <button
                    onClick={onCreateCampaign}
                    className="group relative px-8 py-4 bg-white text-dark-space font-bold text-lg rounded-none skew-x-[-10deg] hover:bg-astro-amber-400 transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(245,158,11,0.6)]"
                >
                    <span className="block skew-x-[10deg]">INITIER CAMPAGNE</span>
                    <div className="absolute inset-0 border border-white group-hover:border-astro-amber-900 transform translate-x-1 translate-y-1 -z-10 transition-colors"></div>
                </button>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                {stats.map((stat, idx) => (
                    <div key={idx} className="bg-dark-space-mid/80 backdrop-blur-md border border-astro-amber-500/10 p-6 relative overflow-hidden group hover:border-astro-amber-500/50 transition-colors">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-white/5 to-transparent rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
                        <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2">{stat.label}</h3>
                        <div className="flex items-baseline space-x-2">
                            <span className="text-3xl font-bold text-white">{stat.value}</span>
                            <span className={`text-xs font-medium ${stat.color}`}>{stat.change}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Operational View - Placeholder for Charts/Map */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-96">
                <div className="lg:col-span-2 bg-dark-space-mid border border-astro-amber-500/10 p-6 relative flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-white font-bold uppercase tracking-wider text-sm flex items-center">
                            <span className="w-2 h-2 bg-astro-amber-500 rounded-full mr-2 animate-pulse"></span>
                            Intelligence d'Engagement
                        </h3>
                        <div className="flex space-x-2">
                            {['1H', '24H', '7J', '30J'].map(period => (
                                <button key={period} className="text-[10px] font-bold text-gray-500 hover:text-white px-2 py-1 border border-white/5 hover:border-white/20 transition-colors">{period}</button>
                            ))}
                        </div>
                    </div>
                    {/* Fake Chart Visualization */}
                    <div className="flex-1 flex items-end justify-between px-4 space-x-2 opacity-50">
                        {[40, 65, 30, 80, 55, 90, 45, 70, 35, 60, 25, 50, 75, 40, 65].map((h, i) => (
                            <div key={i} className="w-full bg-gradient-to-t from-astro-amber-900/50 to-astro-amber-500/20 hover:to-astro-amber-500/60 transition-all duration-300 rounded-t-sm relative group" style={{ height: `${h}%` }}>
                                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-[10px] px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-white/10 z-10">
                                    Data Point {i}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-dark-space-mid border border-astro-amber-500/10 p-6 flex flex-col">
                    <h3 className="text-white font-bold uppercase tracking-wider text-sm mb-6">Flux d'Activité Récent</h3>
                    <div className="flex-1 space-y-4 overflow-hidden relative">
                        <div className="absolute top-0 left-2 bottom-0 w-px bg-white/5"></div>
                        {[
                            { time: "10:42", text: "Système initialisé", type: "info" },
                            { time: "10:45", text: "Connexion sécurisée établie", type: "success" },
                            { time: "11:00", text: "Mise à jour des agents...", type: "warning" },
                            { time: "11:02", text: "Prêt pour nouvelle campagne", type: "info" },
                        ].map((log, i) => (
                            <div key={i} className="flex items-start pl-6 relative">
                                <div className={`absolute left-[5px] top-1.5 w-1.5 h-1.5 rounded-full ${log.type === 'success' ? 'bg-emerald-500' : log.type === 'warning' ? 'bg-astro-amber-500' : 'bg-astro-cyan-500'
                                    }`}></div>
                                <div>
                                    <span className="text-[10px] text-gray-500 block mb-0.5 font-mono">{log.time}</span>
                                    <span className="text-sm text-gray-300">{log.text}</span>
                                </div>
                            </div>
                        ))}
                        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-dark-space-mid to-transparent pointer-events-none"></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OverviewView;