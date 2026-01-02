import React from 'react';
import { useTranslation } from '../../i18n/useTranslation';
import { AGENT_PROFILES, DEPARTMENTS } from '../../constants/agents';

const AgentTeam: React.FC = () => {
    const { t } = useTranslation();

    return (
        <div className="h-full bg-dark-space overflow-x-auto overflow-y-hidden p-8 flex flex-col">
            <div className="mb-8 shrink-0">
                <h2 className="text-3xl font-bold text-white mb-2">Équipe d'Agents AI</h2>
                <p className="text-slate-400">Vue d'ensemble de votre force de travail numérique organisée par départements.</p>
            </div>

            <div className="flex space-x-6 h-full pb-4">
                {DEPARTMENTS.map((dept) => {
                    const deptAgents = AGENT_PROFILES.filter(a => a.departmentKey === dept.key);

                    return (
                        <div key={dept.key} className="flex-shrink-0 w-80 flex flex-col bg-dark-space-mid rounded-xl border border-astro-amber-500/10 h-full">
                            {/* Department Header */}
                            <div className="p-4 border-b border-astro-amber-500/10 bg-white/5 rounded-t-xl">
                                <div className="flex items-center space-x-3 mb-1">
                                    <div className="p-2 bg-dark-space rounded-lg">
                                        {dept.icon}
                                    </div>
                                    <h3 className="font-bold text-white text-lg">{t(dept.nameKey)}</h3>
                                </div>
                                <p className="text-xs text-gray-400 pl-1">{t(dept.descriptionKey)}</p>
                            </div>

                            {/* Agents List */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                                {deptAgents.map(agent => (
                                    <div key={agent.id} className="bg-dark-space-mid/50 p-4 rounded-xl border border-astro-amber-500/10 hover:border-astro-amber-500/30 transition-all group">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center text-xl">
                                                {agent.icon}
                                            </div>
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide border ${agent.status === 'active'
                                                ? 'bg-emerald-900/20 text-emerald-400 border-emerald-900/30'
                                                : agent.status === 'waiting'
                                                    ? 'bg-astro-amber-900/20 text-astro-amber-400 border-astro-amber-900/30'
                                                    : 'bg-gray-800 text-gray-500 border-gray-700'
                                                }`}>
                                                {agent.status === 'active' ? t('agent.status.active') : agent.status === 'waiting' ? t('agent.status.waiting') : t('agent.status.inactive')}
                                            </span>
                                        </div>

                                        <h4 className="font-bold text-white mb-1">{t(agent.nameKey)}</h4>
                                        <p className="text-xs text-slate-400 mb-3 line-clamp-2">{t(agent.descriptionKey)}</p>

                                        <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                                            <span className="text-[10px] text-slate-500 font-mono">ID: {agent.id}</span>
                                            {/* Future Action Button could go here */}
                                        </div>
                                    </div>
                                ))}
                                {deptAgents.length === 0 && (
                                    <div className="text-center py-8 opacity-50">
                                        <p className="text-sm text-slate-500 italic">Aucun agent assigné</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default AgentTeam;
