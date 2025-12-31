import React, { useState } from 'react';
import { galleryService } from '../../services/galleryService';

interface WorkflowStep {
    id: string;
    type: 'agent' | 'action';
    name: string;
    description: string;
}

const AVAILABLE_STEPS: WorkflowStep[] = [
    { id: 'research', type: 'agent', name: 'Researcher Agent', description: 'Gathers data and insights' },
    { id: 'writer', type: 'agent', name: 'Copywriter Agent', description: 'Drafts content based on inputs' },
    { id: 'seo', type: 'agent', name: 'SEO Specialist', description: 'Optimizes content for search engines' },
    { id: 'reviewer', type: 'agent', name: 'Reviewer Agent', description: 'Validates quality and compliance' },
    { id: 'publish', type: 'action', name: 'Publish Action', description: 'Posts content to platforms' },
];

const WorkflowBuilder: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [workflowName, setWorkflowName] = useState('Nouveau Workflow');
    const [orchestratorPrompt, setOrchestratorPrompt] = useState('Ensure all agents follow the brand guidelines and complete tasks sequentially.');
    const [canvasSteps, setCanvasSteps] = useState<WorkflowStep[]>([]);
    const [draggedItem, setDraggedItem] = useState<WorkflowStep | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const handleDragStart = (step: WorkflowStep) => {
        setDraggedItem(step);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (draggedItem) {
            setCanvasSteps([...canvasSteps, { ...draggedItem, id: `${draggedItem.id}-${Date.now()}` }]);
            setDraggedItem(null);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const removeStep = (index: number) => {
        const newSteps = [...canvasSteps];
        newSteps.splice(index, 1);
        setCanvasSteps(newSteps);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await galleryService.saveWorkflow({
                name: workflowName,
                steps: canvasSteps,
                orchestratorPrompt
            });
            onBack();
        } catch (error) {
            console.error("Failed to save workflow", error);
            alert("Failed to save workflow");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-[#160e1b] text-white animate-fade-in font-sans">
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#10051a]">
                <div className="flex items-center">
                    <button onClick={onBack} className="mr-4 text-slate-400 hover:text-white">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    </button>
                    <div>
                        <input
                            value={workflowName}
                            onChange={(e) => setWorkflowName(e.target.value)}
                            className="bg-transparent text-xl font-bold focus:outline-none focus:border-b border-purple-500"
                        />
                        <p className="text-xs text-gray-400">Workflow Builder Mode</p>
                    </div>
                </div>
                <div className="flex space-x-3">
                    <button className="px-4 py-2 text-sm bg-slate-800 rounded hover:bg-slate-700">Simuler</button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-4 py-2 text-sm bg-purple-600 rounded hover:bg-purple-700 font-semibold shadow-lg disabled:opacity-50"
                    >
                        {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar - Tools */}
                <div className="w-64 bg-[#1a1025] border-r border-white/5 p-4 overflow-y-auto">
                    <h3 className="text-xs font-bold text-gray-400 uppercase mb-4 tracking-wider">Boîte à Outils</h3>
                    <div className="space-y-3">
                        {AVAILABLE_STEPS.map(step => (
                            <div
                                key={step.id}
                                draggable
                                onDragStart={() => handleDragStart(step)}
                                className="p-3 bg-slate-800 rounded cursor-move hover:bg-slate-700 border border-slate-700 hover:border-purple-500/50 transition-all select-none"
                            >
                                <div className="font-semibold text-sm mb-1">{step.name}</div>
                                <div className="text-[10px] text-gray-400">{step.description}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main Canvas */}
                <div className="flex-1 flex flex-col">
                    {/* Orchestrator Config Panel */}
                    <div className="p-4 bg-[#1e152a] border-b border-white/5">
                        <div className="flex items-start space-x-4">
                            <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                                <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-amber-400 text-sm mb-1">Agent Orchestrateur (Superviseur)</h4>
                                <textarea
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded p-2 text-xs text-slate-300 focus:ring-1 focus:ring-amber-500 outline-none"
                                    rows={2}
                                    value={orchestratorPrompt}
                                    onChange={(e) => setOrchestratorPrompt(e.target.value)}
                                    placeholder="Système Prompt de l'Orchestrateur..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Drop Zone */}
                    <div
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        className="flex-1 bg-slate-900/50 p-8 overflow-y-auto relative bg-[url('https://www.transparenttextures.com/patterns/cube-coat.png')] bg-fixed"
                    >
                        {canvasSteps.length === 0 ? (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
                                <div className="text-center">
                                    <svg className="w-16 h-16 text-slate-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    <p className="text-slate-400">Glissez-déposez des agents ici pour construire votre workflow</p>
                                </div>
                            </div>
                        ) : (
                            <div className="max-w-3xl mx-auto space-y-4">
                                {/* Connector Line */}
                                <div className="absolute left-1/2 top-4 bottom-4 w-px bg-white/5 -z-10 transform -translate-x-1/2 ml-[22px] md:ml-[calc(50%-2rem)] hidden"></div>

                                {canvasSteps.map((step, idx) => (
                                    <div key={idx} className="relative group">
                                        <div className="flex items-center bg-[#251b30] border border-white/10 rounded-lg p-4 shadow-lg hover:border-purple-500 transition-colors">
                                            <div className="h-8 w-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center mr-4 font-bold">
                                                {idx + 1}
                                            </div>
                                            <div className="flex-1">
                                                <h5 className="font-semibold text-sm">{step.name}</h5>
                                                <p className="text-xs text-gray-500">{step.description}</p>
                                            </div>
                                            <button
                                                onClick={() => removeStep(idx)}
                                                className="text-gray-600 hover:text-red-400 p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                &times;
                                            </button>
                                        </div>
                                        {idx < canvasSteps.length - 1 && (
                                            <div className="flex justify-center py-2 text-gray-600">
                                                <svg className="w-5 h-5 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WorkflowBuilder;
