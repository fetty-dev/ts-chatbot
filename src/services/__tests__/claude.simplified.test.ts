import { generateClaudeResponse, testClaudeConnection } from '../claude';
import { createMockUserMemory } from '../../__tests__/factories';
import { setupTestEnv, cleanupTestEnv } from '../../__tests__/helpers';

// Mock the entire Anthropic module
jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({
        content: [{
          type: 'text',
          text: 'Mocked Claude response for testing.'
        }],
        usage: {
          input_tokens: 100,
          output_tokens: 50
        }
      })
    }
  }));
});

// Mock the tokenOptimizer
jest.mock('../tokenOptimizer', () => ({
  optimizeMemoryContext: jest.fn().mockReturnValue('Optimized context for testing'),
  calculateTokenAnalytics: jest.fn().mockReturnValue({
    inputTokens: 100,
    outputTokens: 50,
    totalTokens: 150,
    estimatedCost: 0.001,
    contextReduction: 0.3,
    qualityScore: 0.95,
    optimizationLevel: 'balanced'
  }),
  getOptimizedClaudeConfig: jest.fn().mockReturnValue({
    model: 'claude-sonnet-4-20250514',
    maxTokens: 300,
    temperature: 0.7
  })
}));

// Mock the personality service
jest.mock('../personality', () => ({
  buildAlbedoContext: jest.fn().mockReturnValue('Personality context for testing')
}));

describe('ClaudeService - Core Functionality', () => {
  beforeEach(() => {
    setupTestEnv();
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanupTestEnv();
  });

  describe('generateClaudeResponse', () => {
    test('generates response with optimization enabled', async () => {
      const userMemory = createMockUserMemory();
      const result = await generateClaudeResponse('Test message', userMemory, true);

      expect(result.response).toBe('Mocked Claude response for testing.');
      expect(result.tokens).toBe(150);
      expect(result.analytics).toBeDefined();
      expect(result.analytics?.contextReduction).toBe(0.3);
    });

    test('generates response without optimization', async () => {
      const result = await generateClaudeResponse('Simple test', undefined, false);

      expect(result.response).toBe('Mocked Claude response for testing.');
      expect(result.tokens).toBeDefined();
      expect(result.analytics).toBeUndefined();
    });

    test('handles API errors gracefully', async () => {
      // Mock API failure
      const Anthropic = require('@anthropic-ai/sdk');
      const mockInstance = new Anthropic();
      mockInstance.messages.create.mockRejectedValueOnce(new Error('API Error'));

      await expect(generateClaudeResponse('test')).rejects.toThrow('Failed to generate Claude response');
    });
  });

  describe('testClaudeConnection', () => {
    test('returns true for successful connection', async () => {
      const result = await testClaudeConnection();
      expect(result).toBe(true);
    });

    test('returns false for failed connection', async () => {
      // Mock connection failure
      const Anthropic = require('@anthropic-ai/sdk');
      const mockInstance = new Anthropic();
      mockInstance.messages.create.mockRejectedValueOnce(new Error('Connection failed'));

      const result = await testClaudeConnection();
      expect(result).toBe(false);
    });
  });
});