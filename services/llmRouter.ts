// services/llmRouter.ts
import { pickBanditModel } from './llmBandit';
import { LLMConfig } from './llmCatalog';

export type Criteria = "cost" | "speed" | "quality" | "balanced";

// NOTE: API Keys have been moved to backend for security.
// Use /api/v1/llm/generate endpoint.

/**
 * Call Backend LLM Proxy
 */
async function callBackendLLM(config: LLMConfig, messages: any[], responseMimeType?: string) {
  const token = localStorage.getItem('token'); // Assumes token is stored here

  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Adapter les messages pour le backend (Zod schema expects 'role' and 'content')
  const safeMessages = messages.map(msg => ({
    role: msg.role || "user",
    content: msg.content
  }));

  const response = await fetch('/api/v1/llm/generate', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      messages: safeMessages,
      model: config.model,
      criteria: "balanced", // Could pass specific criteria
      responseMimeType
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Backend API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return response;
}

/**
 * Execute a single LLM call via Backend
 */
async function executeLLMCall(
  config: LLMConfig,
  messages: any[],
  responseMimeType?: string
): Promise<any> {
  console.log(`[llmRouter] Routing to Backend (Model: ${config.model}, Provider: ${config.provider})`);

  // For now, both OpenRouter and HF (fallbacks) are routed via the same secure endpoint
  // The backend 'llm.routes.ts' currently supports 'model' parameter which allows OpenRouter routing.
  // HF specific routing logic is currently deprecated in frontend for security.

  // Si le provider est HuggingFace, on peut tenter de passer via OpenRouter si le modèle est dispo,
  // ou avertir que c'est désactivé temporairement si le backend ne le supporte pas.
  // Mon backend implémente OpenRouter proxy.

  const response = await callBackendLLM(config, messages, responseMimeType);
  const result = await response.json();

  return result; // Backend returns OpenAI-like format
}

/**
 * Executes an LLM call with intelligent provider routing.
 * Automatically detects provider and routes to appropriate API.
 */
export async function runLLM(task: {
  agent: string;
  input: string;
  systemInstruction?: string;
  criteria?: Criteria;
  responseMimeType?: "application/json" | "text/plain";
}): Promise<{
  response: any | null,
  modelId: string,
  latency: number,
  success: boolean,
  error?: Error
}> {
  const startTime = performance.now();

  const criteria = task.criteria || 'balanced';
  const config = pickBanditModel(task.agent, criteria, 0.1);

  console.log(`[llmRouter] Agent "${task.agent}" (criteria: ${criteria}) → Model: "${config.model}"`);

  const messages = [];

  let userContent = task.input;
  if (task.systemInstruction) {
    userContent = `${task.systemInstruction}\n\nUser: ${task.input}`;
  }

  messages.push({
    role: "user",
    content: userContent
  });

  try {
    const normalizedResponse = await executeLLMCall(config, messages, task.responseMimeType);
    const endTime = performance.now();

    return {
      response: normalizedResponse,
      modelId: config.model,
      latency: endTime - startTime,
      success: true
    };
  } catch (error: any) {
    console.error(`[llmRouter] Backend/API call failed:`, error.message);

    // Fallback logic could be implemented here by requesting a different model from backend
    // For now, we return error to let Orchestrator handle constraints

    const endTime = performance.now();
    return {
      response: null,
      modelId: config.model,
      latency: endTime - startTime,
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
}

