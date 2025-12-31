
import React from 'react';
import { useTranslation } from '../i18n/useTranslation';
import LanguageSwitcher from './LanguageSwitcher';

interface HeaderProps {
  onStart: () => void;
}

const Header: React.FC<HeaderProps> = ({ onStart }) => {
  const { t } = useTranslation();

  return (
    <header className="h-16 px-6 bg-[#10051a] border-b border-white/5 flex justify-between items-center sticky top-0 z-50">
      <div className="flex items-center space-x-3">
        <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse"></div>
        <span className="text-xs font-semibold text-gray-400 tracking-wider uppercase">Nominal Status: System Alpha</span>
      </div>

      <div className="flex items-center space-x-4">
        <LanguageSwitcher />

        <button className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-full transition-colors">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </button>

        <button className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-full transition-colors">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>

        <div className="h-8 w-px bg-white/10 mx-2"></div>

        <div className="flex items-center space-x-2 text-sm font-medium text-white">
          <span>JD-Enterprise-01</span>
          <div className="h-8 w-8 rounded bg-slate-800 border border-slate-700 flex items-center justify-center">
            <span className="text-xs text-gray-400">JD</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;