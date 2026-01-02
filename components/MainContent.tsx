import React, { useState, ChangeEvent, useEffect } from 'react';
import { CampaignView, NewCampaignFormData, WorkflowState, GovernanceMode, AgentConfiguration, Criteria, KnowledgeFile } from '../types';
import OverviewView from './OverviewView';
import WorkflowView from './WorkflowView';
import AnalyticsDashboard from './AnalyticsDashboard';
import KnowledgeBaseView from './KnowledgeBaseView'; // NEW
import { useTranslation } from '../i18n/useTranslation';
import { AnalyticsOutput } from '../services/agentSchemas';
import { getCampaignLogger } from '../services/orchestration/orchestrator';
import { AGENT_PROFILES } from '../constants/agents';
import InteractiveConsole from './InteractiveConsole';

interface ModalProps {
    onClose: () => void;
    onLaunch: (formData: NewCampaignFormData) => void;
}

const initialAgentConfiguration = AGENT_PROFILES.reduce((acc, agent) => {
    acc[agent.id] = { criteria: 'balanced', customInstructions: '' };
    return acc;
}, {} as Record<string, AgentConfiguration>);

const initialFormData: NewCampaignFormData = {
    projectName: '',
    companyInfo: { name: '', sector: '', size: '1-10', website: '' },
    campaignGoals: {
        objectives: [],
        targetAudience: '',
        budget: { amount: '', currency: 'USD' },
        duration: ''
    },
    brandIdentity: { priorityChannels: [], tone: '', brandValues: '', socialLinks: '' },
    governanceMode: 'semi-auto',
    analysisDepth: 'quick',
    agentConfiguration: initialAgentConfiguration, // NEW
    ragEnabled: true, // NEW
};

const FormInput: React.FC<{ labelKey: string; name: string; value: string; onChange: (e: ChangeEvent<HTMLInputElement>) => void; placeholderKey?: string; type?: string; required?: boolean; }> =
    ({ labelKey, name, value, onChange, placeholderKey, type = 'text', required = true }) => {
        const { t } = useTranslation();
        return (
            <div>
                <label htmlFor={name} className="block text-sm font-medium text-gray-300 mb-1">{t(labelKey)} {required ? '' : `(${t('modal.form.optional')})`}</label>
                <input
                    type={type}
                    id={name}
                    name={name}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholderKey ? t(placeholderKey) : ''}
                    required={required}
                    className="w-full bg-dark-space-mid border border-astro-amber-500/20 rounded-md px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-astro-amber-500 focus:border-transparent transition-all"
                />
            </div>
        );
    };

const FormTextarea: React.FC<{ labelKey: string; name: string; value: string; onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void; placeholderKey?: string; rows?: number; required?: boolean; }> =
    ({ labelKey, name, value, onChange, placeholderKey, rows = 3, required = true }) => {
        const { t } = useTranslation();
        return (
            <div>
                <label htmlFor={name} className="block text-sm font-medium text-gray-300 mb-1">{t(labelKey)} {required ? '' : `(${t('modal.form.optional')})`}</label>
                <textarea
                    id={name}
                    name={name}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholderKey ? t(placeholderKey) : ''}
                    rows={rows}
                    required={required}
                    className="w-full bg-dark-space-mid border border-astro-amber-500/20 rounded-md px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-astro-amber-500 focus:border-transparent transition-all"
                />
            </div>
        );
    };

