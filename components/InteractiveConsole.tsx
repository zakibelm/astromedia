import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from '../i18n/useTranslation';
import { NewCampaignFormData } from '../types';
import { agentBrains } from '../services/agentBrains';
import { aiAssistantService } from '../services/AIAssistantService';

interface Message {
  sender: 'user' | 'ai' | 'system';
  text: string;
}

interface InteractiveConsoleProps {
  activeCampaign: NewCampaignFormData | null;
}

const InteractiveConsole: React.FC<InteractiveConsoleProps> = ({ activeCampaign }) => {
  const { t, language } = useTranslation();
  
  const welcomeMessage = activeCampaign 
    ? t('console.welcome_campaign', { campaignName: activeCampaign.projectName }) 
    : t('console.welcome');

  const [messages, setMessages] = useState<Message[]>([
    { sender: 'system', text: welcomeMessage }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState('default');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);
  
  // Update welcome message if campaign changes
  useEffect(() => {
    const newWelcome = activeCampaign
      ? t('console.welcome_campaign', { campaignName: activeCampaign.projectName })
      : t('console.welcome');
    setMessages([{ sender: 'system', text: newWelcome }]);
  }, [activeCampaign, t]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const currentInput = input;
    const userMessage: Message = { sender: 'user', text: currentInput };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    let aiResponse: Message;
    try {
      const agentToUse = selectedAgent === 'default' ? undefined : selectedAgent;
      const result = await aiAssistantService.getSuggestion(
        currentInput,
        agentToUse,
        language,
        activeCampaign
      );
      aiResponse = { sender: 'ai', text: result };
    } catch (error) {
      console.error(error);
      aiResponse = { sender: 'ai', text: t('console.error') };
    }
    
    setMessages(prev => [...prev, aiResponse]);
    setIsLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  const placeholderText = activeCampaign
    ? t('console.placeholder_campaign', { campaignName: activeCampaign.projectName })
    : t('console.placeholder');

  return (
    <div className="flex flex-col h-full bg-slate-900/50 rounded-lg overflow-hidden border border-slate-800">
      <div className="flex-1 p-6 space-y-4 overflow-y-auto">
        {messages.map((msg, index) => (
          <div key={index} className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
            {msg.sender === 'ai' && <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex-shrink-0"></div>}
            {msg.sender === 'system' && <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex-shrink-0"></div>}
            
            <div className={`max-w-xl p-3 rounded-lg text-sm ${
              msg.sender === 'user' ? 'bg-amber-500 text-slate-900' : 
              msg.sender === 'system' ? 'bg-slate-800 text-slate-400 italic' : 
              'bg-slate-800 text-white'
            }`}>
              <p style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex-shrink-0"></div>
            <div className="max-w-xl p-3 rounded-lg bg-slate-800 text-white">
              <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 border-t border-slate-800 bg-slate-900">
        <div className="space-y-3">
          <div>
            <label htmlFor="agent-select" className="block text-xs font-medium text-slate-400 mb-1">{t('assistant.selectAgent.label')}</label>
            <select 
              id="agent-select"
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              disabled={!activeCampaign}
            >
              <option value="default">{t('assistant.selectAgent.default')}</option>
              {Object.values(agentBrains).map((brain) => (
                <option key={brain.id} value={brain.id}>{brain.title}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center space-x-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={placeholderText}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-md px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="px-5 py-2 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 rounded-md font-semibold transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-orange-500/20 transform hover:-translate-y-px disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none animate-gradient"
            >
              {t('console.button.send')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InteractiveConsole;