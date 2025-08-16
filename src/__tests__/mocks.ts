/**
 * Mock Anthropic SDK responses
 */
export const mockClaudeResponse = {
  content: [{
    type: 'text' as const,
    text: 'This is a mocked Claude response for testing purposes.'
  }],
  usage: {
    input_tokens: 100,
    output_tokens: 50
  }
};

/**
 * Mock Claude API for testing
 */
export const mockClaudeAPI = jest.fn().mockImplementation(() => ({
  messages: {
    create: jest.fn().mockResolvedValue(mockClaudeResponse)
  }
}));

/**
 * Mock MongoDB/Mongoose operations
 */
export function mockMongoose() {
  const mockDoc = {
    save: jest.fn().mockResolvedValue({}),
    toObject: jest.fn().mockReturnValue({}),
    updateOne: jest.fn().mockResolvedValue({ matchedCount: 1 })
  };

  return {
    findOne: jest.fn().mockResolvedValue(mockDoc),
    findOneAndUpdate: jest.fn().mockResolvedValue(mockDoc),
    create: jest.fn().mockResolvedValue(mockDoc),
    deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 })
  };
}

/**
 * Performance testing utilities
 */
export class PerformanceTimer {
  private startTime: number = 0;

  start(): void {
    this.startTime = performance.now();
  }

  end(): number {
    return performance.now() - this.startTime;
  }
}