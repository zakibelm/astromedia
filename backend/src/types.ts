export type Criteria = "cost" | "speed" | "quality" | "balanced";

export interface AgentConfiguration {
    criteria: Criteria;
    customInstructions: string;
}

export interface KnowledgeFile {
    name: string;
    type: string;
    size: number;
}

export type GovernanceMode = 'follow' | 'semi-auto' | 'full';

export type Mode = "guided" | "semi_auto" | "auto";
