import React, { useState } from 'react';
import AgentGallery from './AgentGallery';
import WorkflowGallery from './WorkflowGallery';
import AgentCreator from './AgentCreator';
import WorkflowBuilder from './WorkflowBuilder';

const Gallery: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'agents' | 'workflows'>('agents');
    const [viewMode, setViewMode] = useState<'list' | 'create'>('list');

    // Reset to list view when switching tabs
    const handleTabChange = (tab: 'agents' | 'workflows') => {
        setActiveTab(tab);
        setViewMode('list');
    };

    if (viewMode === 'create') {
        if (activeTab === 'agents') {
            return <AgentCreator onBack={() => setViewMode('list')} />;
        } else {
            return <WorkflowBuilder onBack={() => setViewMode('list')} />;
        }
    }

    return (
        <div className="flex flex-col h-full bg-dark-space">
            {/* Gallery Navbar */}
            <div className="flex items-center space-x-8 px-8 py-4 border-b border-astro-amber-500/10 bg-dark-space">
                <button
                    onClick={() => handleTabChange('agents')}
                    className={`pb-2 text-sm font-bold uppercase tracking-wider transition-all border-b-2 ${activeTab === 'agents'
                        ? 'text-astro-cyan-400 border-astro-cyan-400'
                        : 'text-gray-500 border-transparent hover:text-white'
                        }`}
                >
                    Galerie Agents AI
                </button>
                <button
                    onClick={() => handleTabChange('workflows')}
                    className={`pb-2 text-sm font-bold uppercase tracking-wider transition-all border-b-2 ${activeTab === 'workflows'
                        ? 'text-astro-amber-400 border-astro-amber-400'
                        : 'text-gray-500 border-transparent hover:text-white'
                        }`}
                >
                    Galerie Workflows
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative">
                {activeTab === 'agents' ? (
                    <AgentGallery onCreate={() => setViewMode('create')} />
                ) : (
                    <WorkflowGallery onCreate={() => setViewMode('create')} />
                )}
            </div>
        </div>
    );
};

export default Gallery;
