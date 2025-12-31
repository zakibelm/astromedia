import React, { useState } from 'react';
import { useTranslation } from '../i18n/useTranslation';
import { DEPARTMENTS, AGENT_PROFILES } from '../constants/agents';
import { AgentStatus, AgentProfileData, NewCampaignFormData, GovernanceMode } from '../types';
import LanguageSwitcher from './LanguageSwitcher';
import Logo from './Logo';

// --- Components moved from MainContent for the unified cockpit ---

const LiveDashboard: React.FC<{ campaign: NewCampaignFormData }> = ({ campaign }) => {
    const { t } = useTranslation();
    const kpis = { ctr: '4.2%', roas: '3.8' };

    return (
        <div className="space-y-2">
            <div className="bg-[#1e1e36] p-3 rounded-md border border-slate-700">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{t('overview.dashboard.kpis')}</h4>
                <p className="text-lg font-semibold text-white">CTR: {kpis.ctr} | ROAS: {kpis.roas}</p>
            </div>
            <div className="bg-[#1e1e36] p-3 rounded-md border border-slate-700">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{t('overview.dashboard.objective')}</h4>
                <p className="text-sm font-semibold text-white leading-tight">{campaign.campaignGoals.objectives[0] || t('overview.dashboard.notDefined')}</p>
            </div>
            <div className="bg-[#1e1e36] p-3 rounded-md border border-slate-700">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{t('overview.dashboard.liveStatus')}</h4>
                <p className="text-sm font-semibold text-white">3 posts planifiés, 1 article en validation</p>
            </div>
        </div>
    );
};

const ProactiveInsights: React.FC = () => {
    const { t } = useTranslation();
    return (
        <div className="bg-[#2c2c4a] p-3 rounded-md border-l-4 border-amber-400">
            <p className="text-sm text-slate-300 mb-2">{t('overview.insights.insight1')}</p>
            <div className="flex flex-wrap gap-2">
                <button className="px-2 py-1 text-xs font-semibold text-slate-900 bg-amber-400 hover:bg-amber-500 rounded-md transition-colors">{t('overview.insights.approve')}</button>
                <button className="px-2 py-1 text-xs font-semibold text-white bg-slate-600/50 hover:bg-slate-500/50 rounded-md transition-colors">{t('overview.insights.reject')}</button>
                <button className="px-2 py-1 text-xs font-semibold text-white bg-slate-600/50 hover:bg-slate-500/50 rounded-md transition-colors">{t('overview.insights.regenerate')}</button>
            </div>
        </div>
    );
}


