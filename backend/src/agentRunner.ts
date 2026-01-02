
import { agentBrains } from "./agentBrains";
import { runLLM, Criteria } from "./services/llm/llmRouter";
import { Mode } from "./orchestration/types";
import { updateModelStats } from './llmFeedback';
import { generateImage } from "./imageGenerator";
import { DesignerOutputSchema, VideoProducerOutputSchema } from "./agentSchemas";
import { AgentConfiguration } from "./types";
import { generateVideo } from "./videoGenerator";


async function runTextAgent(
    agentId: string,
    { context, mode, agentConfig, ragEnabled }: {
        context: any,
        mode: Mode,
        agentConfig: AgentConfiguration,
        ragEnabled: boolean,
    }
): Promise<Record<string, any>> {
    const brain = agentBrains[agentId];
    if (!brain) throw new Error(`Agent ${agentId} introuvable`);

    const language = 'fr';

    const ragContext = (ragEnabled && context.knowledgeBase && context.knowledgeBase.length > 0)
        ? `CONTEXTE SUPPLÉMENTAIRE DE LA BASE DE CONNAISSANCES (RAG) :\n${context.knowledgeBase.map((f: any) => `- Document: ${f.name}`).join('\n')}\n(NOTE: Le contenu des fichiers n'est pas fourni, seulement la liste pour le contexte.)`
        : undefined;

    const systemPrompt = brain.buildSystemPrompt({
        brandProfile: context.brandProfile,
        campaignContext: JSON.stringify(context, null, 2),
        mode,
        language,
        customInstructions: agentConfig.customInstructions,
        ragContext: ragContext
    });

    const criteria: Criteria = agentConfig.criteria || 'balanced';

    console.log(`>>> Running agent "${agentId}" with mode "${mode}" (criteria: ${criteria})...`);
    const llmResult = (await runLLM({
        agent: agentId,
        input: "Generate the required JSON object based on your instructions.",
        systemInstruction: systemPrompt,
        criteria,
        responseMimeType: "application/json"
    })) as any;

    if (!llmResult.success || !llmResult.response) {
        updateModelStats(llmResult.modelId, { latency: llmResult.latency, success: false });
        console.error(`[Feedback] Updated stats for ${llmResult.modelId}: success=false (API failure), latency=${llmResult.latency.toFixed(0)}ms`);
        throw llmResult.error || new Error(`LLM API call failed for agent ${agentId}`);
    }

    let content = '';
    // Fix: Handle structure from runLLM. The backend runLLM returns 'response' which is the raw OpenRouter response object?
    // Check llmRouter.ts: it returns { response: data, ... } where data is openrouter json.
    // So llmResult.response has .choices...

    if (llmResult.response?.choices?.[0]?.message?.content) {
        content = llmResult.response.choices[0].message.content;
    } else if (Array.isArray(llmResult.response) && llmResult.response[0]?.generated_text) {
        content = llmResult.response[0].generated_text;
    } else {
        // Fallback if response structure is different
        content = JSON.stringify(llmResult.response);
    }

    let parsedJson: any;
    let isJsonValid = false;
    let parseError: Error | null = null;
    try {
        if (!content) throw new Error("Empty content from LLM.");
        const jsonString = content.replace(/^```json\s*|```\s*$/g, '').trim();
        parsedJson = JSON.parse(jsonString);
        isJsonValid = true;
    } catch (error: any) {
        console.error(`[agentRunner] Failed to parse JSON response from ${agentId}:`, error);
        console.error(`[agentRunner] Raw content was:`, content);
        isJsonValid = false;
        parseError = error;
    } finally {
        updateModelStats(llmResult.modelId, { latency: llmResult.latency, success: isJsonValid });
        console.log(`[Feedback] Updated stats for ${llmResult.modelId}: success=${isJsonValid} (JSON parse), latency=${llmResult.latency.toFixed(0)}ms`);
    }

    if (!isJsonValid) {
        const errorMessage = `Agent ${agentId} failed to produce valid JSON output.\nError: ${parseError?.message}\nRaw output snippet: ${content.substring(0, 200)}...`;
        throw new Error(errorMessage);
    }

    return parsedJson;
}

