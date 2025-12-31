import React, { useState } from 'react';
import { useTranslation } from '../../i18n/useTranslation';
import { galleryService } from '../../services/galleryService';

const AgentCreator: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { t } = useTranslation();
    const [agentData, setAgentData] = useState({
        name: '',
        role: '',
        model: 'gpt-4-turbo',
        systemPrompt: '',
        knowledgeFiles: [] as File[],
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setAgentData({ ...agentData, knowledgeFiles: Array.from(e.target.files) });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await galleryService.createAgent({
                name: agentData.name,
                role: agentData.role,
                model: agentData.model,
                systemPrompt: agentData.systemPrompt,
                ragEnabled: agentData.knowledgeFiles.length > 0
            });
            // Handle file upload separately if needed, or assume backend handles it via separate endpoint later
            // For V1 MVP, we just create the agent record.
            onBack();
        } catch (error) {
            console.error("Failed to create agent", error);
            alert("Failed to create agent");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="p-6 bg-[#160e1b] h-full text-white overflow-y-auto animate-fade-in">
            <div className="flex items-center mb-8">
                <button onClick={onBack} className="mr-4 text-slate-400 hover:text-white transition-colors">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                </button>
                <h1 className="text-2xl font-bold">Créateur d'Agent IA</h1>
            </div>

            <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Nom de l'Agent</label>
                        <input
                            type="text"
                            required
                            value={agentData.name}
                            onChange={(e) => setAgentData({ ...agentData, name: e.target.value })}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 outline-none"
                            placeholder="Ex: Stratège Marketing"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Rôle / Spécialité</label>
                        <input
                            type="text"
                            required
                            value={agentData.role}
                            onChange={(e) => setAgentData({ ...agentData, role: e.target.value })}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 outline-none"
                            placeholder="Ex: Analyse de tendances"
                        />
                    </div>
                </div>

                {/* Model Selection */}
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Modèle IA</label>
                    <select
                        value={agentData.model}
                        onChange={(e) => setAgentData({ ...agentData, model: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 outline-none"
                    >
                        <option value="gpt-4-turbo">GPT-4 Turbo (OpenAI)</option>
                        <option value="claude-3-opus">Claude 3 Opus (Anthropic)</option>
                        <option value="claude-3-sonnet">Claude 3.5 Sonnet (Anthropic)</option>
                        <option value="mistral-large">Mistral Large (Mistral AI)</option>
                        <option value="llama-3-70b">Llama 3 70B (Meta)</option>
                    </select>
                </div>

                {/* System Prompt */}
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Prompt Système (Instructions Globales)</label>
                    <textarea
                        rows={6}
                        required
                        value={agentData.systemPrompt}
                        onChange={(e) => setAgentData({ ...agentData, systemPrompt: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 outline-none font-mono text-sm"
                        placeholder="Tu es un expert en marketing digital. Ton but est de..."
                    />
                    <p className="text-xs text-gray-500 mt-2">Définissez ici la personnalité, le ton et les règles strictes que l'agent doit suivre.</p>
                </div>

                {/* RAG Upload */}
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Base de Connaissances (RAG)</label>
                    <div className="border-2 border-dashed border-slate-700 rounded-lg p-8 text-center hover:border-purple-500 transition-colors bg-slate-800/50">
                        <input
                            type="file"
                            multiple
                            onChange={handleFileChange}
                            className="hidden"
                            id="rag-upload"
                        />
                        <label htmlFor="rag-upload" className="cursor-pointer flex flex-col items-center">
                            <svg className="w-12 h-12 text-slate-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                            <span className="text-slate-300 font-medium">Cliquez pour uploader des documents</span>
                            <span className="text-xs text-slate-500 mt-1">PDF, DOCX, TXT (Max 50MB)</span>
                        </label>
                    </div>
                    {agentData.knowledgeFiles.length > 0 && (
                        <div className="mt-4 space-y-2">
                            {agentData.knowledgeFiles.map((file, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-slate-800 rounded border border-slate-700">
                                    <span className="text-sm text-slate-200">{file.name}</span>
                                    <span className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="pt-6 border-t border-slate-700 flex justify-end">
                    <button type="button" onClick={onBack} className="px-6 py-2.5 mr-4 text-slate-300 hover:text-white font-medium">Annuler</button>
                    <button type="submit" className="px-8 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg text-white font-semibold shadow-lg hover:shadow-purple-500/30 transition-all transform hover:-translate-y-px">
                        Créer l'Agent
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AgentCreator;
