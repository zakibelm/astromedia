import React, { useState, useRef, useEffect } from 'react';
import Sidebar from './Sidebar';
import MainContent from './MainContent';
import Header from './Header';
import AIAssistantWidget from './AIAssistantWidget';
import Gallery from './Gallery/Gallery';
import { NewCampaignFormData, WorkflowState, GovernanceMode, KnowledgeFile } from '../types';
import { defaultPlaybook } from '../services/orchestration/playbook';
import { runPlaybookParallel } from '../services/orchestration/orchestrator';
import { approvePhase, rejectPhase } from '../services/orchestration/humanValidation';
import { CampaignState, PhaseStatus, Mode } from '../services/orchestration/types';

const mapGovernanceMode = (mode: GovernanceMode): Mode => {
    switch (mode) {
        case 'follow':
            return 'guided';
        case 'semi-auto':
            return 'semi_auto';
        case 'full':
            return 'auto';
    }
};

const Dashboard: React.FC = () => {
    const [currentView, setCurrentView] = useState('dashboard');
    const [activeCampaign, setActiveCampaign] = useState<NewCampaignFormData | null>(null);
    const [campaignId, setCampaignId] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [workflowStatus, setWorkflowStatus] = useState<WorkflowState>({});
    const [knowledgeFiles, setKnowledgeFiles] = useState<KnowledgeFile[]>([]);

    // Garde une référence stable à l'état de l'orchestrateur et à l'instance elle-même
    const orchestratorStateRef = useRef<CampaignState | null>(null);
    const orchestratorInstanceRef = useRef<{ stop: () => void } | null>(null);

    const handleNewCampaignRequest = () => {
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
    };

    const handleAddFile = (file: KnowledgeFile) => {
        setKnowledgeFiles(prevFiles => {
            const updatedFiles = [...prevFiles, file];
            if (orchestratorStateRef.current) {
                orchestratorStateRef.current.context.knowledgeBase = updatedFiles;
                console.log(`[Dashboard] Knowledge base updated in orchestrator context for campaign ${campaignId}.`);
            }
            return updatedFiles;
        });
    };

    const handleLaunchCampaign = (formData: NewCampaignFormData) => {
        try {
            // Nettoyer l'ancienne campagne si elle existe
            if (orchestratorInstanceRef.current) {
                orchestratorInstanceRef.current.stop();
            }

            setActiveCampaign(formData);
            setIsModalOpen(false);
            setWorkflowStatus({}); // Reset status for the new campaign
            setKnowledgeFiles([]); // Reset knowledge base for the new campaign
            const newCampaignId = `campaign_${crypto.randomUUID()}`;
            setCampaignId(newCampaignId);

            const initialState: CampaignState = {
                mode: mapGovernanceMode(formData.governanceMode),
                statusByPhase: { briefing: 'completed' },
                triesByPhase: {},
                awaitingHumanApproval: new Set(),
                context: {
                    brandProfile: `${formData.companyInfo.name} (${formData.companyInfo.website || 'site non fourni'}) - ${formData.companyInfo.sector}. Valeurs: ${formData.brandIdentity.brandValues}`,
                    goals: formData.campaignGoals.objectives.join(', '),
                    persona: formData.campaignGoals.targetAudience,
                    budget: `${formData.campaignGoals.budget.amount} ${formData.campaignGoals.budget.currency}`,
                    timeline: formData.campaignGoals.duration,
                    briefContext: JSON.stringify(formData, null, 2),
                    tone: formData.brandIdentity.tone,
                    socialLinks: formData.brandIdentity.socialLinks,
                    visuals: 'Visuels à générer basés sur la stratégie de contenu.',
                    analysisDepth: formData.analysisDepth,
                    agentConfiguration: formData.agentConfiguration, // NEW
                    ragEnabled: formData.ragEnabled, // NEW
                    knowledgeBase: [], // NEW - Initialized as empty
                }
            };
            orchestratorStateRef.current = initialState;

            const events = {
                onPhaseStatus: (id: string, status: PhaseStatus) => {
                    try {
                        setWorkflowStatus(prev => ({ ...prev, [id]: status as WorkflowState[string] }));
                    } catch (error: any) {
                        console.error(`[Dashboard] Erreur dans onPhaseStatus:`, error);
                    }
                },
                onPhaseOutput: (id: string, output: any) => {
                    try {
                        console.log(`[UI OUTPUT][${newCampaignId}] ${id}`, output);
                    } catch (error: any) {
                        console.error(`[Dashboard] Erreur dans onPhaseOutput:`, error);
                    }
                },
                onPhaseError: (id: string, err: Error) => {
                    try {
                        console.error(`[UI ERROR][${newCampaignId}] ${id}`, err.message);
                    } catch (error: any) {
                        console.error(`[Dashboard] Erreur dans onPhaseError:`, error);
                    }
                },
                onAllDone: (finalState: CampaignState) => {
                    try {
                        orchestratorStateRef.current = finalState;
                        console.log(`[UI ALL PHASES DONE][${newCampaignId}]`, finalState);
                    } catch (error: any) {
                        console.error(`[Dashboard] Erreur dans onAllDone:`, error);
                    }
                }
            };

            console.log(`=== Lancement de l'orchestrateur (ID: ${newCampaignId}) ===`);
            const orchestrator = runPlaybookParallel({
                playbook: defaultPlaybook,
                state: initialState,
                events,
                campaignId: newCampaignId
            });
            orchestratorInstanceRef.current = orchestrator;

            // Handle promise rejection to prevent unhandled rejection errors
            orchestrator.promise.catch((error: any) => {
                console.error(`[Dashboard] Orchestrator promise rejected:`, error);
                setActiveCampaign(null);
                setCampaignId(null);
                setWorkflowStatus({});
                alert(`Erreur durant l'exécution de la campagne: ${error.message}\n\nVeuillez vérifier la console pour plus de détails.`);
            });
        } catch (error: any) {
            console.error(`[Dashboard] Erreur lors du lancement de la campagne:`, error);
            // Reset l'état en cas d'erreur pour éviter l'écran noir
            setActiveCampaign(null);
            setCampaignId(null);
            setWorkflowStatus({});
            alert(`Erreur lors du lancement de la campagne: ${error.message}\n\nVeuillez réessayer ou vérifier la console pour plus de détails.`);
        }
    };

    const handleApprovePhase = (phaseId: string, data?: any) => {
        if (orchestratorStateRef.current) {
            console.log(`[Human Action] Approving phase: ${phaseId}`, data || '');
            approvePhase(defaultPlaybook, orchestratorStateRef.current, {
                onPhaseStatus: (id, status) => setWorkflowStatus(prev => ({ ...prev, [id]: status as WorkflowState[string] }))
            }, phaseId, data);
        }
    };

    const handleRejectPhase = (phaseId: string, reason: string) => {
        if (orchestratorStateRef.current) {
            console.log(`[Human Action] Rejecting phase: ${phaseId} for reason: ${reason}`);
            rejectPhase(defaultPlaybook, orchestratorStateRef.current, {
                onPhaseStatus: (id, status) => setWorkflowStatus(prev => ({ ...prev, [id]: status as WorkflowState[string] }))
            }, phaseId, reason);
        }
    };

    // S'assure de stopper l'orchestrateur au démontage du composant
    useEffect(() => {
        return () => {
            orchestratorInstanceRef.current?.stop();
        };
    }, []);

    return (
        <div className="flex h-screen bg-gradient-to-br from-[#10051a] to-[#190729] text-white overflow-hidden">
            <Sidebar
                currentView={currentView}
                setCurrentView={setCurrentView}
            />
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header here if needed, or inside MainContent/Gallery? Header was "Topbar" in plan. Header needs to be outside MainContent if it spans full width. */}
                {/* Actually Sidebar + Main Layout usually means Header is next to Sidebar or above. 
                    The design implies Header is Top Bar next to Sidebar. 
                    Let's assume Header logic is wanted here or inside components. 
                    I'll add Header here for consistency with Layout. 
                */}
                <Header onStart={handleNewCampaignRequest} />

                <main className="flex-1 overflow-hidden relative">
                    {currentView === 'gallery' ? (
                        <Gallery />
                    ) : (
                        <MainContent
                            isModalOpen={isModalOpen}
                            onCloseModal={handleCloseModal}
                            onLaunchCampaign={handleLaunchCampaign}
                            activeCampaign={activeCampaign}
                            workflowStatus={workflowStatus}
                            onNewCampaignRequest={handleNewCampaignRequest}
                            campaignId={campaignId}
                            onApprovePhase={handleApprovePhase}
                            onRejectPhase={handleRejectPhase}
                            knowledgeFiles={knowledgeFiles}
                            onAddFile={handleAddFile}
                        />
                    )}
                </main>
            </div>

            <AIAssistantWidget />
        </div>
    );
};

export default Dashboard;