import React, { useState, useRef } from 'react';
import { useTranslation } from '../../i18n/useTranslation';
import { AGENT_PROFILES } from '../../constants/agents';
import { AgentProfileData } from '../../types';

// Mock list of available models
const AVAILABLE_MODELS = [
    { id: 'gpt-4o', name: 'GPT-4o (OpenAI)' },
    { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet (Anthropic)' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro (Google)' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo (OpenAI)' },
    { id: 'claude-3-opus', name: 'Claude 3 Opus (Anthropic)' },
];

interface AgentConfig {
    modelId: string;
    systemPrompt: string;
    ragFiles: File[];
}

const SettingsView: React.FC = () => {
    const { t } = useTranslation();
    const [openRouterKey, setOpenRouterKey] = useState('');
    const [isKeyVisible, setIsKeyVisible] = useState(false);

    // Selected agent for the modal
    const [selectedAgent, setSelectedAgent] = useState<AgentProfileData | null>(null);

    // Local configuration state for agents
    const [agentConfigs, setAgentConfigs] = useState<Record<string, AgentConfig>>({});

    const fileInputRef = useRef<HTMLInputElement>(null);

    const getAgentConfig = (agentId: string): AgentConfig => {
        return agentConfigs[agentId] || {
            modelId: 'gpt-4o',
            systemPrompt: '',
            ragFiles: []
        };
    };

    const updateAgentConfig = (agentId: string, updates: Partial<AgentConfig>) => {
        setAgentConfigs(prev => ({
            ...prev,
            [agentId]: {
                ...getAgentConfig(agentId),
                ...updates
            }
        }));
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (selectedAgent && e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files);
            const currentConfig = getAgentConfig(selectedAgent.id);

            updateAgentConfig(selectedAgent.id, {
                ragFiles: [...currentConfig.ragFiles, ...newFiles]
            });
        }
    };

    const removeFile = (fileIndex: number) => {
        if (selectedAgent) {
            const currentConfig = getAgentConfig(selectedAgent.id);
            const updatedFiles = currentConfig.ragFiles.filter((_, idx) => idx !== fileIndex);
            updateAgentConfig(selectedAgent.id, { ragFiles: updatedFiles });
        }
    };

    return (
        <div className="h-full bg-dark-space p-8 overflow-y-auto animate-fade-in text-white">
            <h2 className="text-3xl font-bold mb-8">{t('settings.title') || 'Paramètres'}</h2>

            {/* --- OpenRouter API Key Section --- */}
            <div className="bg-dark-space-mid border border-astro-amber-500/10 rounded-xl p-6 mb-8 shadow-lg">
                <h3 className="text-xl font-semibold mb-4 flex items-center">
                    <span className="mr-2">🔑</span> OpenRouter API Key
                </h3>
                <p className="text-gray-400 mb-4 text-sm">
                    Cette clé sera utilisée pour tous les appels aux modèles d'IA via l'orchestrateur.
                </p>
                <div className="flex gap-4">
                    <div className="relative flex-grow">
                        <input
                            type={isKeyVisible ? "text" : "password"}
                            value={openRouterKey}
                            onChange={(e) => setOpenRouterKey(e.target.value)}
                            placeholder="sk-or-..."
                            className="w-full bg-dark-space border border-slate-700 rounded-lg py-3 px-4 focus:outline-none focus:border-astro-amber-500 focus:ring-1 focus:ring-astro-amber-500 transition-all font-mono"
                        />
                        <button
                            onClick={() => setIsKeyVisible(!isKeyVisible)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                        >
                            {isKeyVisible ? '🙈' : '👁️'}
                        </button>
                    </div>
                    <button className="bg-astro-amber-500/20 text-astro-amber-400 border border-astro-amber-500/50 hover:bg-astro-amber-500/30 px-6 py-2 rounded-lg font-medium transition-colors">
                        Sauvegarder
                    </button>
                </div>
            </div>

            {/* --- Agents Grid Section --- */}
            <div className="mb-8">
                <h3 className="text-2xl font-semibold mb-6">Configuration des Agents</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {AGENT_PROFILES.map((agent) => (
                        <div
                            key={agent.id}
                            onClick={() => setSelectedAgent(agent)}
                            className="bg-dark-space-mid border border-slate-800 rounded-xl p-6 cursor-pointer hover:border-astro-amber-500/50 hover:shadow-lg hover:shadow-astro-amber-500/10 transition-all group relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-astro-amber-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

                            <div className="flex items-start justify-between mb-4">
                                <div className="p-3 bg-dark-space rounded-lg border border-slate-700 group-hover:border-astro-amber-500/30 transition-colors">
                                    {agent.icon}
                                </div>
                                <div className={`h-2 w-2 rounded-full ${agent.status === 'active' ? 'bg-green-500' : 'bg-gray-600'}`}></div>
                            </div>

                            <h4 className="text-lg font-bold mb-1 group-hover:text-astro-amber-400 transition-colors">{t(agent.nameKey)}</h4>
                            <p className="text-sm text-gray-400 line-clamp-3">{t(agent.descriptionKey)}</p>

                            {/* Optional: Indicator if configured */}
                            {agentConfigs[agent.id] && (
                                <div className="mt-4 flex items-center text-xs text-astro-amber-500">
                                    <span className="mr-1">⚙️</span> Configuré
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* --- Agent Config Modal --- */}
            {selectedAgent && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center animate-fade-in p-4" onClick={() => setSelectedAgent(null)}>
                    <div
                        className="bg-dark-space border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-dark-space-mid rounded-lg border border-slate-700">
                                    {selectedAgent.icon}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold">{t(selectedAgent.nameKey)}</h3>
                                    <p className="text-sm text-gray-400">{t(selectedAgent.descriptionKey)}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedAgent(null)}
                                className="text-gray-400 hover:text-white p-2 hover:bg-white/10 rounded-full transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto space-y-6">

                            {/* Model Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Modèle IA</label>
                                <select
                                    value={getAgentConfig(selectedAgent.id).modelId}
                                    onChange={(e) => updateAgentConfig(selectedAgent.id, { modelId: e.target.value })}
                                    className="w-full bg-dark-space-mid border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-1 focus:ring-astro-amber-500 focus:border-astro-amber-500 outline-none"
                                >
                                    {AVAILABLE_MODELS.map(model => (
                                        <option key={model.id} value={model.id}>{model.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* System Prompt */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Prompt Système & Rôle</label>
                                <textarea
                                    value={getAgentConfig(selectedAgent.id).systemPrompt}
                                    onChange={(e) => updateAgentConfig(selectedAgent.id, { systemPrompt: e.target.value })}
                                    placeholder="Définissez ici les instructions spécifiques, le ton et les contraintes pour cet agent..."
                                    rows={6}
                                    className="w-full bg-dark-space-mid border border-slate-700 rounded-lg p-4 text-white placeholder-gray-600 focus:ring-1 focus:ring-astro-amber-500 focus:border-astro-amber-500 outline-none resize-none font-mono text-sm"
                                />
                            </div>

                            {/* RAG / Documents */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Base de connaissances (RAG)</label>
                                <div className="bg-dark-space-mid border border-slate-700 rounded-lg p-4">

                                    {/* Upload Button */}
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full border-2 border-dashed border-slate-600 hover:border-astro-amber-500 rounded-lg p-8 flex flex-col items-center justify-center text-gray-400 hover:text-astro-amber-500 hover:bg-astro-amber-500/5 transition-all mb-4"
                                    >
                                        <div className="text-2xl mb-2">📂</div>
                                        <span className="font-medium">Cliquez pour uploader des documents</span>
                                        <span className="text-xs mt-1 text-gray-500">PDF, CSV, TXT, Images acceptés</span>
                                    </button>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileUpload}
                                        accept=".pdf,.csv,.txt,.jpg,.png"
                                        multiple
                                        className="hidden"
                                    />

                                    {/* File List */}
                                    {getAgentConfig(selectedAgent.id).ragFiles.length > 0 && (
                                        <div className="space-y-2 max-h-40 overflow-y-auto">
                                            {getAgentConfig(selectedAgent.id).ragFiles.map((file, idx) => (
                                                <div key={idx} className="flex items-center justify-between bg-dark-space p-3 rounded border border-slate-700">
                                                    <div className="flex items-center">
                                                        <span className="text-xl mr-3">📄</span>
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-medium truncate max-w-[200px]">{file.name}</span>
                                                            <span className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</span>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => removeFile(idx)}
                                                        className="text-gray-500 hover:text-red-400 p-1"
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-slate-800 flex justify-end gap-3">
                            <button
                                onClick={() => setSelectedAgent(null)}
                                className="px-6 py-2 rounded-lg bg-dark-space-mid border border-slate-700 hover:bg-slate-800 transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={() => {
                                    // Save logic (already in state)
                                    setSelectedAgent(null);
                                }}
                                className="px-6 py-2 rounded-lg bg-astro-amber-500 text-dark-space font-bold hover:bg-astro-amber-400 transition-colors shadow-lg hover:shadow-astro-amber-500/20"
                            >
                                Enregistrer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SettingsView;