const FormCheckboxGroup: React.FC<{ labelKey: string; name: string; options: { value: string; labelKey: string }[]; selected: string[]; onChange: (name: string, value: string) => void; }> =
    ({ labelKey, name, options, selected, onChange }) => {
        const { t } = useTranslation();
        return (
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">{t(labelKey)}</label>
                <div className="grid grid-cols-2 gap-2">
                    {options.map(option => (
                        <label key={option.value} className="flex items-center space-x-2 bg-dark-space-mid p-3 rounded-md border border-astro-amber-500/20 hover:border-astro-amber-500/50 transition-colors cursor-pointer group">
                            <input
                                type="checkbox"
                                name={name}
                                value={option.value}
                                checked={selected.includes(option.value)}
                                onChange={() => onChange(name, option.value)}
                                className="h-4 w-4 rounded border-gray-600 bg-dark-space text-astro-amber-500 focus:ring-astro-amber-500"
                            />
                            <span className="text-sm text-gray-200 group-hover:text-white transition-colors">{t(option.labelKey)}</span>
                        </label>
                    ))}
                </div>
            </div>
        );
    };

const FormRadioGroup: React.FC<{ labelKey: string; name: string; options: { value: string; labelKey: string }[]; selected: string; onChange: (e: ChangeEvent<HTMLInputElement>) => void; }> =
    ({ labelKey, name, options, selected, onChange }) => {
        const { t } = useTranslation();
        return (
            <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">{t(labelKey)}</label>
                <div className="flex space-x-4">
                    {options.map(option => (
                        <label key={option.value} className="flex items-center space-x-2 cursor-pointer">
                            <input
                                type="radio"
                                name={name}
                                value={option.value}
                                checked={selected === option.value}
                                onChange={onChange}
                                className="h-4 w-4 border-gray-600 bg-slate-700 text-amber-500 focus:ring-amber-500"
                            />
                            <span className="text-sm text-slate-200">{t(option.labelKey)}</span>
                        </label>
                    ))}
                </div>
            </div>
        )
    }