export async function runAgent(agentId: string, { context, mode }: { context: any, mode: Mode }): Promise<Record<string, any>> {
    const agentConfig = context.agentConfiguration?.[agentId] || { criteria: 'balanced', customInstructions: '' };
    const ragEnabled = context.ragEnabled === true;

    if (agentId === 'designer') {
        console.log(">>> Running special agent: Designer (A/B creative generation)");

        console.log("[Designer Agent - Step 1] Generating A/B prompts...");
        const promptData = await runTextAgent(agentId, { context, mode, agentConfig, ragEnabled });

        const parsedPromptData = DesignerOutputSchema.safeParse(promptData);
        if (!parsedPromptData.success) {
            throw new Error(`Designer agent failed to produce a valid prompt object: ${parsedPromptData.error.message}`);
        }
        const { visualSuggestion, imagePrompts: { artistic: artisticPrompt, realistic: realisticPrompt } } = parsedPromptData.data;

        console.log(`[Designer Agent - Step 1] Artistic prompt: "${artisticPrompt}"`);
        console.log(`[Designer Agent - Step 1] Realistic prompt: "${realisticPrompt}"`);

        console.log("[Designer Agent - Step 2] Generating A/B images in parallel...");
        const [artisticImage, realisticImage] = await Promise.all([
            generateImage(artisticPrompt),
            generateImage(realisticPrompt)
        ]);
        console.log("[Designer Agent - Step 2] A/B image generation successful.");

        return {
            visuals: {
                visualSuggestion: visualSuggestion,
                artistic: {
                    modelName: 'NanoBanana',
                    imageBase64: artisticImage
                },
                realistic: {
                    modelName: 'Seedream',
                    imageBase64: realisticImage
                }
            }
        };
    }

    if (agentId === 'video-producer') {
        console.log(">>> Running special agent: Video Producer (A/B creative generation)");

        console.log("[Video Producer - Step 1] Generating A/B prompts...");
        const promptData = await runTextAgent(agentId, { context, mode, agentConfig, ragEnabled });
        const parsedPrompts = VideoProducerOutputSchema.safeParse(promptData);
        if (!parsedPrompts.success) {
            throw new Error(`Video Producer agent failed to produce a valid prompt object: ${parsedPrompts.error.message}`);
        }

        const { narrative: narrativePrompt, dynamic: dynamicPrompt } = parsedPrompts.data.videoPrompts;
        console.log(`[Video Producer - Step 1] Narrative prompt: "${narrativePrompt}"`);
        console.log(`[Video Producer - Step 1] Dynamic prompt: "${dynamicPrompt}"`);

        const validatedVisual = context.validatedVisual;
        if (!validatedVisual || !validatedVisual.imageBase64) {
            throw new Error("Cannot run Video Producer: No validated visual found in context.");
        }
        const imageInput = {
            imageBytes: validatedVisual.imageBase64,
            mimeType: 'image/jpeg'
        };

        console.log("[Video Producer - Step 2] Generating A/B videos in parallel...");
        const [narrativeVideo, dynamicVideo] = await Promise.all([
            generateVideo(narrativePrompt, imageInput),
            generateVideo(dynamicPrompt, imageInput)
        ]);
        console.log("[Video Producer - Step 2] A/B video generation successful.");

        return {
            videos: {
                narrative: {
                    modelName: 'Wan2.2',
                    videoBase64: narrativeVideo,
                },
                dynamic: {
                    modelName: 'Veo3',
                    videoBase64: dynamicVideo,
                },
            }
        };
    }

    return runTextAgent(agentId, { context, mode, agentConfig, ragEnabled });
}
