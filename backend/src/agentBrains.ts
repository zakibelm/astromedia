import { promptLibrary } from './AIModelManager';
import { Mode } from './orchestration/types';

export type AgentId =
    | "CMO"
    | "MarketAnalyst"
    | "ContentWriter"
    | "SEO"
    | "Copywriter"
    | "Scriptwriter"
    | "designer"
    | "video-producer"
    | "Social"
    | "CRM"
    | "Analytics";

export interface AgentIO {
    expectedInputs: string[];
    expectedOutputs: string[];
}

export interface AgentBrain {
    id: AgentId | string;
    title: string;
    goal: string;
    knowledgeBase: string[];
    method: string[];
    outputStyle: string[];
    io: AgentIO;
    buildSystemPrompt: (args: {
        brandProfile?: string;
        campaignContext?: string;
        mode: Mode;
        policies?: string[];
        language: 'fr' | 'en';
        customInstructions?: string;
        ragContext?: string;
    }) => string;
}

function buildPrompt(agentId: string, template: string, details: any, args: any): string {
    const langName = args.language === 'fr' ? 'French' : 'English';
    const customInstructionsBlock = args.customInstructions ? `\nINSTRUCTIONS PERSONNALISÉES SUPPLÉMENTAIRES :\n${args.customInstructions}` : '';
    const ragBlock = args.ragContext ? `\n${args.ragContext}` : '';

    let prompt = template
        .replace('{goal}', details.goal)
        .replace('{method}', details.method.join("\n- "))
        .replace('{brandProfile}', args.brandProfile || "")
        .replace('{campaignContext}', args.campaignContext || "")
        .replace('{ragBlock}', ragBlock)
        .replace('{mode}', args.mode)
        .replace('{customInstructionsBlock}', customInstructionsBlock)
        .replace(/{langName}/g, langName);

    if (agentId === 'CMO') {
        const contextObject = JSON.parse(args.campaignContext || '{}');
        const analyticsReport = contextObject.analyticsReport ? `
CONTEXTE PERFORMANCE PASSÉE (à utiliser pour améliorer la nouvelle stratégie):
${JSON.stringify(contextObject.analyticsReport)}
` : "";
        prompt = prompt.replace('{analyticsReport}', analyticsReport);
    }

    if (agentId === 'MarketAnalyst') {
        const contextObject = JSON.parse(args.campaignContext || '{}');
        const analysisDepth = contextObject.analysisDepth;
        const slideCount = analysisDepth === 'detailed' ? "6 à 8" : "3";
        const depthInstruction = analysisDepth === 'detailed'
            ? "Fournir une analyse détaillée et approfondie."
            : "Fournir une analyse synthétique et de haut niveau.";
        prompt = prompt.replace('{analysisDepth}', analysisDepth)
            .replace('{depthInstruction}', depthInstruction)
            .replace('{slideCount}', slideCount);
    }

    return prompt.trim();
}

const createBrain = (id: string): AgentBrain => {
    const definition = promptLibrary[id];
    if (!definition) {
        throw new Error(`Agent brain definition not found for ID: ${id}`);
    }

    const fr = definition.fr;

    return {
        id: definition.id,
        title: fr.title,
        goal: fr.goal,
        knowledgeBase: [],
        method: fr.method,
        outputStyle: fr.outputStyle,
        io: definition.io,
        buildSystemPrompt: (args) => {
            const langDef = definition[args.language];
            return buildPrompt(id, langDef.template, langDef, args);
        },
    };
};

export const agentBrains: Record<string, AgentBrain> = Object.keys(promptLibrary).reduce((acc, key) => {
    acc[key] = createBrain(key);
    return acc;
}, {} as Record<string, AgentBrain>);
