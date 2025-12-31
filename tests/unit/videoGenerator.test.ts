// tests/unit/videoGenerator.test.ts
import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { GoogleGenAI } from '@google/genai';
import { generateVideo } from '../../services/videoGenerator';

// Mock SDK
const mockGenerateVideos = vi.fn();
const mockGetVideosOperation = vi.fn();
vi.mock('@google/genai', async () => {
  const mockModels = { generateVideos: mockGenerateVideos };
  const mockOperations = { getVideosOperation: mockGetVideosOperation };
  const mockGoogleGenAI = vi.fn(() => ({
    models: mockModels,
    operations: mockOperations
  }));
  return { GoogleGenAI: mockGoogleGenAI };
});

// Mock fetch
const mockFetch = vi.fn();
// FIX: Replaced direct assignment to `global.fetch` with `vi.stubGlobal` for environment-agnostic mocking.
vi.stubGlobal('fetch', mockFetch);

// Mock FileReader
const mockFileReader = {
  readAsDataURL: vi.fn(function(this: any) { this.onloadend(); }),
  result: 'data:video/mp4;base64,dGVzdF92aWRlbyA=',
  onloadend: vi.fn(),
  onerror: vi.fn(),
};
vi.stubGlobal('FileReader', vi.fn(() => mockFileReader));


describe('videoGenerator', () => {
  const originalApiKey = process.env.API_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.API_KEY = 'test-key';
  });

  afterAll(() => {
    process.env.API_KEY = originalApiKey;
    vi.unstubAllGlobals();
  });

  it('should generate a video, poll, download, and return base64', async () => {
    const prompt = 'un chat qui fait du skate';
    const mockOperationInitial = { done: false, name: 'op-123' };
    const mockOperationDone = { 
      done: true, 
      name: 'op-123', 
      response: { generatedVideos: [{ video: { uri: 'https://example.com/video.mp4' } }] }
    };
    
    mockGenerateVideos.mockResolvedValue(mockOperationInitial);
    mockGetVideosOperation.mockResolvedValue(mockOperationDone);
    mockFetch.mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(['test video data']))
    });

    const result = await generateVideo(prompt);

    expect(result).toBe('dGVzdF92aWRlbyA=');
    expect(mockGenerateVideos).toHaveBeenCalledWith({
      model: 'veo-2.0-generate-001',
      prompt,
      config: { numberOfVideos: 1 }
    });
    expect(mockGetVideosOperation).toHaveBeenCalledWith({ operation: mockOperationInitial });
    expect(mockFetch).toHaveBeenCalledWith('https://example.com/video.mp4&key=test-key');
  });

  it('should include image data in the generation payload if provided', async () => {
    const image = { imageBytes: 'img_base64', mimeType: 'image/png' };
    mockGenerateVideos.mockResolvedValue({ 
      done: true, 
      response: { generatedVideos: [{ video: { uri: 'https://example.com/video.mp4' } }] }
    });
    mockFetch.mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(new Blob(['test video data']))
    });

    await generateVideo('animate this image', image);
    
    expect(mockGenerateVideos).toHaveBeenCalledWith(expect.objectContaining({ image }));
  });

  it('should throw an error if API_KEY is not configured', async () => {
    process.env.API_KEY = '';
    const { generateVideo: generateVideoNoKey } = await import('../../services/videoGenerator?t=' + Date.now());
    await expect(generateVideoNoKey('test')).rejects.toThrow('Cannot generate video: API_KEY is not configured.');
  });
  
  it('should throw an error if no download link is provided', async () => {
    mockGenerateVideos.mockResolvedValue({ done: true, response: { generatedVideos: [] } }); // No video in response
    await expect(generateVideo('test')).rejects.toThrow('Video generation completed, but no download link was provided.');
  });

  it('should throw an error if fetch fails', async () => {
    mockGenerateVideos.mockResolvedValue({ 
      done: true, 
      response: { generatedVideos: [{ video: { uri: 'https://example.com/video.mp4' } }] }
    });
    mockFetch.mockResolvedValue({ ok: false, status: 500 });
    await expect(generateVideo('test')).rejects.toThrow('Failed to download video file. Status: 500');
  });
});