import React from 'react';
import { galleryService } from '../../services/galleryService';

const WORKFLOW_TEMPLATES = [
    { id: 'social-campaign', title: 'Campagne Réseaux Sociaux 360°', steps: 5, description: 'Génération de posts, validation, et planification multi-plateforme.' },
    { id: 'blog-SEO', title: 'Article de Blog Optimisé SEO', steps: 3, description: 'Recherche mots-clés, rédaction, et optimisation technique.' },
    { id: 'email-nurturing', title: 'Séquence Email Nurturing', steps: 4, description: 'Série de 4 emails pour convertir les leads entrants.' },
    { id: 'video-script', title: 'Script Vidéo & Storyboard', steps: 6, description: 'Du concept au script détaillé avec suggestions visuelles.' },
];

const WorkflowGallery: React.FC<{ onCreate: () => void }> = ({ onCreate }) => {
    const [workflows, setWorkflows] = React.useState<any[]>(WORKFLOW_TEMPLATES);

    React.useEffect(() => {
        const fetchWorkflows = async () => {
            try {
                const dbWorkflows = await galleryService.getWorkflows();
                // Merge DB workflows with templates. 
                // DB workflows might need mapping to match the display format if different.
                // Assuming similar structure for simplicity or we render them slightly differently.
                setWorkflows([...WORKFLOW_TEMPLATES, ...dbWorkflows]);
            } catch (err) {
                console.error("Failed to fetch workflows", err);
            }
        };
        fetchWorkflows();
    }, []);

    return (
        <div className="h-full bg-[#160e1b] overflow-y-auto animate-fade-in p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-white mb-2">Galerie Workflows</h2>
                    <p className="text-slate-400">Automatisez vos processus avec des modèles éprouvés.</p>
                </div>
                <button
                    onClick={onCreate}
                    className="flex items-center space-x-2 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-900 px-6 py-3 rounded-xl font-bold text-sm shadow-lg hover:shadow-orange-500/20 transform hover:-translate-y-1 transition-all"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                    <span>Nouveau Workflow</span>
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {/* Create Card */}
                <button
                    onClick={onCreate}
                    className="border-2 border-dashed border-slate-700 rounded-2xl p-6 flex flex-col items-center justify-center text-center hover:border-amber-500 hover:bg-white/5 transition-all group min-h-[250px]"
                >
                    <div className="w-16 h-16 rounded-full bg-slate-800 group-hover:bg-amber-500/20 flex items-center justify-center mb-4 transition-colors">
                        <svg className="w-8 h-8 text-slate-500 group-hover:text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    </div>
                    <h3 className="text-lg font-bold text-white group-hover:text-amber-400">Créer depuis zéro</h3>
                    <p className="text-xs text-slate-500 mt-2">Utilisez le constructeur visuel</p>
                </button>

                {workflows.map((tpl) => (
                    <div key={tpl.id} className="bg-[#1e152a] rounded-2xl p-6 border border-white/5 hover:border-amber-500/50 transition-colors flex flex-col">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-amber-500/10 rounded-lg text-amber-500">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                            </div>
                            <span className="text-xs font-semibold bg-slate-800 text-slate-300 px-2 py-1 rounded">
                                {tpl.steps ? (Array.isArray(tpl.steps) ? tpl.steps.length : tpl.steps) : 0} Étapes
                            </span>
                        </div>

                        <h3 className="text-lg font-bold text-white mb-2">{tpl.name || tpl.title}</h3>
                        <p className="text-sm text-slate-400 mb-6 flex-grow">{tpl.description || 'Description du workflow...'}</p>

                        <div className="flex items-center space-x-3 mt-auto">
                            <button className="flex-1 bg-white/5 hover:bg-white/10 text-white py-2 rounded-lg text-sm font-semibold transition-colors">Aperçu</button>
                            <button className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-900 py-2 rounded-lg text-sm font-semibold transition-colors">Utiliser</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default WorkflowGallery;
