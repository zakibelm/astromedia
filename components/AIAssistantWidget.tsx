// FIX: Implemented the AIAssistantWidget component which was previously empty.
import React, { useState } from 'react';
import { aiAssistantService } from '../services/AIAssistantService';
import { agentBrains } from '../services/agentBrains';
import { useTranslation } from '../i18n/useTranslation';

const AIAssistantWidget: React.FC = () => {
  const { t, language } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState('default');

  const handleToggle = () => setIsOpen(!isOpen);

  const handleSubmit = async () => {
    if (!query.trim()) return;
    const currentQuery = query;
    setQuery(''); // Clear the input field immediately
    setIsLoading(true);
    setResponse('');
    try {
      const agentToUse = selectedAgent === 'default' ? undefined : selectedAgent;
      const result = await aiAssistantService.getSuggestion(currentQuery, agentToUse, language);
      setResponse(result);
    } catch (error) {
      setResponse(t('assistant.error'));
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={handleToggle}
        className="fixed bottom-4 right-4 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 w-16 h-16 rounded-full shadow-lg flex items-center justify-center hover:from-amber-500 hover:to-orange-600 transition-all duration-300 transform hover:scale-110 animate-gradient"
        aria-label={t('assistant.aria.open')}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-[#160e1b] border border-slate-800 rounded-lg shadow-2xl flex flex-col z-50 animate-fade-in-up">
      <div className="flex justify-between items-center p-4 border-b border-slate-800 bg-slate-900/50 rounded-t-lg">
        <h3 className="font-bold text-white flex items-center gap-2">
            <span className="text-amber-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
            </span>
            {t('assistant.title')}
        </h3>
        <button onClick={handleToggle} className="text-slate-400 hover:text-white text-2xl leading-none">&times;</button>
      </div>
      <div className="p-4 space-y-3 h-64 overflow-y-auto">
        <p className="text-sm text-slate-400">{t('assistant.welcome')}</p>
        {response && (
            <div className="p-3 bg-slate-800 border border-slate-700 rounded-md text-sm text-white" style={{ whiteSpace: 'pre-wrap' }}>
                {response}
            </div>
        )}
        {isLoading && <p className="text-sm text-slate-400 italic">{t('assistant.thinking')}</p>}
      </div>
      <div className="p-3 border-t border-slate-800 space-y-2 bg-slate-900/50 rounded-b-lg">
        <div>
          <label htmlFor="agent-select" className="block text-xs font-medium text-slate-400 mb-1">{t('assistant.selectAgent.label')}</label>
          <select 
            id="agent-select"
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="default">{t('assistant.selectAgent.default')}</option>
            {Object.values(agentBrains).map((brain) => (
              <option key={brain.id} value={brain.id}>{brain.title}</option>
            ))}
          </select>
        </div>
        <div className="flex space-x-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder={t('assistant.placeholder')}
            className="flex-1 bg-slate-800 border border-slate-700 rounded-md px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
            disabled={isLoading}
          />
          <button onClick={handleSubmit} disabled={isLoading || !query.trim()} className="px-4 py-1.5 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 rounded-md text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed animate-gradient transition-transform transform hover:scale-105">
            {t('assistant.button.send')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIAssistantWidget;