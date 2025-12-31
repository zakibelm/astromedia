// services/llmRouter.ts
import { pickBanditModel } from './llmBandit';
import { LLMConfig } from './llmCatalog';

export type Criteria = "cost" | "speed" | "quality" | "balanced";

// API Keys
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const HF_API_KEY = process.env.HF_API_KEY;
const API_KEY = process.env.API_KEY || OPENROUTER_API_KEY;

// Provider configurations
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const HF_BASE_URL = 'https://api-inference.huggingface.co/models';
const YOUR_SITE_URL = 'https://astromedia.ai';
const YOUR_SITE_NAME = 'AstroMedia';

/**
 * Call OpenRouter API
 */
async function callOpenRouter(config: LLMConfig, messages: any[], responseMimeType?: string) {
  if (!OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  // S'assurer qu'on n'utilise que le rôle "user" pour la compatibilité
  const safeMessages = messages.map(msg => ({
    role: "user", // Forcer à "user" pour éviter les erreurs
    content: msg.content
  }));

  const requestBody: any = {
    model: config.model,
    messages: safeMessages,
    temperature: 0.7,
    max_tokens: 4000
  };

  if (responseMimeType === "application/json") {
    requestBody.response_format = { type: "json_object" };
  }

  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': YOUR_SITE_URL,
      'X-Title': YOUR_SITE_NAME
    },
    body: JSON.stringify(requestBody)
  });

  return response;
}

/**
 * Call Hugging Face API
 */
async function callHuggingFace(config: LLMConfig, messages: any[]) {
  if (!HF_API_KEY) {
    throw new Error("HF_API_KEY is not configured");
  }

  // Convert messages to a single prompt for HF models
  const prompt = messages.map(msg => {
    if (msg.role === 'system') return `System: ${msg.content}`;
    if (msg.role === 'user') return `User: ${msg.content}`;
    return `Assistant: ${msg.content}`;
  }).join('\n\n');

  const response = await fetch(`${HF_BASE_URL}/${config.model}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${HF_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: {
        max_new_tokens: 1000,
        temperature: 0.7,
        return_full_text: false
      }
    })
  });

  return response;
}

/**
 * Helper function to execute a single LLM call with a given configuration
 */
async function executeLLMCall(
  config: LLMConfig,
  messages: any[],
  responseMimeType?: string
): Promise<any> {
  let response;

  // Intelligent provider routing
  switch (config.provider) {
    case "openrouter":
      console.log(`[llmRouter] Routing to OpenRouter...`);
      response = await callOpenRouter(config, messages, responseMimeType);
      break;

    case "huggingface":
      console.log(`[llmRouter] Routing to Hugging Face...`);
      response = await callHuggingFace(config, messages);
      break;

    default:
      throw new Error(`Unknown provider: ${config.provider}`);
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[llmRouter] ${config.provider} API Error:`, {
      provider: config.provider,
      model: config.model,
      status: response.status,
      statusText: response.statusText,
      body: errorText
    });

    throw new Error(`${config.provider} API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const result = await response.json();

  // Normalize response format based on provider
  let normalizedResponse;
  if (config.provider === "openrouter") {
    normalizedResponse = result; // Already in OpenAI format
  } else if (config.provider === "huggingface") {
    // Convert HF format to OpenAI-like format
    normalizedResponse = {
      choices: [{
        message: {
          content: Array.isArray(result) ? result[0]?.generated_text : result.generated_text || ""
        }
      }]
    };
  }

  return normalizedResponse;
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

  console.log(`[llmRouter] Agent "${task.agent}" (criteria: ${criteria}) → Provider: ${config.provider}, Model: "${config.model}"`);

  // Prepare messages for all providers
  // Certains modèles ne supportent pas le rôle "system", on combine avec user
  const messages = [];

  let userContent = task.input;
  if (task.systemInstruction) {
      // Combiner les instructions système avec le message utilisateur
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
    console.error(`[llmRouter] ${config.provider} API call failed:`, error.message);

    // Implement fallback strategy
    // Try alternative models if the primary one fails
    const fallbackModels = [
      "mistralai/mistral-7b-instruct:free",
      "google/gemma-2-9b-it:free",
      "meta-llama/llama-3-8b-instruct:free"
    ];

    // Only try fallbacks if we haven't already used them as primary
    for (const fallbackModel of fallbackModels) {
      if (config.model === fallbackModel) {
        continue; // Skip if this was the primary model that failed
      }

      try {
        console.warn(`[llmRouter] Trying fallback model: ${fallbackModel}`);
        const fallbackConfig: LLMConfig = {
          ...config,
          model: fallbackModel,
          provider: "openrouter" // Fallback models are on OpenRouter
        };

        const normalizedResponse = await executeLLMCall(fallbackConfig, messages, task.responseMimeType);
        const endTime = performance.now();

        console.log(`[llmRouter] Fallback successful with model: ${fallbackModel}`);
        return {
          response: normalizedResponse,
          modelId: fallbackModel,
          latency: endTime - startTime,
          success: true
        };
      } catch (fallbackError: any) {
        console.warn(`[llmRouter] Fallback model ${fallbackModel} also failed:`, fallbackError.message);
        // Continue to next fallback
      }
    }

    // All fallbacks failed, return error
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
