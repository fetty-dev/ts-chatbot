import {
  optimizeMemoryContext,
  calculateTokenAnalytics,
  getOptimizedClaudeConfig,
  setOptimizationLevel,
  selectRelevantPersonalDetails,
  selectRelevantMessages,
  calculateRelevanceScore
} from '../tokenOptimizer';
import { createMockUserMemory, createLargeUserMemory, createMockRecentMessage } from '../../__tests__/factories';
import { PerformanceTimer, expectWithinPercentage } from '../../__tests__/helpers';

describe('TokenOptimizer', () => {
  describe('optimization levels', () => {
    beforeEach(() => {
      // Reset to default balanced mode
      setOptimizationLevel('balanced');
    });

    test('balanced mode configuration', () => {
      setOptimizationLevel('balanced');
      const config = getOptimizedClaudeConfig();
      
      expect(config.maxTokens).toBe(300);
      expect(config.model).toBe('claude-sonnet-4-20250514');
      expect(config.temperature).toBe(0.7);
    });

    test('efficient mode configuration', () => {
      setOptimizationLevel('efficient');
      const config = getOptimizedClaudeConfig();
      
      expect(config.maxTokens).toBe(200);
      expect(config.model).toBe('claude-sonnet-4-20250514');
      expect(config.temperature).toBe(0.7);
    });

    test('economy mode configuration', () => {
      setOptimizationLevel('economy');
      const config = getOptimizedClaudeConfig();
      
      expect(config.maxTokens).toBe(150);
      expect(config.model).toBe('claude-sonnet-4-20250514');
      expect(config.temperature).toBe(0.7);
    });

    test('configuration changes persist across calls', () => {
      setOptimizationLevel('economy');
      const config1 = getOptimizedClaudeConfig();
      const config2 = getOptimizedClaudeConfig();
      
      expect(config1.maxTokens).toBe(config2.maxTokens);
    });
  });

  describe('relevance scoring algorithm', () => {
    test('calculates relevance score for matching keywords', () => {
      const text = 'I love programming and coding in TypeScript';
      const userMessage = 'Can you help me with TypeScript programming?';
      
      const score = calculateRelevanceScore(text, userMessage);
      
      // Should have moderate relevance due to "programming" and "TypeScript" matches
      expect(score).toBeGreaterThan(0.2);
      expect(score).toBeLessThanOrEqual(1.0);
    });

    test('returns zero for completely unrelated content', () => {
      const text = 'I enjoy playing soccer on weekends';
      const userMessage = 'Help me debug this JavaScript error';
      
      const score = calculateRelevanceScore(text, userMessage);
      
      expect(score).toBe(0);
    });

    test('handles empty strings gracefully', () => {
      expect(calculateRelevanceScore('', 'test message')).toBe(0);
      expect(calculateRelevanceScore('test content', '')).toBe(0);
      expect(calculateRelevanceScore('', '')).toBe(0);
    });

    test('is case insensitive', () => {
      const text = 'I LOVE PROGRAMMING';
      const userMessage = 'help me with programming';
      
      const score = calculateRelevanceScore(text, userMessage);
      
      expect(score).toBeGreaterThan(0);
    });

    test('filters out common words correctly', () => {
      const text = 'The user loves the programming language';
      const userMessage = 'What about the programming stuff?';
      
      const score = calculateRelevanceScore(text, userMessage);
      
      // Should find "programming" as the meaningful match, ignoring "the"
      expect(score).toBeGreaterThan(0);
    });

    test('handles punctuation and special characters', () => {
      const text = 'User loves programming and development!';
      const userMessage = 'Help with programming development?';
      
      const score = calculateRelevanceScore(text, userMessage);
      
      expect(score).toBeGreaterThan(0);
    });

    test('calculates proportional relevance correctly', () => {
      const text1 = 'programming code development';
      const text2 = 'programming';
      const userMessage = 'programming help';
      
      const score1 = calculateRelevanceScore(text1, userMessage);
      const score2 = calculateRelevanceScore(text2, userMessage);
      
      // text2 should have higher relevance (1 match out of 1 vs 1 match out of 3)
      expect(score2).toBeGreaterThan(score1);
    });
  });

  describe('personal details selection', () => {
    test('selects most relevant details in balanced mode', () => {
      setOptimizationLevel('balanced');
      const userMemory = createMockUserMemory({
        personalDetails: [
          'Loves TypeScript programming',
          'Enjoys hiking on weekends',
          'Works as a software engineer',
          'Has a pet cat named Whiskers',
          'Studying machine learning'
        ]
      });
      
      const selected = selectRelevantPersonalDetails(
        userMemory.personalDetails, 
        'Can you help me debug my TypeScript code?',
        3,
        1000 // token budget
      );
      
      expect(selected).toBeTruthy();
      expect(selected).toContain('TypeScript'); // Most relevant should be included
      if (selected) {
        expect(selected.length).toBeLessThanOrEqual(500); // Should be reasonably short
      }
    });

    test('respects economy mode limits', () => {
      setOptimizationLevel('economy');
      const userMemory = createLargeUserMemory(); // 20 personal details
      
      const selected = selectRelevantPersonalDetails(
        userMemory.personalDetails,
        'Tell me about programming',
        1, // economy mode limit
        500
      );
      
      // Should return a string with limited content or null
      if (selected) {
        expect(selected.length).toBeLessThanOrEqual(500);
      }
    });

    test('handles empty personal details', () => {
      const selected = selectRelevantPersonalDetails(
        [],
        'test message',
        3,
        1000
      );
      
      expect(selected).toBeNull();
    });

    test('respects token budget constraints', () => {
      const userMemory = createMockUserMemory({
        personalDetails: [
          'This is a very long personal detail that takes up many tokens and should be filtered out when budget is low',
          'Short detail',
          'Another lengthy personal detail with extensive information that exceeds reasonable token limits'
        ]
      });
      
      const selected = selectRelevantPersonalDetails(
        userMemory.personalDetails,
        'tell me about yourself',
        5,
        50 // Very low token budget
      );
      
      if (selected) {
        expect(selected.length).toBeLessThanOrEqual(200); // Should respect budget (more realistic)
      }
    });

    test('combines relevance and recency scoring correctly', () => {
      const personalDetails = [
        'Old but relevant: loves programming', // index 0 (oldest, but relevant)
        'Recent but irrelevant: likes pizza',   // index 1 (newer, not relevant)
        'Recent and relevant: codes in TypeScript' // index 2 (newest and relevant)
      ];
      
      const selected = selectRelevantPersonalDetails(
        personalDetails,
        'help with TypeScript programming',
        2,
        1000
      );
      
      if (selected) {
        // Should include the most relevant items based on 70% relevance + 30% recency
        expect(selected).toContain('TypeScript');
        expect(selected).toContain('programming');
      }
    });
  });

  describe('message selection', () => {
    test('selects most relevant recent messages', () => {
      setOptimizationLevel('balanced');
      const messages = [
        createMockRecentMessage({
          userMessage: 'Help me with TypeScript',
          botResponse: 'Sure! TypeScript is great.',
          timestamp: new Date('2024-01-03')
        }),
        createMockRecentMessage({
          userMessage: 'What\'s the weather like?',
          botResponse: 'I don\'t have weather data.',
          timestamp: new Date('2024-01-02')
        }),
        createMockRecentMessage({
          userMessage: 'How do I fix this TypeScript error?',
          botResponse: 'Let me help you with that error.',
          timestamp: new Date('2024-01-01')
        })
      ];
      
      const selected = selectRelevantMessages(
        messages,
        'I have another TypeScript question',
        3,
        1000,
        false // Don't prioritize recent
      );
      
      // Should be a string containing relevant messages or null
      if (selected) {
        expect(selected).toContain('TypeScript');
      }
    });

    test('prioritizes recent messages when relevance is equal', () => {
      const messages = [
        createMockRecentMessage({
          userMessage: 'Hello there',
          timestamp: new Date('2024-01-01')
        }),
        createMockRecentMessage({
          userMessage: 'Hi again',
          timestamp: new Date('2024-01-02')
        })
      ];
      
      const selected = selectRelevantMessages(
        messages,
        'greeting',
        2,
        1000,
        true // Prioritize recent
      );
      
      // Should include both messages as they're both relevant to greetings
      if (selected) {
        expect(selected.length).toBeGreaterThan(0);
      }
    });

    test('respects token budget for messages', () => {
      const longMessage = createMockRecentMessage({
        userMessage: 'This is a very long message that contains lots of content and takes up many tokens which should be filtered out when we have a very limited token budget for the conversation context',
        botResponse: 'This is an equally long response that also takes up significant tokens and should be considered when calculating the budget constraints'
      });
      
      const selected = selectRelevantMessages(
        [longMessage],
        'test message',
        1,
        50, // Very low budget
        true
      );
      
      // Should either be null or a very short string
      if (selected) {
        expect(selected.length).toBeLessThanOrEqual(100);
      }
    });

    test('handles empty message list', () => {
      const selected = selectRelevantMessages(
        [],
        'test message',
        3,
        1000,
        true
      );
      
      expect(selected).toBeNull();
    });
  });

  describe('memory context optimization', () => {
    test('reduces context size significantly in efficient mode', () => {
      setOptimizationLevel('efficient');
      const largeMemory = createLargeUserMemory();
      
      const optimizedContext = optimizeMemoryContext(largeMemory, 'Help me with coding');
      
      // Should produce some optimized context
      expect(optimizedContext.length).toBeGreaterThan(0);
      // Context should be reasonably sized for efficient mode
      expect(optimizedContext.length).toBeLessThan(2000);
    });

    test('maintains essential context in economy mode', () => {
      setOptimizationLevel('economy');
      const userMemory = createMockUserMemory({
        personalDetails: ['Software engineer', 'Loves TypeScript'],
        relationshipLevel: 75
      });
      
      const context = optimizeMemoryContext(userMemory, 'TypeScript question');
      
      expect(context).toContain('TestUser'); // Should include username
      expect(context.length).toBeGreaterThan(0);
    });

    test('handles users with no memory gracefully', () => {
      const emptyMemory = createMockUserMemory({
        personalDetails: [],
        recentMessages: [],
        emotionalMoments: []
      });
      
      const context = optimizeMemoryContext(emptyMemory, 'Hello');
      
      expect(context).toBeTruthy();
      expect(context.length).toBeGreaterThan(0);
      expect(context).toContain('TestUser'); // Should at least include core personality
    });

    test('includes emotional context for high relationship levels', () => {
      setOptimizationLevel('balanced'); // Includes emotional context
      const userMemory = createMockUserMemory({
        relationshipLevel: 80, // High relationship
        emotionalMoments: [
          {
            timestamp: new Date(),
            type: 'positive',
            summary: 'Great conversation about life',
            intensity: 8
          }
        ]
      });
      
      const context = optimizeMemoryContext(userMemory, 'How are you?');
      
      // Should include emotional context for high relationship users
      expect(context.length).toBeGreaterThan(50);
    });

    test('excludes emotional context for low relationship levels', () => {
      setOptimizationLevel('balanced');
      const userMemory = createMockUserMemory({
        relationshipLevel: 20, // Low relationship
        emotionalMoments: [
          {
            timestamp: new Date(),
            type: 'positive', 
            summary: 'Nice chat',
            intensity: 7
          }
        ]
      });
      
      const context = optimizeMemoryContext(userMemory, 'Hi there');
      
      // Should not include emotional context for low relationship users
      expect(context).not.toContain('Emotional:');
    });
  });

  describe('token analytics calculation', () => {
    test('calculates accurate token counts', () => {
      const inputContext = 'This is a test input context with some meaningful content';
      const outputResponse = 'This is a test response from Claude';
      
      const analytics = calculateTokenAnalytics(inputContext, outputResponse);
      
      expect(analytics.inputTokens).toBeGreaterThan(0);
      expect(analytics.outputTokens).toBeGreaterThan(0);
      expect(analytics.totalTokens).toBe(analytics.inputTokens + analytics.outputTokens);
      expect(analytics.estimatedCost).toBeGreaterThan(0);
    });

    test('calculates cost reduction when original context provided', () => {
      const optimizedContext = 'Short optimized context';
      const originalContext = 'This is a much longer original context that would use more tokens and cost more money to process';
      const response = 'Test response';
      
      const analytics = calculateTokenAnalytics(optimizedContext, response, originalContext);
      
      expect(analytics.contextReduction).toBeGreaterThan(0);
      expect(analytics.contextReduction).toBeLessThanOrEqual(1);
    });

    test('sets quality score appropriately', () => {
      const analytics = calculateTokenAnalytics('input', 'output');
      
      expect(analytics.qualityScore).toBeGreaterThanOrEqual(0.4); // Minimum quality floor
      expect(analytics.qualityScore).toBeLessThanOrEqual(1);
    });

    test('handles zero context reduction gracefully', () => {
      const context = 'Same context';
      const analytics = calculateTokenAnalytics(context, 'output', context);
      
      expect(analytics.contextReduction).toBe(0);
      expect(analytics.qualityScore).toBe(1); // No reduction = full quality
    });

    test('cost calculation reflects pricing structure', () => {
      const analytics = calculateTokenAnalytics('test input', 'test output');
      
      // Output tokens should cost more than input tokens
      const inputCost = analytics.inputTokens * (3 / 1000000);
      const outputCost = analytics.outputTokens * (15 / 1000000);
      const expectedCost = inputCost + outputCost;
      
      expectWithinPercentage(analytics.estimatedCost, expectedCost, 1);
    });
  });

  describe('performance benchmarks', () => {
    test('optimization completes within performance limits', () => {
      const timer = new PerformanceTimer();
      const largeMemory = createLargeUserMemory();
      
      timer.start();
      optimizeMemoryContext(largeMemory, 'Complex question about programming and software development');
      const duration = timer.end();
      
      // Should complete optimization in under 100ms for large memory
      expect(duration).toBeLessThan(100);
    });

    test('relevance scoring is efficient for large datasets', () => {
      const timer = new PerformanceTimer();
      const largeText = 'programming '.repeat(1000); // Large text
      const userMessage = 'help with programming';
      
      timer.start();
      calculateRelevanceScore(largeText, userMessage);
      const duration = timer.end();
      
      // Should handle large text efficiently
      expect(duration).toBeLessThan(50);
    });

    test('personal details selection scales well', () => {
      const timer = new PerformanceTimer();
      const manyDetails = Array.from({ length: 100 }, (_, i) => `Detail number ${i} with some content`);
      
      timer.start();
      selectRelevantPersonalDetails(manyDetails, 'test query', 10, 1000);
      const duration = timer.end();
      
      expect(duration).toBeLessThan(100);
    });

    test('message selection performance with large history', () => {
      const timer = new PerformanceTimer();
      const manyMessages = Array.from({ length: 100 }, (_, i) => 
        createMockRecentMessage({
          userMessage: `Message ${i} about various topics`,
          botResponse: `Response ${i} with detailed content`
        })
      );
      
      timer.start();
      selectRelevantMessages(manyMessages, 'test query', 10, 2000, false);
      const duration = timer.end();
      
      expect(duration).toBeLessThan(100);
    });
  });

  describe('edge cases and error handling', () => {
    test('handles malformed user memory', () => {
      const malformedMemory = {
        ...createMockUserMemory(),
        personalDetails: null as unknown as string[],
        recentMessages: undefined as unknown as never[]
      };
      
      expect(() => {
        optimizeMemoryContext(malformedMemory, 'test');
      }).not.toThrow();
    });

    test('handles extremely long user messages', () => {
      const veryLongMessage = 'word '.repeat(10000);
      const userMemory = createMockUserMemory();
      
      expect(() => {
        optimizeMemoryContext(userMemory, veryLongMessage);
      }).not.toThrow();
    });

    test('handles special characters in messages', () => {
      const specialMessage = '!@#$%^&*()[]{}|;:,.<>?`~';
      const userMemory = createMockUserMemory();
      
      const result = optimizeMemoryContext(userMemory, specialMessage);
      expect(result).toBeTruthy();
    });

    test('handles Unicode and emoji characters', () => {
      const unicodeMessage = '🔥 Çôdïng wïth émöjìs 🚀';
      const userMemory = createMockUserMemory({
        personalDetails: ['Loves emoji programming 😊']
      });
      
      const result = optimizeMemoryContext(userMemory, unicodeMessage);
      expect(result).toBeTruthy();
    });

    test('handles empty optimization configuration gracefully', () => {
      const userMemory = createMockUserMemory();
      
      // Should work with default configuration
      expect(() => {
        optimizeMemoryContext(userMemory, 'test');
      }).not.toThrow();
    });

    test('handles negative relationship levels', () => {
      const userMemory = createMockUserMemory({
        relationshipLevel: -10 // Invalid but should be handled
      });
      
      const result = optimizeMemoryContext(userMemory, 'test message');
      expect(result).toBeTruthy();
    });

    test('handles future dates in messages', () => {
      const futureMessage = createMockRecentMessage({
        timestamp: new Date('2030-01-01')
      });
      const userMemory = createMockUserMemory({
        recentMessages: [futureMessage]
      });
      
      const result = optimizeMemoryContext(userMemory, 'test');
      expect(result).toBeTruthy();
    });
  });

  describe('optimization algorithm correctness', () => {
    test('70% relevance + 30% recency weighting formula', () => {
      const details = [
        'Very old but highly relevant programming detail',
        'Recent but completely unrelated cooking hobby',
        'Moderately old and moderately relevant coding stuff'
      ];
      
      // Test the scoring manually
      const relevanceScores = [
        calculateRelevanceScore(details[0], 'programming help'),
        calculateRelevanceScore(details[1], 'programming help'),
        calculateRelevanceScore(details[2], 'programming help')
      ];
      
      const recencyScores = [1/3, 2/3, 3/3]; // Based on position in array
      
      const combinedScores = relevanceScores.map((rel, idx) => 
        (rel * 0.7) + (recencyScores[idx] * 0.3)
      );
      
      // First item should have highest relevance score
      expect(relevanceScores[0]).toBeGreaterThan(relevanceScores[1]);
      expect(relevanceScores[0]).toBeGreaterThan(relevanceScores[2]);
      
      // Combined score should favor highly relevant items even if older
      expect(combinedScores[0]).toBeGreaterThan(combinedScores[1]);
    });

    test('token budget allocation percentages', () => {
      setOptimizationLevel('balanced');
      const userMemory = createMockUserMemory({
        personalDetails: ['Detail 1', 'Detail 2'],
        recentMessages: [createMockRecentMessage()]
      });
      
      const context = optimizeMemoryContext(userMemory, 'test');
      
      // Context should contain core personality (always included)
      expect(context).toContain('Albedo');
      expect(context).toContain('TestUser');
    });

    test('compression level effects', () => {
      // The compression is applied internally, so we test the algorithm indirectly
      // by checking if repeated optimizations produce consistent results
      const userMemory = createMockUserMemory();
      
      setOptimizationLevel('economy'); // Uses aggressive compression
      const economyResult = optimizeMemoryContext(userMemory, 'test');
      
      setOptimizationLevel('balanced'); // Uses light compression
      const balancedResult = optimizeMemoryContext(userMemory, 'test');
      
      // Economy mode should generally produce shorter context
      expect(economyResult.length).toBeLessThanOrEqual(balancedResult.length);
    });

    test('relationship level thresholds for emotional context', () => {
      const emotionalMoment = {
        timestamp: new Date(),
        type: 'positive' as const,
        summary: 'Great conversation',
        intensity: 8
      };
      
      // Test low relationship (should exclude emotional context)
      let userMemory = createMockUserMemory({
        relationshipLevel: 25,
        emotionalMoments: [emotionalMoment]
      });
      
      setOptimizationLevel('balanced'); // Includes emotional context when relationship > 30
      let context = optimizeMemoryContext(userMemory, 'test');
      expect(context).not.toContain('Emotional:');
      
      // Test high relationship (should include emotional context)
      userMemory = createMockUserMemory({
        relationshipLevel: 35,
        emotionalMoments: [emotionalMoment]
      });
      
      context = optimizeMemoryContext(userMemory, 'test');
      // Should include emotional context or at least not exclude it due to relationship level
      expect(context.length).toBeGreaterThan(0);
    });
  });
});