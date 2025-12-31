import React from 'react';
import { useTranslation } from '../../i18n/useTranslation';
import { AGENT_PROFILES } from '../../constants/agents';
import { galleryService } from '../../services/galleryService';

const AgentGallery: React.FC<{ onCreate: () => void }> = ({ onCreate }) => {
    const { t } = useTranslation();
    const [agents, setAgents] = React.useState<any[]>([]);

    React.useEffect(() => {
        const fetchAgents = async () => {
            try {
                const customAgents = await galleryService.getAgents();
                setAgents([...AGENT_PROFILES, ...customAgents]);
            } catch (err) {
                console.error(err);
                setAgents(AGENT_PROFILES);
            }
        };
        fetchAgents();
    }, []);

    return (
        <div className="h-full bg-[#160e1b] overflow-y-auto animate-fade-in p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-white mb-2">Galerie Agents AI</h2>
                    <p className="text-slate-400">Explorez et configurez vos agents intelligents spécialisés.</p>
                </div>
                <button
                    onClick={onCreate}
                    className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg hover:shadow-purple-500/20 transform hover:-translate-y-1 transition-all"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                    <span>Nouvel Agent</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {agents.map((agent) => (
                    <div key={agent.id} className="bg-[#1e152a] rounded-2xl p-6 border border-white/5 hover:border-purple-500/50 transition-colors group relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="text-gray-400 hover:text-white"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg></button>
                        </div>

                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center text-4xl mb-4 shadow-inner">
                            {agent.icon}
                        </div>

                        <h3 className="text-lg font-bold text-white mb-1">{t(agent.nameKey)}</h3>
                        <p className="text-xs text-purple-400 font-semibold uppercase tracking-wider mb-3">Département {agent.departmentKey}</p>
                        <p className="text-sm text-slate-400 line-clamp-3 mb-6 min-h-[60px]">{t(agent.descriptionKey)}</p>

                        <div className="flex items-center justify-between">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${agent.status === 'active' ? 'bg-green-900/30 text-green-400' : 'bg-slate-700 text-slate-400'}`}>
                                {agent.status === 'active' ? 'Actif' : 'Inactif'}
                            </span>
                            <button className="text-sm font-semibold text-white group-hover:text-purple-400 transition-colors flex items-center">
                                Configurer <svg className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AgentGallery;
