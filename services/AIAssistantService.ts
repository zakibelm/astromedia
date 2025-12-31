// services/AIAssistantService.ts
import { runLLM } from './llmRouter';
import { updateModelStats } from './llmFeedback';
import { NewCampaignFormData } from '../types';
import { promptLibrary } from './AIModelManager';

class AIAssistantService {
  public async getSuggestion(
    query: string, 
    agentId?: string, 
    language: 'fr' | 'en' = 'fr',
    campaignContext?: NewCampaignFormData | null
  ): Promise<string> {
    console.log(`[AIAssistantService] Getting suggestion for query: "${query}" with agent: ${agentId}, language: ${language}`);
    
    const contextInstruction = campaignContext
      ? language === 'fr'
        ? `\nLe contexte de la campagne actuelle est : ${JSON.stringify({ name: campaignContext.projectName, goals: campaignContext.campaignGoals.objectives, audience: campaignContext.campaignGoals.targetAudience })}. Ta réponse doit être pertinente par rapport à ce contexte.`
        : `\nThe current campaign context is: ${JSON.stringify({ name: campaignContext.projectName, goals: campaignContext.campaignGoals.objectives, audience: campaignContext.campaignGoals.targetAudience })}. Your answer must be relevant to this context.`
      : '';

    let systemInstruction: string;
    
    if (agentId && promptLibrary[agentId]) {
      const agentDefinition = promptLibrary[agentId];
      const langDefinition = agentDefinition[language];
      console.log(`[AIAssistantService] Adopting persona of agent: ${langDefinition.title}`);
      
      const personaInstructions = {
        fr: `Tu es un expert IA agissant en tant que "${langDefinition.title}". Ton objectif est : "${langDefinition.goal}". Réponds à la question de l'utilisateur de manière concise et utile, en adoptant ta persona. Tu dois répondre en français.`,
        en: `You are an AI expert acting as the "${langDefinition.title}". Your goal is: "${langDefinition.goal}". Answer the user's question concisely and helpfully, adopting your persona. You must respond in English.`
      };
      systemInstruction = personaInstructions[language] + contextInstruction;

    } else {
      systemInstruction = (language === 'fr'
        ? "Vous êtes un assistant IA, expert en marketing. Fournissez une réponse concise et utile à la question de l'utilisateur. Vous devez répondre en français."
        : "You are an AI assistant and marketing expert. Provide a concise, helpful answer to the user's question. You must respond in English.") + contextInstruction;
    }
    
    // The user's query is the main input, the persona is the system instruction.
    const llmResult = await runLLM({
      agent: agentId || 'default',
      input: query,
      systemInstruction: systemInstruction,
      criteria: 'quality' // Always use high quality for direct user interaction
      // No responseMimeType is specified, so it will default to text/plain.
    });

    let content = '';
    let success = false;
    
    if (llmResult.success && llmResult.response) {
      if (llmResult.response?.choices?.[0]?.message?.content) {
        content = llmResult.response.choices[0].message.content;
      } else if (Array.isArray(llmResult.response) && llmResult.response[0]?.generated_text) {
        content = llmResult.response[0].generated_text;
      }
      success = content.trim().length > 0;
    } else {
        console.error(`[AIAssistantService] LLM call failed:`, llmResult.error);
    }
    
    // Update model stats
    updateModelStats(llmResult.modelId, { latency: llmResult.latency, success });
    console.log(`[Feedback] Updated stats for ${llmResult.modelId}: success=${success} (Assistant), latency=${llmResult.latency.toFixed(0)}ms`);
    
    if (!success) {
      return language === 'fr' 
        ? "Désolé, j'ai rencontré un problème lors du traitement de votre demande."
        : "Sorry, I encountered an issue processing your request.";
    }

    console.log(`[AIAssistantService] Successfully received suggestion.`);
    return content;
  }
}

export const aiAssistantService = new AIAssistantService();
