import React from 'react';
import { AgentProfileData } from '../types';

// --- Icon Components (re-used for both departments and agents) ---

const CmoIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
);

const AnalyticsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
);

const AbTestIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
    </svg>
);

const GrowthIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
);

const SeoIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

const SeaIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
    </svg>
);

const ContentWriterIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
);

const DesignerIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
);

const SocialMediaIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a2 2 0 01-2-2V7a2 2 0 012-2h6l2-2h2l-2 2z" />
    </svg>
);

const FilmIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
    </svg>
);


// --- NEW, more thematic department icons ---
const CompassIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16.628L4 12m0 0l4-4.628M4 12h16m0 0l-4 4.628M20 12l-4-4.628" />
    </svg>
);

const PaletteIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
    </svg>
);

const RocketIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
);

// --- DEPARTMENTS - For Accordion Headers in Sidebar ---
export const DEPARTMENTS = [
    {
        key: 'strategy',
        nameKey: 'agent.name.strategic',
        descriptionKey: 'agent.role.strategic',
        icon: <div className="text-cyan-400"><CompassIcon /></div>,
    },
    {
        key: 'creative',
        nameKey: 'agent.name.creative',
        descriptionKey: 'agent.role.creative',
        icon: <div className="text-pink-400"><PaletteIcon /></div>,
    },
    {
        key: 'adaptor',
        nameKey: 'agent.name.adaptor',
        descriptionKey: 'agent.role.adaptor',
        icon: <div className="text-green-400"><AbTestIcon /></div>,
    },
    {
        key: 'distribution',
        nameKey: 'agent.name.distribution',
        descriptionKey: 'agent.role.distribution',
        icon: <div className="text-orange-400"><RocketIcon /></div>,
    },
    {
        key: 'feedback',
        nameKey: 'agent.name.feedback',
        descriptionKey: 'agent.role.feedback',
        icon: <div className="text-indigo-400"><AnalyticsIcon /></div>,
    },
];

// --- SPECIALIZED AGENTS - The single source of truth for all individual agents ---
export const AGENT_PROFILES: AgentProfileData[] = [
    {
        id: 'cmo',
        nameKey: 'agent.name.cmo',
        descriptionKey: 'agent.role.cmo',
        status: 'active',
        icon: <div className="text-purple-400"><CmoIcon /></div>,
        departmentKey: 'strategy',
    },
    {
        id: 'market-analyst',
        nameKey: 'agent.name.market-analyst',
        descriptionKey: 'agent.role.market-analyst',
        status: 'inactive',
        icon: <div className="text-indigo-400"><AnalyticsIcon /></div>,
        departmentKey: 'strategy',
    },
    {
        id: 'analytics',
        nameKey: 'agent.name.analytics',
        descriptionKey: 'agent.role.analytics',
        status: 'inactive',
        icon: <div className="text-blue-400"><AnalyticsIcon /></div>,
        departmentKey: 'feedback',
    },
    {
        id: 'ab-testing',
        nameKey: 'agent.name.ab-testing',
        descriptionKey: 'agent.role.ab-testing',
        status: 'inactive',
        icon: <div className="text-teal-400"><AbTestIcon /></div>,
        departmentKey: 'adaptor',
    },
    {
        id: 'growth-hacker',
        nameKey: 'agent.name.growth-hacker',
        descriptionKey: 'agent.role.growth-hacker',
        status: 'inactive',
        icon: <div className="text-green-400"><GrowthIcon /></div>,
        departmentKey: 'adaptor',
    },
    {
        id: 'seo',
        nameKey: 'agent.name.seo',
        descriptionKey: 'agent.role.seo',
        status: 'inactive',
        icon: <div className="text-cyan-400"><SeoIcon /></div>,
        departmentKey: 'distribution',
    },
    {
        id: 'sea',
        nameKey: 'agent.name.sea',
        descriptionKey: 'agent.role.sea',
        status: 'inactive',
        icon: <div className="text-sky-400"><SeaIcon /></div>,
        departmentKey: 'distribution',
    },
    {
        id: 'content-writer',
        nameKey: 'agent.name.content-writer',
        descriptionKey: 'agent.role.content-writer',
        status: 'inactive',
        icon: <div className="text-orange-400"><ContentWriterIcon /></div>,
        departmentKey: 'creative',
    },
    {
        id: 'copywriter',
        nameKey: 'agent.name.copywriter',
        descriptionKey: 'agent.role.copywriter',
        status: 'waiting',
        icon: <div className="text-amber-400"><ContentWriterIcon /></div>,
        departmentKey: 'creative',
    },
    {
        id: 'scriptwriter',
        nameKey: 'agent.name.scriptwriter',
        descriptionKey: 'agent.role.scriptwriter',
        status: 'inactive',
        icon: <div className="text-yellow-400"><FilmIcon /></div>,
        departmentKey: 'creative',
    },
    {
        id: 'designer',
        nameKey: 'agent.name.designer',
        descriptionKey: 'agent.role.designer',
        status: 'active',
        icon: <div className="text-pink-400"><DesignerIcon /></div>,
        departmentKey: 'creative',
    },
    {
        id: 'social-media',
        nameKey: 'agent.name.social-media',
        descriptionKey: 'agent.role.social-media',
        status: 'inactive',
        icon: <div className="text-red-400"><SocialMediaIcon /></div>,
        departmentKey: 'distribution',
    }
];