const NewCampaignModal: React.FC<ModalProps> = ({ onClose, onLaunch }) => {
    const { t } = useTranslation();
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState<NewCampaignFormData>(initialFormData);
    const totalSteps = 4;

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>, section?: keyof NewCampaignFormData, subkey?: string) => {
        const { name, value, type } = e.target;
        const isCheckbox = type === 'checkbox';
        // FIX: Cannot read properties of undefined (reading 'checked')
        const checked = isCheckbox ? (e.target as HTMLInputElement).checked : undefined;

        if (section) {
            if (subkey) { // Handle nested objects like budget
                setFormData(prev => ({
                    ...prev,
                    [section]: {
                        ...(prev[section] as any),
                        [subkey]: {
                            ...((prev[section] as any)[subkey]),
                            [name]: value
                        }
                    }
                }));
            } else {
                setFormData(prev => ({
                    ...prev,
                    [section]: {
                        ...(prev[section] as object),
                        [name]: value,
                    }
                }));
            }
        } else {
            setFormData(prev => ({ ...prev, [name]: isCheckbox ? checked : value as any }));
        }
    };

    const handleMultiSelectChange = (section: 'campaignGoals' | 'brandIdentity', name: string, value: string) => {
        setFormData(prev => {
            const currentValues = (prev[section] as any)[name] as string[];
            const newValues = currentValues.includes(value)
                ? currentValues.filter(v => v !== value)
                : [...currentValues, value];

            return {
                ...prev,
                [section]: {
                    ...(prev[section] as object),
                    [name]: newValues,
                }
            };
        });
    };

    const handleAgentConfigChange = (agentId: string, field: keyof AgentConfiguration, value: string) => {
        setFormData(prev => ({
            ...prev,
            agentConfiguration: {
                ...prev.agentConfiguration,
                [agentId]: {
                    ...prev.agentConfiguration[agentId],
                    [field]: value
                }
            }
        }));
    };

    const nextStep = () => setStep(prev => Math.min(prev + 1, totalSteps));
    const prevStep = () => setStep(prev => Math.max(prev - 1, 1));
    const handleLaunch = () => onLaunch(formData);

    const STEPS_CONFIG = {
        objectives: [
            { value: 'notoriety', labelKey: 'modal.options.objectives.notoriety' },
            { value: 'acquisition', labelKey: 'modal.options.objectives.acquisition' },
            { value: 'loyalty', labelKey: 'modal.options.objectives.loyalty' },
            { value: 'sales', labelKey: 'modal.options.objectives.sales' },
        ],
        channels: [
            { value: 'tiktok', labelKey: 'modal.options.channels.tiktok' },
            { value: 'instagram', labelKey: 'modal.options.channels.instagram' },
            { value: 'linkedin', labelKey: 'modal.options.channels.linkedin' },
            { value: 'blog', labelKey: 'modal.options.channels.blog' },
        ],
        analysis: [
            { value: 'quick', labelKey: 'modal.options.analysis.quick' },
            { value: 'detailed', labelKey: 'modal.options.analysis.detailed' },
        ],
        criteria: [
            { value: 'balanced', labelKey: 'modal.options.criteria.balanced' },
            { value: 'quality', labelKey: 'modal.options.criteria.quality' },
            { value: 'speed', labelKey: 'modal.options.criteria.speed' },
            { value: 'cost', labelKey: 'modal.options.criteria.cost' },
        ]
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center animate-fade-in" onClick={onClose}>
            <div className="bg-dark-space rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col border border-astro-amber-500/20" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-astro-amber-500/10">
                    <h2 className="text-xl font-bold text-white">{t('modal.newCampaign.title')}</h2>
                    <p className="text-sm text-gray-400">{t('modal.newCampaign.subtitle')}</p>
                </div>

                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-semibold text-astro-amber-400">{t(`modal.newCampaign.step${step}.title`)}</span>
                        <span className="text-sm text-gray-400">{t('modal.newCampaign.stepProgress', { current: step, total: totalSteps })}</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-1.5">
                        <div className="bg-astro-amber-400 h-1.5 rounded-full transition-all duration-500 ease-in-out" style={{ width: `${(step / totalSteps) * 100}%` }}></div>
                    </div>
                </div>

                <div className="p-6 flex-grow overflow-y-auto space-y-4">
                    {step === 1 && (
                        <>
                            <FormInput labelKey="modal.newCampaign.step1.projectName" name="projectName" value={formData.projectName} onChange={(e) => handleChange(e)} placeholderKey="modal.newCampaign.step1.projectNamePlaceholder" />
                            <FormInput labelKey="modal.newCampaign.step1.companyName" name="name" value={formData.companyInfo.name} onChange={(e) => handleChange(e, 'companyInfo')} placeholderKey="modal.newCampaign.step1.companyNamePlaceholder" />
                            <FormInput labelKey="modal.newCampaign.step1.sector" name="sector" value={formData.companyInfo.sector} onChange={(e) => handleChange(e, 'companyInfo')} placeholderKey="modal.newCampaign.step1.sectorPlaceholder" />
                            <FormInput labelKey="modal.newCampaign.step1.website" name="website" value={formData.companyInfo.website || ''} onChange={(e) => handleChange(e, 'companyInfo')} placeholderKey="modal.newCampaign.step1.websitePlaceholder" required={false} />
                            <div>
                                <label htmlFor="size" className="block text-sm font-medium text-gray-300 mb-1">{t('modal.newCampaign.step1.size')}</label>
                                <select name="size" id="size" value={formData.companyInfo.size} onChange={(e) => handleChange(e, 'companyInfo')} className="w-full bg-dark-space-mid border border-astro-amber-500/20 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-astro-amber-500">
                                    <option value="1-10">1-10 employés</option>
                                    <option value="11-50">11-50 employés</option>
                                    <option value="51-200">51-200 employés</option>
                                    <option value="200+">200+ employés</option>
                                </select>
                            </div>
                            <FormRadioGroup labelKey="modal.newCampaign.step1.analysisDepth" name="analysisDepth" options={STEPS_CONFIG.analysis} selected={formData.analysisDepth} onChange={(e) => handleChange(e)} />
                        </>
                    )}
                    {step === 2 && (
                        <>
                            <FormCheckboxGroup labelKey="modal.newCampaign.step2.objectives" name="objectives" options={STEPS_CONFIG.objectives} selected={formData.campaignGoals.objectives} onChange={(name, value) => handleMultiSelectChange('campaignGoals', name, value)} />
                            <FormTextarea labelKey="modal.newCampaign.step2.targetAudience" name="targetAudience" value={formData.campaignGoals.targetAudience} onChange={(e) => handleChange(e, 'campaignGoals')} placeholderKey="modal.newCampaign.step2.targetAudiencePlaceholder" />
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">{t('modal.newCampaign.step2.budget')}</label>
                                    <div className="flex">
                                        <input
                                            type="number"
                                            name="amount"
                                            value={formData.campaignGoals.budget.amount}
                                            onChange={(e) => handleChange(e, 'campaignGoals', 'budget')}
                                            placeholder={t('modal.newCampaign.step2.budgetAmountPlaceholder') || ''}
                                            className="w-full rounded-l-md bg-dark-space-mid border border-astro-amber-500/20 px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-astro-amber-500"
                                        />
                                        <select
                                            name="currency"
                                            value={formData.campaignGoals.budget.currency}
                                            onChange={(e) => handleChange(e, 'campaignGoals', 'budget')}
                                            className="rounded-r-md bg-gray-800 border-y border-r border-astro-amber-500/20 px-3 text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-astro-amber-500"
                                        >
                                            <option value="USD">USD</option>
                                            <option value="CAD">CAD</option>
                                        </select>
                                    </div>
                                </div>
                                <FormInput labelKey="modal.newCampaign.step2.duration" name="duration" value={formData.campaignGoals.duration} onChange={(e) => handleChange(e, 'campaignGoals')} placeholderKey="modal.newCampaign.step2.durationPlaceholder" type="number" />
                            </div>
                        </>
                    )}
                    {step === 3 && (
                        <>
                            <FormCheckboxGroup labelKey="modal.newCampaign.step3.priorityChannels" name="priorityChannels" options={STEPS_CONFIG.channels} selected={formData.brandIdentity.priorityChannels} onChange={(name, value) => handleMultiSelectChange('brandIdentity', name, value)} />
                            <FormInput labelKey="modal.newCampaign.step3.tone" name="tone" value={formData.brandIdentity.tone} onChange={(e) => handleChange(e, 'brandIdentity')} placeholderKey="modal.newCampaign.step3.tonePlaceholder" />
                            <FormTextarea labelKey="modal.newCampaign.step3.brandValues" name="brandValues" value={formData.brandIdentity.brandValues} onChange={(e) => handleChange(e, 'brandIdentity')} placeholderKey="modal.newCampaign.step3.brandValuesPlaceholder" />
                            <FormTextarea labelKey="modal.newCampaign.step3.socialLinks" name="socialLinks" value={formData.brandIdentity.socialLinks || ''} onChange={(e) => handleChange(e, 'brandIdentity')} placeholderKey="modal.newCampaign.step3.socialLinksPlaceholder" required={false} />
                        </>
                    )}
                    {step === 4 && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-white">{t('modal.newCampaign.step4.agentConfigTitle')}</h3>
                                <p className="text-sm text-slate-400">{t('modal.newCampaign.step4.agentConfigDesc')}</p>
                            </div>

                            <label className="flex items-center justify-between p-3 bg-slate-800 rounded-lg border border-slate-700 cursor-pointer">
                                <span className="font-semibold text-slate-200">{t('modal.newCampaign.step4.ragToggle')}</span>
                                <div className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" name="ragEnabled" checked={formData.ragEnabled} onChange={(e) => handleChange(e)} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-slate-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-amber-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                                </div>
                            </label>

                            <div className="space-y-4">
                                {AGENT_PROFILES.map(agent => (
                                    <div key={agent.id} className="p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                                        <div className="flex items-center mb-3">
                                            <div className="mr-3">{agent.icon}</div>
                                            <p className="font-semibold text-white">{t(agent.nameKey)}</p>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label htmlFor={`${agent.id}-criteria`} className="block text-xs font-medium text-slate-300 mb-1">{t('modal.newCampaign.step4.priority')}</label>
                                                <select
                                                    id={`${agent.id}-criteria`}
                                                    value={formData.agentConfiguration[agent.id]?.criteria || 'balanced'}
                                                    onChange={(e) => handleAgentConfigChange(agent.id, 'criteria', e.target.value)}
                                                    className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                                                >
                                                    {STEPS_CONFIG.criteria.map(c => <option key={c.value} value={c.value}>{t(c.labelKey)}</option>)}
                                                </select>
                                            </div>
                                            <div className="md:col-span-2">
                                                <label htmlFor={`${agent.id}-instructions`} className="block text-xs font-medium text-slate-300 mb-1">{t('modal.newCampaign.step4.customInstructions')}</label>
                                                <textarea
                                                    id={`${agent.id}-instructions`}
                                                    rows={2}
                                                    value={formData.agentConfiguration[agent.id]?.customInstructions || ''}
                                                    onChange={(e) => handleAgentConfigChange(agent.id, 'customInstructions', e.target.value)}
                                                    placeholder={t('modal.newCampaign.step4.customInstructionsPlaceholder')}
                                                    className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-astro-amber-500/10 flex justify-between items-center">
                    <button onClick={onClose} className="px-5 py-2 text-sm bg-gray-800 text-white rounded-md font-semibold hover:bg-gray-700 transition-colors">
                        {t('modal.buttons.cancel')}
                    </button>
                    <div className="flex items-center space-x-4">
                        {step > 1 && (
                            <button onClick={prevStep} className="px-5 py-2 text-sm bg-gray-800 text-white rounded-md font-semibold hover:bg-gray-700 transition-colors">
                                {t('modal.buttons.previous')}
                            </button>
                        )}
                        {step < totalSteps && (
                            <button onClick={nextStep} className="px-5 py-2 text-sm bg-gradient-to-r from-astro-amber-400 to-orange-500 text-dark-space rounded-md font-semibold transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-orange-500/20 transform hover:-translate-y-px animate-gradient">
                                {t('modal.buttons.next')}
                            </button>
                        )}
                        {step === totalSteps && (
                            <button onClick={handleLaunch} className="px-5 py-2 text-sm bg-gradient-to-r from-astro-cyan-400 to-emerald-500 text-dark-space rounded-md font-semibold transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-cyan-500/20 transform hover:-translate-y-px animate-gradient">
                                {t('modal.buttons.launch')}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};


// Main content for an active campaign
const ActiveCampaignView: React.FC<{
    campaign: NewCampaignFormData;
    workflowStatus: WorkflowState;
    campaignId: string;
    onApprovePhase: (phaseId: string, data?: any) => void;
    onRejectPhase: (phaseId: string, reason: string) => void;
    knowledgeFiles: KnowledgeFile[];
    onAddFile: (file: KnowledgeFile) => void;
}> = ({ campaign, workflowStatus, campaignId, onApprovePhase, onRejectPhase, knowledgeFiles, onAddFile }) => {
    const { t } = useTranslation();
    const [currentView, setCurrentView] = useState<CampaignView>('overview');
    const [analyticsData, setAnalyticsData] = useState<AnalyticsOutput | null>(null);

    useEffect(() => {
        if (!campaignId) return;
        const logger = getCampaignLogger();
        const interval = setInterval(() => {
            const timeline = logger.getCampaignTimeline(campaignId);
            // FIX: Replaced findLast with reverse().find() for broader browser/environment compatibility.
            const analyticsEvent = [...timeline].reverse().find(event => event.phaseId === 'analytics' && event.status === 'completed');
            if (analyticsEvent && analyticsEvent.payload) {
                // Check if the new payload is different from the current one to avoid unnecessary re-renders
                if (JSON.stringify(analyticsEvent.payload) !== JSON.stringify(analyticsData)) {
                    setAnalyticsData(analyticsEvent.payload);
                }
            }
        }, 1000); // Check for updates every second

        return () => clearInterval(interval);
    }, [campaignId, analyticsData]); // re-run if campaignId changes

    const TABS: { id: CampaignView; labelKey: string; }[] = [
        { id: 'overview', labelKey: 'main.tabs.overview' },
        { id: 'workflow', labelKey: 'main.tabs.workflow' },
        { id: 'content', labelKey: 'main.tabs.content' },
        { id: 'analytics', labelKey: 'main.tabs.analytics' },
        { id: 'knowledge', labelKey: 'main.tabs.knowledge' }, // NEW
    ];

    return (
        <div className="p-8 h-full flex flex-col">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-white">{campaign.projectName}</h1>
                <p className="text-slate-400">{t('main.header.campaignFor', { company: campaign.companyInfo.name })}</p>
            </header>

            <div className="border-b border-astro-amber-500/10">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setCurrentView(tab.id)}
                            className={`${currentView === tab.id
                                ? 'border-astro-amber-400 text-astro-amber-400'
                                : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'
                                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
                        >
                            {t(tab.labelKey)}
                        </button>
                    ))}
                </nav>
            </div>

            <div className="flex-grow mt-8 overflow-y-auto">
                {currentView === 'overview' && (
                    <div className="h-full">
                        <InteractiveConsole activeCampaign={campaign} />
                    </div>
                )}
                {currentView === 'workflow' && <WorkflowView workflowStatus={workflowStatus} campaignId={campaignId} onApprove={onApprovePhase} onReject={onRejectPhase} />}
                {currentView === 'content' && <div className="text-white">Showing Content Hub...</div>}
                {currentView === 'analytics' && <AnalyticsDashboard data={analyticsData} />}
                {currentView === 'knowledge' && <KnowledgeBaseView files={knowledgeFiles} onAddFile={onAddFile} />}
            </div>
        </div>
    );
};

interface MainContentProps {
    isModalOpen: boolean;
    onCloseModal: () => void;
    onLaunchCampaign: (formData: NewCampaignFormData) => void;
    activeCampaign: NewCampaignFormData | null;
    workflowStatus: WorkflowState;
    onNewCampaignRequest: () => void;
    campaignId: string | null;
    onApprovePhase: (phaseId: string, data?: any) => void;
    onRejectPhase: (phaseId: string, reason: string) => void;
    knowledgeFiles: KnowledgeFile[];
    onAddFile: (file: KnowledgeFile) => void;
}

const MainContent: React.FC<MainContentProps> = ({
    isModalOpen,
    onCloseModal,
    onLaunchCampaign,
    activeCampaign,
    workflowStatus,
    onNewCampaignRequest,
    campaignId,
    onApprovePhase,
    onRejectPhase,
    knowledgeFiles,
    onAddFile,
}) => {
    return (
        <main className="flex-1 overflow-y-auto relative">
            {activeCampaign && campaignId ? (
                <ActiveCampaignView
                    campaign={activeCampaign}
                    workflowStatus={workflowStatus}
                    campaignId={campaignId}
                    onApprovePhase={onApprovePhase}
                    onRejectPhase={onRejectPhase}
                    knowledgeFiles={knowledgeFiles}
                    onAddFile={onAddFile}
                />
            ) : (
                <OverviewView onCreateCampaign={onNewCampaignRequest} />
            )}

            {isModalOpen && <NewCampaignModal onClose={onCloseModal} onLaunch={onLaunchCampaign} />}
        </main>
    );
};

export default MainContent;