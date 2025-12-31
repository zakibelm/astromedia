// tests/unit/agentRunner.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runAgent } from '../../services/agentRunner';
import * as llmRouter from '../../services/llmRouter';
import * as imageGenerator from '../../services/imageGenerator';
import * as videoGenerator from '../../services/videoGenerator';
import { agentBrains } from '../../services/agentBrains';
import { Mode } from '../../services/orchestration/types';

// Mocks
vi.mock('../../services/llmRouter');
vi.mock('../../services/imageGenerator');
vi.mock('../../services/videoGenerator');

const mockedRunLLM = vi.mocked(llmRouter.runLLM);
const mockedGenerateImage = vi.mocked(imageGenerator.generateImage);
const mockedGenerateVideo = vi.mocked(videoGenerator.generateVideo);

describe('agentRunner: runAgent', () => {
  const baseContext = {
    brandProfile: 'Test Brand',
    agentConfiguration: {
        'CMO': { criteria: 'quality', customInstructions: 'Be formal.' },
        'designer': { criteria: 'balanced', customInstructions: '' },
        'video-producer': { criteria: 'speed', customInstructions: '' }
    },
    ragEnabled: false,
    knowledgeBase: []
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('for standard text agents (e.g., CMO)', () => {
    it('should call runLLM with the correct parameters', async () => {
      mockedRunLLM.mockResolvedValue({
        response: { choices: [{ message: { content: '{ "summary": "ok" }' } }] },
        modelId: 'test-model',
        latency: 100,
        success: true
      });

      const result = await runAgent('CMO', { context: baseContext, mode: 'auto' });

      expect(result).toEqual({ summary: 'ok' });
      expect(mockedRunLLM).toHaveBeenCalledOnce();
      const llmCall = mockedRunLLM.mock.calls[0][0];
      expect(llmCall.agent).toBe('CMO');
      expect(llmCall.systemInstruction).toContain('Tu es le CMO IA d’AstroMedia');
      expect(llmCall.systemInstruction).toContain('Be formal.'); // Custom instructions
      expect(llmCall.criteria).toBe('quality');
      expect(llmCall.responseMimeType).toBe('application/json');
    });

    it('should throw an error if LLM returns invalid JSON', async () => {
      mockedRunLLM.mockResolvedValue({
        response: { choices: [{ message: { content: 'not json' } }] },
        modelId: 'test-model',
        latency: 100,
        success: true
      });

      await expect(runAgent('CMO', { context: baseContext, mode: 'auto' })).rejects.toThrow(/failed to produce valid JSON output/);
    });
    
    it('should include RAG context in the prompt if enabled', async () => {
      mockedRunLLM.mockResolvedValue({
        response: { choices: [{ message: { content: '{ "summary": "ok" }' } }] },
        modelId: 'test-model',
        latency: 100,
        success: true
      });
      const ragContext = {
        ...baseContext,
        ragEnabled: true,
        knowledgeBase: [{ name: 'brand_guide.pdf' }]
      };
      
      await runAgent('CMO', { context: ragContext, mode: 'auto' });
      
      const llmCall = mockedRunLLM.mock.calls[0][0];
      expect(llmCall.systemInstruction).toContain('CONTEXTE SUPPLÉMENTAIRE DE LA BASE DE CONNAISSANCES (RAG)');
      expect(llmCall.systemInstruction).toContain('- Document: brand_guide.pdf');
    });
  });

  describe('for special agent: designer', () => {
    it('should run text agent to get prompts, then generate two images', async () => {
      const designerPrompts = {
        visualSuggestion: 'A creative idea',
        imagePrompts: {
          artistic: 'art prompt',
          realistic: 'photo prompt',
        }
      };
      mockedRunLLM.mockResolvedValue({
        response: { choices: [{ message: { content: JSON.stringify(designerPrompts) } }] },
        modelId: 'test-model',
        latency: 100,
        success: true
      });
      mockedGenerateImage.mockImplementation(async (prompt) => {
        return prompt === 'art prompt' ? 'base64_art' : 'base64_photo';
      });

      const result = await runAgent('designer', { context: baseContext, mode: 'auto' });

      expect(mockedRunLLM).toHaveBeenCalledOnce();
      expect(mockedGenerateImage).toHaveBeenCalledTimes(2);
      expect(mockedGenerateImage).toHaveBeenCalledWith('art prompt');
      expect(mockedGenerateImage).toHaveBeenCalledWith('photo prompt');
      expect(result).toEqual({
        visuals: {
          visualSuggestion: 'A creative idea',
          artistic: { modelName: 'NanoBanana', imageBase64: 'base64_art' },
          realistic: { modelName: 'Seedream', imageBase64: 'base64_photo' }
        }
      });
    });

    it('should throw if the text agent part fails to return valid prompts', async () => {
        mockedRunLLM.mockResolvedValue({
          response: { choices: [{ message: { content: '{ "invalid": "structure" }' } }] },
          modelId: 'test-model',
          latency: 100,
          success: true
        });
  
        await expect(runAgent('designer', { context: baseContext, mode: 'auto' })).rejects.toThrow(/Designer agent failed to produce a valid prompt object/);
    });
  });

  describe('for special agent: video-producer', () => {
    const videoContext = {
        ...baseContext,
        validatedVisual: { imageBase64: 'validated_image_base64' }
    };

    it('should run text agent, then generate two videos based on a validated visual', async () => {
        const videoPrompts = {
            videoPrompts: {
                narrative: 'narrative prompt',
                dynamic: 'dynamic prompt'
            }
        };
        mockedRunLLM.mockResolvedValue({
            response: { choices: [{ message: { content: JSON.stringify(videoPrompts) } }] },
            modelId: 'test-model',
            latency: 100,
            success: true
        });
        mockedGenerateVideo.mockImplementation(async (prompt) => {
            return prompt === 'narrative prompt' ? 'base64_narrative' : 'base64_dynamic';
        });

        const result = await runAgent('video-producer', { context: videoContext, mode: 'auto' });

        expect(mockedRunLLM).toHaveBeenCalledOnce();
        expect(mockedGenerateVideo).toHaveBeenCalledTimes(2);
        const imageInput = { imageBytes: 'validated_image_base64', mimeType: 'image/jpeg' };
        expect(mockedGenerateVideo).toHaveBeenCalledWith('narrative prompt', imageInput);
        expect(mockedGenerateVideo).toHaveBeenCalledWith('dynamic prompt', imageInput);
        expect(result).toEqual({
            videos: {
                narrative: { modelName: 'Wan2.2', videoBase64: 'base64_narrative' },
                dynamic: { modelName: 'Veo3', videoBase64: 'base64_dynamic' }
            }
        });
    });

    it('should throw if no validated visual is in the context', async () => {
        await expect(runAgent('video-producer', { context: baseContext, mode: 'auto' })).rejects.toThrow(/No validated visual found in context/);
    });
  });
});
