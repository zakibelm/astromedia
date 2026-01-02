// services/llmRouter.ts
import { pickBanditModel } from './llmBandit';
import { LLMConfig } from './llmCatalog';

export type Criteria = "cost" | "speed" | "quality" | "balanced";

// NOTE: API Keys have been moved to backend for security.
// Use /api/v1/llm/generate endpoint.

// Backend-specific implementation
async function callBackOpenRouter(config: LLMConfig, messages: any[], responseMimeType?: string) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not defined in backend");

  const safeMessages = messages.map(msg => ({
    role: msg.role || "user",
    content: msg.content
  }));

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://astromedia.ai', // Optional
      'X-Title': 'AstroMedia Backend', // Optional
    },
    body: JSON.stringify({
      messages: safeMessages,
      model: config.model,
      // You can implement custom logic here if needed
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return response;
}

/**
 * Execute a single LLM call (Server Side)
 */
async function executeLLMCall(
  config: LLMConfig,
  messages: any[],
  responseMimeType?: string
): Promise<any> {
  console.log(`[llmRouter][Backend] Routing to OpenRouter (Model: ${config.model})`);

  const response = await callBackOpenRouter(config, messages, responseMimeType);
  const result = await response.json();

  return result;
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
  cost?: number, // Added to fix queue errors
  error?: Error
}> {
  const startTime = performance.now();

  const criteria = task.criteria || 'balanced';
  const config = pickBanditModel(task.agent, criteria, 0.1);

  console.log(`[llmRouter] Agent "${task.agent}" (criteria: ${criteria}) → Model: "${config.model}"`);

  const messages: any[] = [];

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
      success: true,
      cost: 0 // Placeholder cost calculation
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
      cost: 0,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
}

