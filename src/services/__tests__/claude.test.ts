import { createMockUserMemory } from '../../__tests__/factories';
import { setupTestEnv, cleanupTestEnv } from '../../__tests__/helpers';

const mockClaudeResponse = {
  content: [{
    type: 'text' as const,
    text: 'This is a mocked Claude response for testing purposes.'
  }],
  usage: {
    input_tokens: 100,
    output_tokens: 50
  }
};

const mockClaudeClient = {
  messages: {
    create: jest.fn().mockResolvedValue(mockClaudeResponse)
  }
};

// Mock the Anthropic SDK
jest.mock('@anthropic-ai/sdk', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => mockClaudeClient)
  };
});

// Mock the optimization services
jest.mock('../tokenOptimizer', () => ({
  optimizeMemoryContext: jest.fn().mockReturnValue('Optimized memory context with reduced token usage'),
  calculateTokenAnalytics: jest.fn().mockReturnValue({
    inputTokens: 100,
    outputTokens: 50,
    totalTokens: 150,
    estimatedCost: 0.001,
    contextReduction: 0.3,
    qualityScore: 0.95
  }),
  getOptimizedClaudeConfig: jest.fn().mockReturnValue({
    model: 'claude-sonnet-4-20250514',
    maxTokens: 300,
    temperature: 0.7
  })
}));

// Mock the personality service
jest.mock('../personality', () => ({
  buildAlbedoContext: jest.fn().mockImplementation((userMemory, optimized) => {
    if (optimized) {
      return 'Optimized Albedo personality context';
    }
    return 'Standard Albedo personality context with full details';
  })
}));

// Mock the logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

import { generateClaudeResponse, testClaudeConnection } from '../claude';