const AgentItem: React.FC<{ agent: AgentProfileData, isSubItem?: boolean }> = ({ agent, isSubItem = false }) => {
    const { t } = useTranslation();
    
    const statusStyles: Record<AgentStatus, { bg: string; text: string; dot: string; shadow: string }> = {
        active: { bg: 'bg-green-500/10', text: 'text-green-300', dot: 'bg-green-400', shadow: 'shadow-[0_0_8px_rgba(52,211,153,0.5)]' },
        waiting: { bg: 'bg-yellow-500/10', text: 'text-yellow-300', dot: 'bg-yellow-400', shadow: '' },
        inactive: { bg: 'bg-gray-500/10', text: 'text-gray-400', dot: 'bg-gray-500', shadow: '' },
    };

    const styles = statusStyles[agent.status];
    const dotAnimation = agent.status === 'active' ? 'animate-pulse' : '';

    return (
        <div className={`flex items-center p-2.5 rounded-lg ${isSubItem ? 'pl-8' : ''}`}>
            <div className="mr-3">{agent.icon}</div>
            <div className="flex-grow">
                <p className="font-semibold text-sm text-white">{t(agent.nameKey)}</p>
                <p className="text-xs text-gray-400">{t(agent.descriptionKey)}</p>
            </div>
            <div className={`text-xs font-medium px-2.5 py-1 rounded-full ${styles.text} shrink-0`}>
                 <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${styles.dot} ${dotAnimation} ${styles.shadow}`}></span>
                 {t(`agent.status.${agent.status}`)}
            </div>
        </div>
    );
}

// --- Modals for Cockpit Interactivity ---

const AgentStatusModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { t } = useTranslation();
    const statuses: AgentStatus[] = ['active', 'waiting', 'inactive'];
    const agentsByStatus = statuses.map(status => ({
        status,
        agents: AGENT_PROFILES.filter(a => a.status === status)
    }));

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center animate-fade-in" onClick={onClose}>
            <div className="bg-[#160e1b] rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-slate-700" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">{t('modals.agents.title')}</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl leading-none">&times;</button>
                </div>
                <div className="p-2 flex-grow overflow-y-auto">
                    {agentsByStatus.map(({ status, agents }) => (
                        <div key={status} className="p-4">
                            <h3 className="font-semibold text-gray-400 uppercase tracking-wider text-sm mb-2">{t(`agent.status.${status}`)} ({agents.length})</h3>
                            <div className="space-y-1">
                                {agents.length > 0 ? agents.map(agent => <AgentItem key={agent.id} agent={agent} />) : <p className="text-slate-500 text-sm px-2.5 italic">No agents with this status.</p>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
};

const CampaignProgressModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { t } = useTranslation();
    const phases = [
      { nameKey: 'phases.strategy', status: 'completed' },
      { nameKey: 'phases.creative', status: 'inprogress' },
      { nameKey: 'phases.distribution', status: 'pending' },
      { nameKey: 'phases.feedback', status: 'pending' },
    ];
    const statusStyles = {
        completed: { text: 'text-green-400', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
        inprogress: { text: 'text-yellow-400', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
        pending: { text: 'text-gray-400', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center animate-fade-in" onClick={onClose}>
            <div className="bg-[#160e1b] rounded-lg shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col border border-slate-700" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">{t('modals.progress.title')}</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl leading-none">&times;</button>
                </div>
                <div className="p-6 flex-grow overflow-y-auto">
                    <ol className="relative border-l border-slate-700">
                        {phases.map((phase, index) => {
                            const styles = statusStyles[phase.status as keyof typeof statusStyles];
                            return (
                                <li key={index} className="mb-10 ml-6">
                                    <span className={`absolute flex items-center justify-center w-6 h-6 bg-slate-800 rounded-full -left-3 ring-8 ring-[#160e1b] ${styles.text}`}>
                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d={styles.icon} clipRule="evenodd"></path></svg>
                                    </span>
                                    <h3 className="flex items-center mb-1 text-lg font-semibold text-white">{t(phase.nameKey)}</h3>
                                    <p className={`block mb-2 text-sm font-normal leading-none ${styles.text}`}>{t(`phases.status.${phase.status}`)}</p>
                                </li>
                            );
                        })}
                    </ol>
                </div>
            </div>
        </div>
    )
};


