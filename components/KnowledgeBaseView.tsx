import React, { useRef } from 'react';
import { useTranslation } from '../i18n/useTranslation';
import { KnowledgeFile } from '../types';

interface KnowledgeBaseViewProps {
    files: KnowledgeFile[];
    onAddFile: (file: KnowledgeFile) => void;
}

const FileIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
);

const UploadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
);


const KnowledgeBaseView: React.FC<KnowledgeBaseViewProps> = ({ files, onAddFile }) => {
    const { t } = useTranslation();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];
            onAddFile({
                name: file.name,
                type: file.type,
                size: file.size,
            });
        }
    };

    const handleButtonClick = () => {
        fileInputRef.current?.click();
    };

    const formatBytes = (bytes: number, decimals = 2) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-white">{t('knowledge.title')}</h2>
                <p className="text-slate-400">{t('knowledge.subtitle')}</p>
            </div>

            <div className="bg-slate-900/50 p-6 rounded-lg border border-slate-700">
                <label className="block text-sm font-medium text-slate-300 mb-2">{t('knowledge.upload.label')}</label>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    aria-label={t('knowledge.upload.label')}
                />
                <button
                    onClick={handleButtonClick}
                    className="w-full bg-slate-800 hover:bg-slate-700/80 border-2 border-dashed border-slate-600 text-slate-400 font-semibold py-8 px-4 rounded-md transition-colors flex flex-col items-center justify-center"
                >
                    <UploadIcon />
                    <span className="mt-2">{t('knowledge.upload.button')}</span>
                </button>
            </div>

            {files.length === 0 ? (
                <div className="text-center py-10">
                    <FileIcon />
                    <h3 className="mt-2 text-lg font-semibold text-slate-300">{t('knowledge.empty.title')}</h3>
                    <p className="mt-1 text-sm text-slate-500">{t('knowledge.empty.subtitle')}</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                     <table className="w-full text-left">
                        <thead className="bg-slate-800/50">
                            <tr>
                                <th className="p-3 font-semibold text-slate-300">{t('knowledge.table.name')}</th>
                                <th className="p-3 font-semibold text-slate-300">{t('knowledge.table.type')}</th>
                                <th className="p-3 font-semibold text-slate-300 text-right">{t('knowledge.table.size')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {files.map((file, index) => (
                                <tr key={index} className="hover:bg-slate-800/30">
                                    <td className="p-3 text-slate-200 flex items-center">
                                        <FileIcon />
                                        <span className="ml-3">{file.name}</span>
                                    </td>
                                    <td className="p-3 text-slate-400">{file.type || 'N/A'}</td>
                                    <td className="p-3 text-slate-300 text-right font-mono">{formatBytes(file.size)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default KnowledgeBaseView;