describe('ClaudeService', () => {
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
      const userMessage = 'Hello, can you help me with programming?';

      const result = await generateClaudeResponse(userMessage, userMemory, true);

      expect(result.response).toBe(mockClaudeResponse.content[0].text);
      expect(result.tokens).toBe(150); // From mocked analytics
      expect(result.analytics).toBeDefined();
      expect(result.analytics.contextReduction).toBe(0.3);
      expect(result.analytics.qualityScore).toBe(0.95);
    });

    test('generates response without optimization', async () => {
      const userMessage = 'Simple question without memory';

      const result = await generateClaudeResponse(userMessage, undefined, false);

      expect(result.response).toBe(mockClaudeResponse.content[0].text);
      expect(result.tokens).toBeDefined();
      expect(result.analytics).toBeUndefined();
    });

    test('uses optimized configuration when optimization enabled', async () => {
      const userMemory = createMockUserMemory();
      const { getOptimizedClaudeConfig } = require('../tokenOptimizer');

      await generateClaudeResponse('test message', userMemory, true);

      expect(getOptimizedClaudeConfig).toHaveBeenCalled();
      expect(mockClaudeClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 300,
          temperature: 0.7
        })
      );
    });

    test('uses standard configuration when optimization disabled', async () => {
      const userMemory = createMockUserMemory();

      await generateClaudeResponse('test message', userMemory, false);

      expect(mockClaudeClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          temperature: 0.7
        })
      );
    });

    test('builds correct context for optimized requests', async () => {
      const userMemory = createMockUserMemory();
      const userMessage = 'How can I improve my coding skills?';
      const { buildAlbedoContext } = require('../personality');
      const { optimizeMemoryContext } = require('../tokenOptimizer');

      await generateClaudeResponse(userMessage, userMemory, true);

      expect(buildAlbedoContext).toHaveBeenCalledWith(userMemory, true);
      expect(optimizeMemoryContext).toHaveBeenCalledWith(userMemory, userMessage);
    });

    test('builds correct context for standard requests', async () => {
      const userMemory = createMockUserMemory();
      const userMessage = 'Tell me about TypeScript';
      const { buildAlbedoContext } = require('../personality');

      await generateClaudeResponse(userMessage, userMemory, false);

      expect(buildAlbedoContext).toHaveBeenCalledWith(userMemory, false);
    });

    test('handles API errors gracefully', async () => {
      mockClaudeClient.messages.create.mockRejectedValue(new Error('API rate limit exceeded'));

      await expect(generateClaudeResponse('test message')).rejects.toThrow('Failed to generate Claude response: API rate limit exceeded');
    });

    test('handles network timeout errors', async () => {
      mockClaudeClient.messages.create.mockRejectedValue(new Error('Request timeout'));

      await expect(generateClaudeResponse('test message')).rejects.toThrow('Failed to generate Claude response: Request timeout');
    });

    test('validates response format from Claude API', async () => {
      mockClaudeClient.messages.create.mockResolvedValue({
        content: [{ type: 'image', source: { type: 'base64', data: 'invalid' } }],
        usage: { input_tokens: 50, output_tokens: 25 }
      });

      await expect(generateClaudeResponse('test message')).rejects.toThrow('Unexpected response type from Claude API');
    });

    test('handles empty response content', async () => {
      mockClaudeClient.messages.create.mockResolvedValue({
        content: [],
        usage: { input_tokens: 50, output_tokens: 0 }
      });

      await expect(generateClaudeResponse('test message')).rejects.toThrow();
    });

    test('logs optimization analytics when enabled', async () => {
      const userMemory = createMockUserMemory();
      const { logger } = require('../../utils/logger');

      await generateClaudeResponse('test message', userMemory, true);

      expect(logger.info).toHaveBeenCalledWith(
        'Optimized Claude response generated',
        expect.objectContaining({
          inputTokens: 100,
          outputTokens: 50,
          totalTokens: 150,
          estimatedCost: 0.001,
          contextReduction: 30, // Rounded percentage
          qualityScore: 95, // Rounded percentage
          operation: 'claude_optimized_response'
        })
      );
    });

    test('handles undefined user memory gracefully', async () => {
      const userMessage = 'Hello without any user context';

      const result = await generateClaudeResponse(userMessage);

      expect(result.response).toBe(mockClaudeResponse.content[0].text);
      expect(result.tokens).toBeDefined();
    });

    test('processes long user messages correctly', async () => {
      const userMemory = createMockUserMemory();
      const longMessage = 'This is a very long message that might exceed token limits '.repeat(100);

      await generateClaudeResponse(longMessage, userMemory, true);

      expect(mockClaudeClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining(longMessage)
            })
          ])
        })
      );
    });

    test('calculates token analytics correctly', async () => {
      const userMemory = createMockUserMemory();
      const { calculateTokenAnalytics } = require('../tokenOptimizer');

      await generateClaudeResponse('test message', userMemory, true);

      expect(calculateTokenAnalytics).toHaveBeenCalledWith(
        expect.stringContaining('test message'),
        mockClaudeResponse.content[0].text,
        expect.stringContaining('test message')
      );
    });

    test('handles special characters in user messages', async () => {
      const specialMessage = 'Hello! How are you? (test) [brackets] {curly} "quotes" \'apostrophes\'';

      const result = await generateClaudeResponse(specialMessage);

      expect(result.response).toBe(mockClaudeResponse.content[0].text);
    });

    test('handles empty string user messages', async () => {
      const result = await generateClaudeResponse('');

      expect(result.response).toBe(mockClaudeResponse.content[0].text);
    });
  });

  describe('testClaudeConnection', () => {
    test('returns true for successful connection', async () => {
      const result = await testClaudeConnection();

      expect(result).toBe(true);
    });

    test('returns false for failed connection', async () => {
      mockClaudeClient.messages.create.mockRejectedValue(new Error('Authentication failed'));

      const result = await testClaudeConnection();

      expect(result).toBe(false);
    });

    test('uses minimal token configuration for health check', async () => {
      await testClaudeConnection();

      expect(mockClaudeClient.messages.create).toHaveBeenCalledWith({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hello' }]
      });
    });

    test('handles authentication errors gracefully', async () => {
      mockClaudeClient.messages.create.mockRejectedValue(new Error('Invalid API key'));

      const result = await testClaudeConnection();

      expect(result).toBe(false);
    });

    test('handles network errors gracefully', async () => {
      mockClaudeClient.messages.create.mockRejectedValue(new Error('ENOTFOUND'));

      const result = await testClaudeConnection();

      expect(result).toBe(false);
    });

    test('handles service unavailable errors', async () => {
      mockClaudeClient.messages.create.mockRejectedValue(new Error('503 Service Unavailable'));

      const result = await testClaudeConnection();

      expect(result).toBe(false);
    });

    test('validates API response structure', async () => {
      mockClaudeClient.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: 'Hello!' }]
      });

      const result = await testClaudeConnection();

      expect(result).toBe(true);
    });
  });

  describe('integration with other services', () => {
    test('integrates correctly with personality service', async () => {
      const userMemory = createMockUserMemory({
        relationshipLevel: 85,
        personalDetails: ['Loves TypeScript', 'Works as software engineer']
      });
      const { buildAlbedoContext } = require('../personality');

      await generateClaudeResponse('Tell me about coding', userMemory, false);

      expect(buildAlbedoContext).toHaveBeenCalledWith(userMemory, false);
    });

    test('integrates correctly with token optimizer', async () => {
      const userMemory = createMockUserMemory();
      const { optimizeMemoryContext, calculateTokenAnalytics } = require('../tokenOptimizer');

      await generateClaudeResponse('Complex query', userMemory, true);

      expect(optimizeMemoryContext).toHaveBeenCalledWith(userMemory, 'Complex query');
      expect(calculateTokenAnalytics).toHaveBeenCalled();
    });

    test('preserves user memory data integrity', async () => {
      const originalMemory = createMockUserMemory();
      const memoryCopy = { ...originalMemory };

      await generateClaudeResponse('Test message', originalMemory, true);

      // Memory should not be mutated by Claude service
      expect(originalMemory).toEqual(memoryCopy);
    });
  });
});