const CockpitView: React.FC<{ 
    onOpenAgentsModal: () => void, 
    onOpenProgressModal: () => void, 
    campaign: NewCampaignFormData | null,
    setCampaign: React.Dispatch<React.SetStateAction<NewCampaignFormData | null>>,
    onNewCampaign: () => void;
}> = ({ onOpenAgentsModal, onOpenProgressModal, campaign, setCampaign, onNewCampaign }) => {
    const { t } = useTranslation();
    const activeAgents = AGENT_PROFILES.filter(a => a.status === 'active').length;
    const totalAgents = AGENT_PROFILES.length;
    const campaignProgress = 40; // Hardcoded for demo
    const [isGovernanceOpen, setIsGovernanceOpen] = useState(false);

    const governanceStyles: Record<GovernanceMode, { text: string; dot: string; labelKey: string }> = {
        'follow': { text: 'text-green-400', dot: 'bg-green-400', labelKey: 'governance.follow' },
        'semi-auto': { text: 'text-yellow-400', dot: 'bg-yellow-400', labelKey: 'governance.semi-auto' },
        'full': { text: 'text-blue-400', dot: 'bg-blue-400', labelKey: 'governance.full' },
    };
    
    const handleModeChange = (mode: GovernanceMode) => {
        if (campaign) {
            setCampaign({ ...campaign, governanceMode: mode });
        }
        setIsGovernanceOpen(false);
    }

    return (
        <div className="mb-6 p-4 bg-[#15152b] rounded-lg border border-slate-800">
             <h2 className="text-lg font-bold text-amber-400 mb-4">{t('sidebar.cockpit.title')}</h2>
             
             {campaign ? (
                // --- ACTIVE CAMPAIGN VIEW ---
                <div className="space-y-3">
                    <button onClick={onOpenAgentsModal} className="w-full text-left p-2 rounded-md hover:bg-white/5 transition-colors">
                        <div className="flex justify-between items-center text-sm mb-1">
                            <span className="text-slate-300">{t('sidebar.cockpit.activeAgents')}</span>
                            <span className="font-semibold text-white">{activeAgents} / {totalAgents}</span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-1.5">
                            <div className="bg-cyan-400 h-1.5 rounded-full transition-all duration-500 ease-in-out animate-pulse" style={{width: `${(activeAgents/totalAgents)*100}%`}}></div>
                        </div>
                    </button>
                    <button onClick={onOpenProgressModal} className="w-full text-left p-2 rounded-md hover:bg-white/5 transition-colors">
                        <div className="flex justify-between items-center text-sm mb-1">
                            <span className="text-slate-300">{t('sidebar.cockpit.campaignProgress')}</span>
                            <span className="font-semibold text-white">{campaignProgress}%</span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-1.5 flex overflow-hidden">
                            <div className="bg-green-500 h-full transition-all duration-500 ease-in-out" style={{width: '25%'}}></div>
                            <div className="bg-yellow-500 h-full transition-all duration-500 ease-in-out" style={{width: '15%'}}></div>
                        </div>
                    </button>
                    <div className="relative p-2">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-300">{t('sidebar.cockpit.governanceMode')}</span>
                            <button onClick={() => setIsGovernanceOpen(!isGovernanceOpen)} className={`font-semibold ${governanceStyles[campaign.governanceMode].text} flex items-center p-1 rounded-md hover:bg-white/10`}>
                                <span className={`inline-block w-2 h-2 rounded-full mr-2 ${governanceStyles[campaign.governanceMode].dot}`}></span>
                                {t(governanceStyles[campaign.governanceMode].labelKey)}
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </button>
                        </div>
                        {isGovernanceOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-[#2a1d35] border border-slate-700 rounded-md shadow-lg z-10 animate-fade-in-up-sm">
                                {(Object.keys(governanceStyles) as GovernanceMode[]).map(mode => (
                                    <button key={mode} onClick={() => handleModeChange(mode)} className="w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 flex items-center">
                                        <span className={`inline-block w-2 h-2 rounded-full mr-3 ${governanceStyles[mode].dot}`}></span>
                                        {t(governanceStyles[mode].labelKey)}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="border-t border-slate-700/50 my-3"></div>
                    <LiveDashboard campaign={campaign} />
                    <div className="border-t border-slate-700/50 my-3"></div>
                    <ProactiveInsights />
                </div>
             ) : (
                // --- EMPTY STATE VIEW ---
                <div className="space-y-3">
                    <div className="w-full text-left p-2 rounded-md opacity-60 cursor-default">
                        <div className="flex justify-between items-center text-sm mb-1">
                            <span className="text-slate-300">{t('sidebar.cockpit.activeAgents')}</span>
                            <span className="font-semibold text-white">0 / {totalAgents}</span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-1.5">
                            <div className="bg-cyan-400 h-1.5 rounded-full" style={{width: '0%'}}></div>
                        </div>
                    </div>
                    <div className="w-full text-left p-2 rounded-md opacity-60 cursor-default">
                        <div className="flex justify-between items-center text-sm mb-1">
                            <span className="text-slate-300">{t('sidebar.cockpit.campaignProgress')}</span>
                            <span className="font-semibold text-white">0%</span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-1.5"></div>
                    </div>
                    <div className="pt-6 text-center border-t border-slate-700/50 mt-4">
                        <p className="text-sm text-slate-400 mb-4">{t('sidebar.cockpit.noCampaign')}</p>
                        <button onClick={onNewCampaign} className="w-full bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 font-semibold py-2.5 px-4 rounded-md hover:from-amber-500 hover:to-orange-600 transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-orange-500/20 transform hover:-translate-y-px flex items-center justify-center text-sm animate-gradient">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            {t('sidebar.button.newCampaign')}
                        </button>
                    </div>
                </div>
             )}
        </div>
    )
}

const DepartmentList: React.FC = () => {
    const { t } = useTranslation();
    const [openDepartment, setOpenDepartment] = useState<string | null>('strategy');

    const toggleDepartment = (key: string) => {
        setOpenDepartment(prev => (prev === key ? null : key));
    };
    
    return (
        <>
            <div className="flex justify-between items-center mt-6 mb-3 px-2">
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">{t('sidebar.agents.title')}</h2>
            </div>
            <nav className="space-y-1.5 flex-grow">
                {DEPARTMENTS.map(dept => {
                    const isOpen = openDepartment === dept.key;
                    const specializedAgents = AGENT_PROFILES.filter(agent => agent.departmentKey === dept.key);
                    return (
                        <div key={dept.key}>
                            <button onClick={() => toggleDepartment(dept.key)} className="w-full flex items-center p-2.5 rounded-lg transition-colors hover:bg-white/5 text-left">
                                <div className="mr-3">{dept.icon}</div>
                                <div className="flex-grow">
                                    <p className="font-semibold text-sm text-white">{t(dept.nameKey)}</p>
                                    <p className="text-xs text-gray-400">{t(dept.descriptionKey)}</p>
                                </div>
                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-gray-400 transition-transform transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                            {isOpen && (
                                <div className="py-1 space-y-1">
                                    {specializedAgents.map(agent => (
                                        <AgentItem key={agent.id} agent={agent} isSubItem />
                                    ))}
                                </div>
                            )}
                        </div>
                    )
                })}
            </nav>
        </>
    )
}


interface SidebarProps {
    onNewCampaign: () => void;
    activeCampaign: NewCampaignFormData | null;
    setActiveCampaign: React.Dispatch<React.SetStateAction<NewCampaignFormData | null>>;
}

const Sidebar: React.FC<SidebarProps> = ({ onNewCampaign, activeCampaign, setActiveCampaign }) => {
  const { t } = useTranslation();
  const [modalView, setModalView] = useState<'agents' | 'progress' | null>(null);

  return (
    <aside className="w-96 bg-[#160e1b] flex flex-col p-4 border-r border-white/10 shrink-0 overflow-y-auto">
      <div className="flex items-center justify-between mb-6 p-2">
        <div className="flex items-center space-x-3">
            <Logo size="sm" />
            <div>
                <h1 className="text-lg font-bold text-white">
                    Astro<span className="text-amber-400 [text-shadow:1px_1px_#b91c1c]">Media</span>
                </h1>
                <p className="text-xs text-gray-400">{t('app.subtitle')}</p>
            </div>
        </div>
        <LanguageSwitcher />
      </div>
      
      <CockpitView 
          onOpenAgentsModal={() => setModalView('agents')}
          onOpenProgressModal={() => setModalView('progress')}
          campaign={activeCampaign}
          setCampaign={setActiveCampaign}
          onNewCampaign={onNewCampaign}
      />
      <DepartmentList />
      
      {modalView === 'agents' && <AgentStatusModal onClose={() => setModalView(null)} />}
      {modalView === 'progress' && <CampaignProgressModal onClose={() => setModalView(null)} />}
    </aside>
  );
};

export default Sidebar;