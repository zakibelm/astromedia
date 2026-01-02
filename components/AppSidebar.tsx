import React from 'react';
import { useTranslation } from '../i18n/useTranslation';
import Logo from './Logo';

interface SidebarProps {
    currentView: string;
    setCurrentView: (view: string) => void;
}

const AppSidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView }) => {
    const { t } = useTranslation();

    const menuItems = [
        { id: 'dashboard', label: 'Tableau de bord', icon: <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /> },
        { id: 'agents', label: "Équipe d'Agents AI", icon: <path d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /> },
        { id: 'nanobanana', label: 'Lab NanoBanana', icon: <path d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /> },
        { id: 'creator', label: 'Créateur de Campagne', icon: <path d="M13 10V3L4 14h7v7l9-11h-7z" /> },
        { id: 'studio', label: 'Studio Créatif', icon: <path d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /> },
        { id: 'gallery', label: 'Médiathèque', icon: <path d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v8a2 2 0 01-2 2H5z" /> }, // Gallery Link
        { id: 'analytics', label: 'Analyses', icon: <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /> },
    ];

    return (
        <aside className="w-64 bg-dark-space flex flex-col border-r border-astro-amber-500/10 shrink-0 h-screen font-sans">
            {/* Header / Logo */}
            <div className="p-6 mb-2">
                <div className="flex items-center space-x-3 mb-1">
                    <Logo size="sm" />
                </div>
                <p className="text-[10px] text-gray-400 tracking-widest pl-1 uppercase">Next-Gen Media Suite</p>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 space-y-1">
                {menuItems.map((item) => {
                    const isActive = currentView === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => setCurrentView(item.id)}
                            className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 group ${isActive
                                ? 'bg-gradient-to-r from-astro-amber-500/20 to-orange-600/20 text-astro-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.1)] border border-astro-amber-500/20'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <svg
                                className={`mr-3 h-5 w-5 transition-colors ${isActive ? 'text-astro-amber-400' : 'text-gray-500 group-hover:text-astro-cyan-400'}`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                            >
                                {item.icon}
                            </svg>
                            {item.label}
                        </button>
                    );
                })}
            </nav>

            {/* User Profile Footer */}
            <div className="p-4 border-t border-astro-amber-500/10">
                <div className="flex items-center p-3 rounded-xl bg-dark-space-mid border border-astro-amber-500/10">
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-astro-amber-500 to-orange-600 flex items-center justify-center text-xs font-bold text-white shadow-[0_0_10px_rgba(245,158,11,0.3)]">
                        JD
                    </div>
                    <div className="ml-3">
                        <p className="text-xs font-bold text-white">JD-Enterprise-01</p>
                        <p className="text-[10px] text-gray-400">Pro Tier Active</p>
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default AppSidebar;