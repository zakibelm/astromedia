// components/WorkflowView.tsx
import React from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from '../i18n/useTranslation';
import { WorkflowState } from '../types';
import { defaultPlaybook } from '../services/orchestration/playbook';
import { getCampaignLogger, PhaseEvent } from '../services/orchestration/orchestrator';
import { formatDuration } from '../utils/formatters';
import { z } from 'zod';
import { CMOOutputSchema, MarketAnalystOutputSchema, DesignerOutputSchema, VideoProducerOutputSchema, ScriptwriterOutputSchema } from '../services/agentSchemas';

// Helper components for rendering different payloads

const MarketAnalystPayload: React.FC<{ payload: any }> = ({ payload }) => {
    const { t } = useTranslation();

    console.log('[MarketAnalystPayload] Received payload:', payload);

    // Gestion des différents formats de payload
    if (!payload) {
        return (
            <div className="p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-md">
                <p className="text-yellow-400 text-sm">⚠️ Aucune donnée d'analyse de marché reçue</p>
            </div>
        );
    }

    // Si c'est juste un objet générique, affichons le contenu
    if (!payload.slides && typeof payload === 'object') {
        return (
            <div className="p-4 bg-dark-space-mid border border-astro-amber-500/10 rounded-lg">
                <h4 className="font-bold text-astro-amber-400 mb-3">Analyse de Marché (Format Générique)</h4>
                <div className="space-y-2 text-sm">
                    {Object.entries(payload).map(([key, value], index) => (
                        <div key={index} className="flex">
                            <span className="font-semibold text-gray-400 mr-2 min-w-[120px]">{key}:</span>
                            <span className="text-gray-300">
                                {typeof value === 'string' ? value : JSON.stringify(value)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // Vérifier que payload.slides existe
    if (!Array.isArray(payload.slides)) {
        return (
            <div className="p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-md">
                <p className="text-yellow-400 text-sm">⚠️ Format de données invalide pour l'analyse de marché</p>
                <p className="text-xs text-gray-400 mt-1">Attendu: objet avec propriété 'slides'</p>
                <pre className="text-xs text-gray-500 mt-2 max-h-32 overflow-auto">
                    {JSON.stringify(payload, null, 2)}
                </pre>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {payload.slides.map((slide, index) => {
                // Vérifier que chaque slide est valide
                if (!slide || typeof slide !== 'object') {
                    return (
                        <div key={index} className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
                            <p className="text-red-400 text-sm">⚠️ Slide {index + 1} : données invalides</p>
                        </div>
                    );
                }

                return (
                    <div key={index} className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                        <h4 className="font-bold text-amber-400 mb-2">
                            {typeof slide.title === 'string' ? slide.title : `Slide ${index + 1}`}
                        </h4>
                        {slide.layout === 'swot_grid' && Array.isArray(slide.content) && slide.content.length === 4 ? (
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-slate-700/50 p-3 rounded">
                                    <h5 className="font-semibold text-green-400">{t('workflow.slide.swot.strengths')}</h5>
                                    <p className="text-sm">{String(slide.content[0] || 'Non défini')}</p>
                                </div>
                                <div className="bg-slate-700/50 p-3 rounded">
                                    <h5 className="font-semibold text-red-400">{t('workflow.slide.swot.weaknesses')}</h5>
                                    <p className="text-sm">{String(slide.content[1] || 'Non défini')}</p>
                                </div>
                                <div className="bg-slate-700/50 p-3 rounded">
                                    <h5 className="font-semibold text-blue-400">{t('workflow.slide.swot.opportunities')}</h5>
                                    <p className="text-sm">{String(slide.content[2] || 'Non défini')}</p>
                                </div>
                                <div className="bg-slate-700/50 p-3 rounded">
                                    <h5 className="font-semibold text-yellow-400">{t('workflow.slide.swot.threats')}</h5>
                                    <p className="text-sm">{String(slide.content[3] || 'Non défini')}</p>
                                </div>
                            </div>
                        ) : (
                            <ul className="list-disc list-inside text-sm space-y-1">
                                {Array.isArray(slide.content) ? slide.content.map((item, i) => (
                                    <li key={i}>{String(item || 'Contenu non disponible')}</li>
                                )) : (
                                    <li>Format de contenu non reconnu</li>
                                )}
                            </ul>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

const CMOPayload: React.FC<{ payload: z.infer<typeof CMOOutputSchema> }> = ({ payload }) => {
    const { t } = useTranslation();
    return (
        <div className="space-y-4 text-sm">
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                <h4 className="font-bold text-amber-400 mb-2">{t('workflow.strategyReport.summary')}</h4>
                <p>{payload.executiveSummary}</p>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                <h4 className="font-bold text-amber-400 mb-2">{t('workflow.strategyReport.messages')}</h4>
                <ul className="list-disc list-inside space-y-1">{payload.keyMessages.map((msg, i) => <li key={i}>{msg}</li>)}</ul>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                <h4 className="font-bold text-amber-400 mb-2">{t('workflow.strategyReport.channelMix')}</h4>
                <div className="space-y-3">
                    {payload.channelMix.map((item, i) => (
                        <div key={i} className="p-3 bg-slate-700/50 rounded">
                            <h5 className="font-semibold">{item.channel} ({item.budgetPercent}%)</h5>
                            <p><span className="font-semibold text-slate-400">{t('workflow.strategyReport.role')}:</span> {item.role}</p>
                            <p><span className="font-semibold text-slate-400">{t('workflow.strategyReport.formats')}:</span> {item.formats.join(', ')}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const ScriptwriterPayload: React.FC<{ payload: z.infer<typeof ScriptwriterOutputSchema> }> = ({ payload }) => {
    const { t } = useTranslation();
    const briefs = payload.creativeBriefs || [];
    if (!briefs.length) return <p>No creative briefs found.</p>;

    return (
        <div className="space-y-4">
            {briefs.map((brief, index) => (
                <div key={index} className="p-4 bg-dark-space-mid border border-astro-amber-500/10 rounded-lg">
                    <h4 className="font-bold text-astro-amber-400 mb-2">{t('workflow.scenario.title', { platform: brief.platform, format: brief.format })}: <span className="text-white font-normal">{brief.title}</span></h4>
                    <div className="space-y-2 text-sm">
                        <p><strong className="text-gray-400">{t('workflow.scenario.hook')}:</strong> {brief.scenario.hook}</p>
                        <div>
                            <strong className="text-slate-400">{t('workflow.scenario.scenes')}:</strong>
                            <ul className="list-disc list-inside ml-4">{brief.scenario.scenes.map((scene, i) => <li key={i}>{scene}</li>)}</ul>
                        </div>
                        <p><strong className="text-slate-400">{t('workflow.scenario.cta')}:</strong> {brief.scenario.cta}</p>
                    </div>
                </div>
            ))}
        </div>
    );
};


const VisualsChoice: React.FC<{ payload: any, onApprove: (data: any) => void, onReject: (reason: string) => void }> = ({ payload, onApprove, onReject }) => {
    const { t } = useTranslation();
    const [feedback, setFeedback] = useState('');

    return (
        <div className="space-y-4">
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                <h4 className="font-bold text-amber-400 mb-2">{t('workflow.visuals.suggestionTitle')}</h4>
                <p className="text-sm italic">"{payload.visualSuggestion}"</p>
            </div>
            <h3 className="text-lg font-semibold text-center">{t('workflow.visuals.choiceTitle')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(['artistic', 'realistic'] as const).map(key => (
                    <div key={key}>
                        <h4 className="font-semibold text-center mb-2">{payload[key].modelName} ({key === 'artistic' ? t('workflow.visuals.versionA') : t('workflow.visuals.versionB')})</h4>
                        <img src={`data:image/jpeg;base64,${payload[key].imageBase64}`} alt={`${key} visual`} className="rounded-lg w-full" />
                        <button
                            onClick={() => onApprove({ validatedVisual: payload[key] })}
                            className="w-full mt-3 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-md transition-colors"
                        >
                            {t(key === 'artistic' ? 'workflow.actions.validateA' : 'workflow.actions.validateB')}
                        </button>
                    </div>
                ))}
            </div>
            <div className="pt-4 border-t border-slate-700">
                <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder={t('workflow.actions.feedbackPlaceholder') || ''}
                    className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    rows={2}
                />
                <button
                    onClick={() => onReject(feedback)}
                    className="w-full mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-md transition-colors"
                >
                    {t('workflow.actions.regenerateImages')}
                </button>
            </div>
        </div>
    );
}

const VideoChoice: React.FC<{ payload: any, onApprove: (data: any) => void, onReject: (reason: string) => void }> = ({ payload, onApprove, onReject }) => {
    const { t } = useTranslation();
    const [feedback, setFeedback] = useState('');

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-center">{t('workflow.video.choiceTitle')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(['narrative', 'dynamic'] as const).map(key => (
                    <div key={key}>
                        <h4 className="font-semibold text-center mb-2">{payload[key].modelName} ({key === 'narrative' ? t('workflow.video.versionA') : t('workflow.video.versionB')})</h4>
                        <video src={`data:video/mp4;base64,${payload[key].videoBase64}`} controls className="rounded-lg w-full" />
                        <button
                            onClick={() => onApprove({ validatedVideo: payload[key] })}
                            className="w-full mt-3 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-md transition-colors"
                        >
                            {t(key === 'narrative' ? 'workflow.actions.validateA' : 'workflow.actions.validateB')}
                        </button>
                    </div>
                ))}
            </div>
            <div className="pt-4 border-t border-slate-700">
                <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder={t('workflow.actions.feedbackPlaceholder') || ''}
                    className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    rows={2}
                />
                <button
                    onClick={() => onReject(feedback)}
                    className="w-full mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-md transition-colors"
                >
                    {t('workflow.actions.regenerateVideos')}
                </button>
            </div>
        </div>
    )
}

const GenericPayloadRenderer: React.FC<{ payload: any }> = ({ payload }) => {
    try {
        const serialized = JSON.stringify(payload, null, 2);
        return (
            <pre className="text-xs bg-slate-800/50 p-3 rounded-md overflow-x-auto">
                {serialized}
            </pre>
        );
    } catch (error) {
        console.error('[GenericPayloadRenderer] Cannot serialize payload:', error);
        return (
            <div className="text-xs bg-red-900/20 p-3 rounded-md border border-red-500/30">
                <p className="text-red-400 mb-2">⚠️ Impossible d'afficher les données (objet non sérialisable)</p>
                <p className="text-gray-400">Type: {typeof payload}</p>
                <p className="text-gray-400">Constructor: {payload?.constructor?.name || 'Unknown'}</p>
            </div>
        );
    }
};

const PayloadRenderer: React.FC<{ phaseId: string; payload: any; onApprove: (data?: any) => void; onReject: (reason: string) => void; }> = ({ phaseId, payload, onApprove, onReject }) => {
    const { t } = useTranslation();
    const agentName = defaultPlaybook.phases.find(p => p.id === phaseId)?.agent || 'Unknown';

    if (!payload) return null;

    // Protection contre les objets non valides
    try {
        // Vérifier si le payload peut être sérialisé (test de validité)
        JSON.stringify(payload);
    } catch (error) {
        console.error(`[PayloadRenderer] Invalid payload for phase ${phaseId}:`, error);
        return (
            <div className="mt-4 p-3 bg-red-900/20 border border-red-500/30 rounded-md">
                <p className="text-red-400 text-sm">⚠️ Erreur de rendu des données pour cette phase</p>
                <pre className="text-xs text-gray-500 mt-2">Type: {typeof payload}</pre>
            </div>
        );
    }

    let content: React.ReactNode;

    try {
        switch (phaseId) {
            case 'research':
                content = <MarketAnalystPayload payload={payload} />;
                break;
            case 'strategy':
                content = <CMOPayload payload={payload} />;
                break;
            case 'scriptwriting':
                content = <ScriptwriterPayload payload={payload} />;
                break;
            case 'visuals':
                if (payload.visuals) {
                    content = <VisualsChoice payload={payload.visuals} onApprove={onApprove} onReject={onReject} />;
                } else {
                    content = <GenericPayloadRenderer payload={payload} />;
                }
                break;
            case 'video':
                if (payload.videos) {
                    content = <VideoChoice payload={payload.videos} onApprove={onApprove} onReject={onReject} />;
                } else {
                    content = <GenericPayloadRenderer payload={payload} />;
                }
                break;
            default:
                content = <GenericPayloadRenderer payload={payload} />;
                break;
        }
    } catch (renderError: any) {
        console.error(`[PayloadRenderer] Error rendering content for ${phaseId}:`, renderError);
        content = (
            <div className="mt-4 p-3 bg-red-900/20 border border-red-500/30 rounded-md">
                <p className="text-red-400 text-sm">⚠️ Erreur lors du rendu du contenu</p>
                <p className="text-xs text-gray-400 mt-1">Phase: {phaseId}</p>
                <p className="text-xs text-gray-400">Erreur: {renderError.message}</p>
                <pre className="text-xs text-gray-500 mt-2 max-h-20 overflow-auto">
                    {JSON.stringify(payload, null, 2).substring(0, 500)}...
                </pre>
            </div>
        );
    }

    return (
        <div className="mt-4 space-y-4">
            <h3 className="font-semibold text-slate-300">{t('workflow.results.title', { agent: agentName })}</h3>
            {content}
        </div>
    );
};

const PhaseCard: React.FC<{
    phaseId: string;
    status: WorkflowState[string];
    event: PhaseEvent | undefined;
    onApprove: (phaseId: string, data?: any) => void;
    onReject: (phaseId: string, reason: string) => void;
}> = ({ phaseId, status, event, onApprove, onReject }) => {
    const { t } = useTranslation();
    const [feedback, setFeedback] = useState('');
    const phaseConfig = defaultPlaybook.phases.find(p => p.id === phaseId);
    if (!phaseConfig) return null;

    const statusStyles = {
        completed: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
        running: { text: 'text-astro-amber-400', bg: 'bg-astro-amber-500/10', border: 'border-astro-amber-500/30' },
        inprogress: { text: 'text-astro-amber-400', bg: 'bg-astro-amber-500/10', border: 'border-astro-amber-500/30' }, // Alias for running
        waitingValidation: { text: 'text-astro-cyan-400', bg: 'bg-astro-cyan-500/10', border: 'border-astro-cyan-500/30' },
        failed: { text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' },
        pending: { text: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/20' },
        skipped: { text: 'text-gray-500', bg: 'bg-gray-500/10', border: 'border-gray-500/20' },
    };
    const styles = statusStyles[status as keyof typeof statusStyles] || statusStyles.pending;
    const isWaitingForChoice = (phaseId === 'visuals' || phaseId === 'video') && status === 'waitingValidation';

    return (
        <div className={`p-4 rounded-lg border ${styles.border} ${styles.bg}`}>
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-lg text-white">{t(phaseConfig.titleKey)}</h3>
                    <p className="text-sm text-slate-400">{t(phaseConfig.descriptionKey)}</p>
                </div>
                <div className="text-right">
                    <span className={`font-semibold text-sm px-3 py-1 rounded-full ${styles.text} ${styles.bg}`}>{t(`phases.status.${status}`)}</span>
                    {event?.latency && <p className="text-xs text-slate-500 mt-1">{formatDuration(event.latency)}</p>}
                </div>
            </div>
            {event?.error && <div className="mt-2 p-2 bg-red-900/50 border border-red-500/30 rounded-md text-red-300 text-xs">{event.error}</div>}

            {event?.payload && <PayloadRenderer phaseId={phaseId} payload={event.payload} onApprove={(data) => onApprove(phaseId, data)} onReject={(reason) => onReject(phaseId, reason)} />}

            {status === 'waitingValidation' && !isWaitingForChoice && (
                <div className="mt-4 pt-4 border-t border-slate-700 space-y-2">
                    <textarea
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        placeholder={t('workflow.actions.feedbackPlaceholder') || ''}
                        className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        rows={2}
                    />
                    <div className="flex gap-2">
                        <button onClick={() => onReject(phaseId, feedback)} className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-md transition-colors text-sm">{t('workflow.actions.reject')}</button>
                        <button onClick={() => onApprove(phaseId)} className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-md transition-colors text-sm">{t('workflow.actions.approve')}</button>
                    </div>
                </div>
            )}
        </div>
    );
};

interface WorkflowViewProps {
    workflowStatus: WorkflowState;
    campaignId: string;
    onApprove: (phaseId: string, data?: any) => void;
    onReject: (phaseId: string, reason: string) => void;
}

const WorkflowView: React.FC<WorkflowViewProps> = ({ workflowStatus, campaignId, onApprove, onReject }) => {
    const [timeline, setTimeline] = useState<PhaseEvent[]>([]);
    const logger = getCampaignLogger();

    useEffect(() => {
        const interval = setInterval(() => {
            const newTimeline = logger.getCampaignTimeline(campaignId);
            if (JSON.stringify(newTimeline) !== JSON.stringify(timeline)) {
                setTimeline(newTimeline);
            }
        }, 500); // Poll for updates

        return () => clearInterval(interval);
    }, [campaignId, logger, timeline]);

    const findLastEvent = (phaseId: string): PhaseEvent | undefined => {
        // Find the last event that isn't 'ready' or 'idle' to get meaningful payload/status
        return [...timeline].reverse().find(e => e.phaseId === phaseId && e.status !== 'ready' && e.status !== 'idle');
    };

    const phasesToDisplay = defaultPlaybook.phases.filter(p => p.id !== 'briefing');

    return (
        <div className="space-y-4">
            {phasesToDisplay.map(phase => {
                const status = workflowStatus[phase.id] || 'pending';
                const lastEvent = findLastEvent(phase.id);
                return <PhaseCard key={phase.id} phaseId={phase.id} status={status} event={lastEvent} onApprove={onApprove} onReject={onReject} />;
            })}
        </div>
    );
};

export default WorkflowView;
